import unittest
import sys
import os
import uuid
from datetime import date
from unittest.mock import patch, MagicMock

# Append app directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import Regulation
from app.core.scraper import scrape_latest_regulations

class TestRegulationsScraper(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create in-memory SQLite database
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.Session()
        # Clean up database before each test
        self.db.query(Regulation).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    @patch("app.core.scraper.fetch_notifications")
    @patch("app.core.scraper.get_pdf_url")
    @patch("app.core.scraper.download_pdf")
    @patch("app.core.scraper.extract_and_clean_text")
    @patch("app.core.ai_service.LlamaAIService.analyze_scraped_regulation")
    def test_scrape_and_ingestion_flow(
        self,
        mock_analyze_scraped_regulation,
        mock_extract_and_clean_text,
        mock_download_pdf,
        mock_get_pdf_url,
        mock_fetch_notifications
    ):
        # Setup mocks
        mock_fetch_notifications.return_value = [
            {
                "source": "RBI",
                "title": "Master Direction on KYC 2026",
                "notification_url": "https://rbi.org.in/Notification1"
            }
        ]
        mock_get_pdf_url.return_value = "https://rbidocs.rbi.org.in/Notification1.pdf"
        mock_download_pdf.return_value = "/tmp/mock.pdf"
        mock_extract_and_clean_text.return_value = "Mocked PDF circular text content."
        mock_analyze_scraped_regulation.return_value = {
            "date": "2026-06-15",
            "summary": "This is a mocked KYC circular summary.",
            "risk_level": "High",
            "obligations": ["Obligation A", "Obligation B"],
            "suggested_actions": ["Update SOPs", "Audit compliance controls"]
        }

        # Run scraper
        count = scrape_latest_regulations(self.db, limit=1)

        # Assertions
        self.assertEqual(count, 1)
        
        # Verify stored data
        stored = self.db.query(Regulation).first()
        self.assertIsNotNone(stored)
        self.assertEqual(stored.title, "Master Direction on KYC 2026")
        self.assertEqual(stored.source, "RBI")
        self.assertEqual(stored.date, date(2026, 6, 15))
        self.assertEqual(stored.link, "https://rbidocs.rbi.org.in/Notification1.pdf")
        self.assertEqual(stored.summary, "This is a mocked KYC circular summary.")
        self.assertEqual(stored.risk_level, "High")
        
        # Verify list elements stored in JSON columns
        self.assertEqual(stored.obligations, ["Obligation A", "Obligation B"])
        self.assertEqual(stored.suggested_actions, ["Update SOPs", "Audit compliance controls"])
        self.assertEqual(stored.suggestedActions, ["Update SOPs", "Audit compliance controls"])

    @patch("app.core.scraper.fetch_notifications")
    def test_duplicate_regulation_skips(self, mock_fetch_notifications):
        # Insert a pre-existing regulation
        existing_reg = Regulation(
            source="RBI",
            title="Pre-existing Regulation",
            date=date.today(),
            link="https://rbi.org.in/Pre-existing.pdf",
            summary="Existing summary",
            risk_level="Low"
        )
        self.db.add(existing_reg)
        self.db.commit()

        # Mock fetch to return the same title/url
        mock_fetch_notifications.return_value = [
            {
                "source": "RBI",
                "title": "Pre-existing Regulation",
                "notification_url": "https://rbi.org.in/Pre-existing"
            }
        ]

        # Run scraper (should skip duplicate)
        count = scrape_latest_regulations(self.db, limit=1)
        self.assertEqual(count, 0)

if __name__ == "__main__":
    unittest.main()
