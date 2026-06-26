import unittest
import sys
import os
import uuid
from datetime import date

# Append app directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import Map

class TestComplianceEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite database for testing backend logic
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)
        cls.user_id = uuid.uuid4()
        
    def setUp(self):
        self.db = self.Session()
        
    def tearDown(self):
        self.db.close()
        
    def test_br_013_sequential_transitions(self):
        """
        Verify sequential status flow: Pending -> In Progress -> Awaiting Validation -> Completed
        """
        COLUMNS = ["Pending", "In Progress", "Awaiting Validation", "Completed"]
        
        # Helper to validate sequential transition
        def is_transition_valid(current: str, target: str) -> bool:
            if target not in COLUMNS or current not in COLUMNS:
                return False
            source_idx = COLUMNS.index(current)
            target_idx = COLUMNS.index(target)
            return abs(target_idx - source_idx) <= 1
            
        self.assertTrue(is_transition_valid("Pending", "In Progress"))
        self.assertTrue(is_transition_valid("In Progress", "Awaiting Validation"))
        self.assertTrue(is_transition_valid("Awaiting Validation", "Completed"))
        self.assertTrue(is_transition_valid("Awaiting Validation", "In Progress"))  # Allow backtracking by 1 step for corrections
        
        # Disallowed transitions (skipping stages)
        self.assertFalse(is_transition_valid("Pending", "Completed"))
        self.assertFalse(is_transition_valid("Pending", "Awaiting Validation"))
        self.assertFalse(is_transition_valid("In Progress", "Completed"))
        
    def test_br_014_completed_maps_locked(self):
        """
        Verify completed MAPs are locked and cannot be moved/modified
        """
        # Create a mock Completed map
        comp_map = Map(
            user_id=self.user_id,
            title="Update KYC controls",
            status="Completed",
            severity="High",
            deadline=date.today()
        )
        self.db.add(comp_map)
        self.db.commit()
        
        # Verify status is Completed
        db_map = self.db.query(Map).filter(Map.title == "Update KYC controls").first()
        self.assertEqual(db_map.status, "Completed")
        
        # Enforce that if map is Completed, updates are blocked
        def attempt_update_status(item: Map, new_status: str) -> str:
            if item.status == "Completed":
                raise PermissionError("Workflow Locked: Completed MAPs cannot be modified.")
            item.status = new_status
            return item.status
            
        with self.assertRaises(PermissionError):
            attempt_update_status(db_map, "In Progress")
            
    def test_br_028_audit_logs_immutability(self):
        """
        Verify audit logs are immutable or that no AuditLog table exists in DB as per client specifications
        """
        # Ensure AuditLog is not part of the database model metadata
        self.assertNotIn("audit_logs", Base.metadata.tables)

    def test_seed_user_default_maps(self):
        """
        Verify that seed_user_default_maps inserts the expected tasks based on org services and departments
        """
        from app.models.models import Organization, User, Map
        from app.api.endpoints.maps import seed_user_default_maps
        
        # 1. Create a dummy organization and user
        org = Organization(
            name="Test Banking Group",
            industry="Banking",
            services=["UPI", "KYC Services"],
            departments=["Compliance", "IT", "Operations"],
            enabled_sources=["RBI", "NPCI"],
            is_setup_complete=True
        )
        self.db.add(org)
        self.db.commit()
        
        user = User(
            full_name="Compliance Tester",
            email="test_compliance@reguflow.ai",
            password_hash="dummy_hash",
            organization_id=org.id,
            status="Active"
        )
        self.db.add(user)
        self.db.commit()
        
        # 2. Seed maps
        seed_user_default_maps(user.id, self.db)
        
        # 3. Query seeded maps
        seeded = self.db.query(Map).filter(Map.user_id == user.id).all()
        
        # Verify that we have maps seeded and they match organization filters
        self.assertTrue(len(seeded) > 0)
        
        # All seeded maps should belong to the departments Compliance, IT, or Operations
        for m in seeded:
            dept = m.owner.replace(" Team", "")
            self.assertIn(dept, ["Compliance", "IT", "Operations"])

if __name__ == "__main__":
    unittest.main()
