import os
import sys
import requests
import json
import uuid

# Set up backend folder in Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_workflow():
    print("====================================================")
    print("   ReguFlow E2E AI Compliance Workflow Audit Test   ")
    print("====================================================")

    # 1. Register User & Org
    email = f"audit_{uuid.uuid4().hex[:6]}@safebank.com"
    register_payload = {
        "email": email,
        "password": "Password@123",
        "full_name": "Audit Officer",
        "org_name": "Audit SafeBank India",
        "industry_type": "Banking"
    }
    print(f"\n[Step 1] Registering user: {email} ...")
    res = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    auth_data = res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    org_id = auth_data["user"]["organization_id"]
    print(f"[OK] Registered. User ID: {user_id}, Org ID: {org_id}")

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Copilot-Mode": "expert"
    }

    # 2. Complete Org Setup
    setup_payload = {
        "org_name": "Audit SafeBank India",
        "org_size": "Medium",
        "industry": "Banking",
        "departments": ["Compliance", "IT", "Operations", "Cybersecurity"],
        "services": ["KYC Services", "UPI"],
        "enabled_sources": ["RBI", "NPCI"]
    }
    print("\n[Step 2] Completing organization setup ...")
    res = requests.post(f"{BASE_URL}/auth/org-setup/{user_id}", json=setup_payload, headers=headers)
    assert res.status_code == 200, f"Org setup failed: {res.text}"
    print("[OK] Org setup complete.")

    # 3. Find a test PDF file
    doc_dir = os.path.join(backend_dir, "storage", "documents")
    pdf_files = [f for f in os.listdir(doc_dir) if f.endswith(".pdf")]
    if not pdf_files:
        print("Error: No test PDF files found in storage/documents to perform upload.")
        sys.exit(1)
    
    test_pdf_path = os.path.join(doc_dir, pdf_files[0])
    print(f"\n[Step 3] Using test PDF file: {test_pdf_path}")

    # 4. Upload Old Version Document
    print("Uploading Old Version Document...")
    with open(test_pdf_path, "rb") as f:
        res = requests.post(
            f"{BASE_URL}/documents/upload",
            data={"source": "RBI"},
            files={"file": (f"old_{pdf_files[0]}", f, "application/pdf")},
            headers=headers
        )
    assert res.status_code == 200, f"Old doc upload failed: {res.text}"
    old_doc_id = res.json()["documentId"]
    print(f"[OK] Old Document Uploaded. ID: {old_doc_id}")

    # 5. Upload New Version Document
    print("Uploading New Version Document...")
    with open(test_pdf_path, "rb") as f:
        res = requests.post(
            f"{BASE_URL}/documents/upload",
            data={"source": "RBI"},
            files={"file": (f"new_{pdf_files[0]}", f, "application/pdf")},
            headers=headers
        )
    assert res.status_code == 200, f"New doc upload failed: {res.text}"
    new_doc_id = res.json()["documentId"]
    print(f"[OK] New Document Uploaded. ID: {new_doc_id}")

    # 6. Extract Text & Clauses for Old Version
    print("\n[Step 4] Extracting text and clauses for Old Version...")
    res = requests.post(f"{BASE_URL}/documents/{old_doc_id}/extract-text", headers=headers)
    assert res.status_code == 200, f"Old text extraction failed: {res.text}"
    res = requests.post(f"{BASE_URL}/documents/{old_doc_id}/extract-clauses", headers=headers)
    assert res.status_code == 200, f"Old clause extraction failed: {res.text}"
    old_clauses_count = res.json()["count"]
    print(f"[OK] Old Version processed. Extracted {old_clauses_count} clauses.")

    # 7. Extract Text & Clauses for New Version
    print("Extracting text and clauses for New Version...")
    res = requests.post(f"{BASE_URL}/documents/{new_doc_id}/extract-text", headers=headers)
    assert res.status_code == 200, f"New text extraction failed: {res.text}"
    res = requests.post(f"{BASE_URL}/documents/{new_doc_id}/extract-clauses", headers=headers)
    assert res.status_code == 200, f"New clause extraction failed: {res.text}"
    new_clauses_count = res.json()["count"]
    print(f"[OK] New Version processed. Extracted {new_clauses_count} clauses.")

    # 8. Run Comparison
    compare_payload = {
        "oldDocumentId": old_doc_id,
        "newDocumentId": new_doc_id
    }
    print("\n[Step 5] Running side-by-side comparison ...")
    res = requests.post(f"{BASE_URL}/comparisons", json=compare_payload, headers=headers)
    assert res.status_code == 200, f"Comparison failed: {res.text}"
    comp_data = res.json()
    comparison_id = comp_data["comparisonId"]
    print(f"[OK] Comparison generated. ID: {comparison_id}")
    print(f"  Counts: {json.dumps(comp_data['counts'])}")

    # 9. Generate Impact Analysis
    print("\n[Step 6] Running department impact analysis ...")
    res = requests.post(f"{BASE_URL}/comparisons/{comparison_id}/impact", headers=headers)
    assert res.status_code == 200, f"Impact analysis failed: {res.text}"
    impact_data = res.json()
    print("[OK] Department impact scores generated:")
    for item in impact_data["matrix"]:
        print(f"  - {item['department']}: Impact {item['impact']}%, Risk {item['risk']}, Priority {item['priority']}")

    # 10. Generate MAPs
    print("\n[Step 7] Generating MAP action items ...")
    res = requests.post(f"{BASE_URL}/comparisons/{comparison_id}/generate-maps", headers=headers)
    assert res.status_code == 200, f"MAP generation failed: {res.text}"
    maps_data = res.json()
    print(f"[OK] Seeded {maps_data['count']} MAPs.")
    assert len(maps_data["maps"]) > 0, "No maps were generated"
    test_map = maps_data["maps"][0]
    map_id = test_map["id"]
    print(f"  Sample Mapped Task: [{map_id}] {test_map['title']} (Owner: {test_map['owner']})")

    # 11. Verify Routing & Maps List
    print("\n[Step 8] Verifying department routing list...")
    res = requests.get(f"{BASE_URL}/maps", headers=headers)
    assert res.status_code == 200, f"Get maps failed: {res.text}"
    all_maps = res.json()
    print(f"[OK] Mapped tasks in database: {len(all_maps)}")

    # 12. Test Copilot Chat
    print("\n[Step 9] Testing Copilot RAG Chat ...")
    chat_payload = {
        "message": "Which departments are most impacted by this lending guidelines update and what open maps do we have?"
    }
    res = requests.post(f"{BASE_URL}/copilot/chat", json=chat_payload, headers=headers)
    assert res.status_code == 200, f"Copilot chat failed: {res.text}"
    chat_data = res.json()
    print("[OK] Copilot replied. Sample response slice:")
    print("\n".join(chat_data["answer"].split("\n")[:10]))

    # 13. Test Compliance Drafting
    print("\n[Step 10] Testing policy drafting document ...")
    draft_payload = {
        "type": "sop",
        "comparisonId": comparison_id
    }
    res = requests.post(f"{BASE_URL}/copilot/generate-document", json=draft_payload, headers=headers)
    assert res.status_code == 200, f"Draft generation failed: {res.text}"
    draft_data = res.json()
    print(f"[OK] AI Compliance Draft created. Title: '{draft_data['title']}', Version: {draft_data['version']}")

    # 14. Upload evidence and validate
    print("\n[Step 11] Uploading audit proof evidence ...")
    # Simulate a TXT proof file containing required keywords
    evidence_content = b"This is the digital lending compliance audit proof showing FLDG caps are restricted to 5 percent in agreements."
    res = requests.post(
        f"{BASE_URL}/maps/{map_id}/evidence",
        files={"file": ("evidence_proof.txt", evidence_content, "text/plain")},
        headers=headers
    )
    assert res.status_code == 200, f"Evidence upload failed: {res.text}"
    evidence_data = res.json()
    print(f"[OK] Evidence validated. Status: {evidence_data['validation_status']}")
    print(f"  AI Notes: {evidence_data['ai_notes']}")

    # Re-fetch map status to confirm it transitioned to Completed
    res = requests.get(f"{BASE_URL}/maps", headers=headers)
    updated_maps = res.json()
    updated_test_map = [m for m in updated_maps if m["id"] == map_id][0]
    print(f"[OK] Mapped task status after evidence upload: {updated_test_map['status']}")
    assert updated_test_map["status"] == "Completed", "MAP task status should be updated to Completed"

    print("\n====================================================")
    print("      [OK] ALL PHASE 2 WORKFLOW AUDIT TESTS PASSED     ")
    print("====================================================")

if __name__ == "__main__":
    test_workflow()
