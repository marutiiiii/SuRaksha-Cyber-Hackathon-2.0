import os
import shutil
from models.db import init_db, db_get_stats, db_get_tasks, db_get_regulations
from task_generator import generate_tasks_from_regulation
from evidence_analyzer import analyze_evidence

def run_tests():
    print("=== STARTING COMPLIANCE SYSTEM TEST ===")
    
    # 1. Test database initialization
    print("\nTesting database initialization...")
    init_db()
    print("Database initialized successfully.")
    
    # 2. Test fetching stats and task registry
    print("\nTesting default stats fetch...")
    stats = db_get_stats()
    print(f"Stats: {stats}")
    assert stats["total_tasks"] == 0
    assert stats["completed_tasks"] == 0
    
    # 3. Test mock regulation processing without LLM call to ensure structure safety
    # We can test that the model files and logic import correctly
    print("\nTesting model components imports...")
    try:
        import qwen_model
        print("[OK] qwen_model module imported successfully.")
    except Exception as e:
        print(f"[FAIL] Failed to import qwen_model: {e}")
        
    try:
        import regulation_extractor
        print("[OK] regulation_extractor module imported successfully.")
    except Exception as e:
        print(f"[FAIL] Failed to import regulation_extractor: {e}")

    try:
        import evidence_extractor
        print("[OK] evidence_extractor module imported successfully.")
    except Exception as e:
        print(f"[FAIL] Failed to import evidence_extractor: {e}")
        
    try:
        import requirement_matcher
        print("[OK] requirement_matcher module imported successfully.")
    except Exception as e:
        print(f"[FAIL] Failed to import requirement_matcher: {e}")
        
    try:
        import status_engine
        print("[OK] status_engine module imported successfully.")
    except Exception as e:
        print(f"[FAIL] Failed to import status_engine: {e}")

    print("\n=== SYSTEM TEST COMPLETED ===")

if __name__ == "__main__":
    run_tests()
