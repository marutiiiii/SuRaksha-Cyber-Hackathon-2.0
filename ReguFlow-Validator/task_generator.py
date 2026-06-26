from typing import Dict, Any, Optional
import os
from regulation_extractor import extract_regulation_details
from models.db import db_add_regulation, db_add_task, db_get_regulation, db_get_tasks

def generate_tasks_from_regulation(regulation_text_or_path: str, file_name_optional: Optional[str] = None) -> Dict[str, Any]:
    """
    1. Extract details from regulation (PDF file path or raw text).
    2. Add the regulation to the SQLite database.
    3. Generate task entries in the database for each extracted task.
    4. Return the regulation and task details.
    """
    # 1. Extract details using regulation extractor
    extracted = extract_regulation_details(regulation_text_or_path)
    
    # Use the file name as regulation title if extraction returned empty or generic title
    title = extracted.get("title") or file_name_optional or "New Regulation"
    
    # Determine the regulation content
    if os.path.isfile(regulation_text_or_path) and regulation_text_or_path.lower().endswith(".pdf"):
        # For database content field, we can record the file path or name
        content = f"Uploaded PDF File: {os.path.basename(regulation_text_or_path)}"
    else:
        content = regulation_text_or_path
        
    # 2. Save regulation to database
    reg_id = db_add_regulation(
        title=title,
        content=content,
        summary=extracted.get("summary", ""),
        changes=extracted.get("changes", []),
        actions_required=[t["task"] for t in extracted.get("tasks", [])],
        affected_entities=extracted.get("affected_entities", []),
        deadline=extracted.get("deadline") or None
    )
    
    # 3. Create tasks in database
    created_tasks = []
    for task_item in extracted.get("tasks", []):
        task_desc = task_item.get("task", "")
        dept = task_item.get("department", "Compliance")
        deadline = task_item.get("deadline")
        
        # If deadline is None or empty, fall back to regulation deadline or default
        if not deadline or deadline == "None":
            deadline = extracted.get("deadline") or "None"
            
        task_id = db_add_task(
            regulation_id=reg_id,
            title=task_desc[:60] + "..." if len(task_desc) > 60 else task_desc,
            description=task_desc,
            department=dept,
            deadline=deadline
        )
        
        created_tasks.append({
            "id": task_id,
            "title": task_desc[:60] + "..." if len(task_desc) > 60 else task_desc,
            "description": task_desc,
            "department": dept,
            "deadline": deadline,
            "status": "NOT_STARTED"
        })
        
    # 4. Fetch the saved regulation representation
    saved_reg = db_get_regulation(reg_id)
    if saved_reg:
        saved_reg["tasks"] = created_tasks
        return saved_reg
        
    return {
        "id": reg_id,
        "title": title,
        "content": content,
        "summary": extracted.get("summary", ""),
        "changes": extracted.get("changes", []),
        "affected_entities": extracted.get("affected_entities", []),
        "deadline": extracted.get("deadline"),
        "tasks": created_tasks
    }
