import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "reguflow.db")

def get_db_conn():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_conn()
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS regulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        changes TEXT, -- JSON serialized list of strings
        actions_required TEXT, -- JSON serialized list of strings
        affected_entities TEXT, -- JSON serialized list of strings
        deadline TEXT,
        created_at TEXT NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        regulation_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        department TEXT NOT NULL,
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'NOT_STARTED',
        created_at TEXT NOT NULL,
        FOREIGN KEY (regulation_id) REFERENCES regulations(id) ON DELETE SET NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verification_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        evidence_id INTEGER NOT NULL,
        department TEXT NOT NULL,
        status TEXT NOT NULL,
        confidence REAL NOT NULL,
        evidence_found TEXT, -- JSON serialized list of strings
        missing_requirements TEXT, -- JSON serialized list of strings
        reason TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
    )
    """)
    
    # Seed default departments if necessary
    cursor.execute("CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)")
    for dept in ["IT", "Security", "Compliance", "Operations", "Legal", "HR"]:
        cursor.execute("INSERT OR IGNORE INTO departments (name) VALUES (?)", (dept,))
        
    # Migrate verification_reports table to support progress, score, and updated_at columns
    try:
        cursor.execute("PRAGMA table_info(verification_reports)")
        columns = [row[1] for row in cursor.fetchall()]
        if columns:  # Only if table exists/was created
            if "progress" not in columns:
                cursor.execute("ALTER TABLE verification_reports ADD COLUMN progress TEXT DEFAULT '0%'")
            if "score" not in columns:
                cursor.execute("ALTER TABLE verification_reports ADD COLUMN score REAL DEFAULT 0.0")
            if "updated_at" not in columns:
                cursor.execute("ALTER TABLE verification_reports ADD COLUMN updated_at TEXT")
    except Exception as e:
        print(f"Error migrating verification_reports table: {e}")
        
    conn.commit()
    conn.close()


# Regulation operations
def db_add_regulation(title: str, content: str, summary: str, changes: List[str], actions_required: List[str], affected_entities: List[str], deadline: Optional[str]) -> int:
    conn = get_db_conn()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO regulations (title, content, summary, changes, actions_required, affected_entities, deadline, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        title, 
        content, 
        summary, 
        json.dumps(changes), 
        json.dumps(actions_required), 
        json.dumps(affected_entities), 
        deadline, 
        created_at
    ))
    reg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return reg_id

def db_get_regulations() -> List[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM regulations ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "content": r["content"],
            "summary": r["summary"],
            "changes": json.loads(r["changes"]) if r["changes"] else [],
            "actions_required": json.loads(r["actions_required"]) if r["actions_required"] else [],
            "affected_entities": json.loads(r["affected_entities"]) if r["affected_entities"] else [],
            "deadline": r["deadline"],
            "created_at": r["created_at"],
            "tasks": []
        })
    return results

def db_get_regulation(reg_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM regulations WHERE id = ?", (reg_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r["id"],
        "title": r["title"],
        "content": r["content"],
        "summary": r["summary"],
        "changes": json.loads(r["changes"]) if r["changes"] else [],
        "actions_required": json.loads(r["actions_required"]) if r["actions_required"] else [],
        "affected_entities": json.loads(r["affected_entities"]) if r["affected_entities"] else [],
        "deadline": r["deadline"],
        "created_at": r["created_at"],
        "tasks": []
    }

# Task operations
def db_add_task(regulation_id: int, title: str, description: str, department: str, deadline: str) -> int:
    conn = get_db_conn()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO tasks (regulation_id, title, description, department, deadline, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'NOT_STARTED', ?)
    """, (regulation_id, title, description, department, deadline, created_at))
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return task_id

def db_update_task_status(task_id: int, status: str):
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (status, task_id))
    conn.commit()
    conn.close()

def db_get_tasks(regulation_id: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    if regulation_id is not None:
        cursor.execute("SELECT * FROM tasks WHERE regulation_id = ? ORDER BY id DESC", (regulation_id,))
    else:
        cursor.execute("SELECT * FROM tasks ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def db_get_task(task_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# Evidence operations
def db_add_evidence(task_id: int, file_path: str, file_type: str) -> int:
    conn = get_db_conn()
    cursor = conn.cursor()
    uploaded_at = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO evidence (task_id, file_path, file_type, uploaded_at)
    VALUES (?, ?, ?, ?)
    """, (task_id, file_path, file_type, uploaded_at))
    evidence_id = cursor.lastrowid
    
    # Automatically upgrade task status to IN_PROGRESS when evidence is uploaded
    cursor.execute("SELECT status FROM tasks WHERE id = ?", (task_id,))
    task_row = cursor.fetchone()
    if task_row and task_row["status"] == "NOT_STARTED":
        cursor.execute("UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?", (task_id,))
        
    conn.commit()
    conn.close()
    return evidence_id

def db_get_evidence_by_task(task_id: int) -> List[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM evidence WHERE task_id = ? ORDER BY id DESC", (task_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def db_get_evidence(evidence_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# Verification Report operations
def db_add_verification_report(task_id: int, evidence_id: int, department: str, status: str, confidence: float, evidence_found: List[str], missing_requirements: List[str], reason: str) -> int:
    conn = get_db_conn()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO verification_reports (task_id, evidence_id, department, status, confidence, evidence_found, missing_requirements, reason, progress, score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '100%', ?, ?, ?)
    """, (
        task_id,
        evidence_id,
        department,
        status,
        confidence,
        json.dumps(evidence_found),
        json.dumps(missing_requirements),
        reason,
        confidence,
        created_at,
        created_at
    ))
    report_id = cursor.lastrowid
    
    # Update the task status to the verified status
    cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (status, task_id))
    
    conn.commit()
    conn.close()
    return report_id

def db_create_queued_report(task_id: int, evidence_id: int, department: str) -> int:
    conn = get_db_conn()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO verification_reports (task_id, evidence_id, department, status, confidence, evidence_found, missing_requirements, reason, progress, score, created_at, updated_at)
    VALUES (?, ?, ?, 'QUEUED', 0.0, '[]', '[]', 'Verification queued for processing...', '0%', 0.0, ?, ?)
    """, (task_id, evidence_id, department, created_at, created_at))
    report_id = cursor.lastrowid
    
    # Update task to IN_PROGRESS when queued
    cursor.execute("UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?", (task_id,))
    
    conn.commit()
    conn.close()
    return report_id

def db_update_report_progress(report_id: int, status: str, progress: str, reason: str):
    conn = get_db_conn()
    cursor = conn.cursor()
    updated_at = datetime.now().isoformat()
    cursor.execute("""
    UPDATE verification_reports
    SET status = ?, progress = ?, reason = ?, updated_at = ?
    WHERE id = ?
    """, (status, progress, reason, updated_at, report_id))
    conn.commit()
    conn.close()

def db_update_report_final(report_id: int, status: str, confidence: float, score: float, evidence_found: List[str], missing_requirements: List[str], reason: str):
    conn = get_db_conn()
    cursor = conn.cursor()
    updated_at = datetime.now().isoformat()
    cursor.execute("""
    UPDATE verification_reports
    SET status = ?, confidence = ?, score = ?, evidence_found = ?, missing_requirements = ?, reason = ?, progress = '100%', updated_at = ?
    WHERE id = ?
    """, (
        status,
        confidence,
        score,
        json.dumps(evidence_found),
        json.dumps(missing_requirements),
        reason,
        updated_at,
        report_id
    ))
    
    # Update the task status to the final compliance status
    cursor.execute("SELECT task_id FROM verification_reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    if row:
        task_id = row[0]
        cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (status, task_id))
        
    conn.commit()
    conn.close()

def db_get_verification_reports_by_task(task_id: int) -> List[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM verification_reports WHERE task_id = ? ORDER BY id DESC", (task_id,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        keys = r.keys()
        results.append({
            "id": r["id"],
            "task_id": r["task_id"],
            "evidence_id": r["evidence_id"],
            "department": r["department"],
            "status": r["status"],
            "confidence": r["confidence"],
            "evidence_found": json.loads(r["evidence_found"]) if r["evidence_found"] else [],
            "missing_requirements": json.loads(r["missing_requirements"]) if r["missing_requirements"] else [],
            "reason": r["reason"],
            "progress": r["progress"] if "progress" in keys else "100%",
            "score": r["score"] if "score" in keys else r["confidence"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"] if ("updated_at" in keys and r["updated_at"]) else r["created_at"]
        })
    return results

def db_get_verification_report(report_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM verification_reports WHERE id = ?", (report_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    keys = r.keys()
    return {
        "id": r["id"],
        "task_id": r["task_id"],
        "evidence_id": r["evidence_id"],
        "department": r["department"],
        "status": r["status"],
        "confidence": r["confidence"],
        "evidence_found": json.loads(r["evidence_found"]) if r["evidence_found"] else [],
        "missing_requirements": json.loads(r["missing_requirements"]) if r["missing_requirements"] else [],
        "reason": r["reason"],
        "progress": r["progress"] if "progress" in keys else "100%",
        "score": r["score"] if "score" in keys else r["confidence"],
        "created_at": r["created_at"],
        "updated_at": r["updated_at"] if ("updated_at" in keys and r["updated_at"]) else r["created_at"]
    }


# Dashboard Stats operations
def db_get_stats() -> Dict[str, Any]:
    conn = get_db_conn()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM tasks")
    total_tasks = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'COMPLETED'")
    completed_tasks = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'IN_PROGRESS'")
    in_progress_tasks = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'NOT_STARTED'")
    not_started_tasks = cursor.fetchone()[0]
    
    cursor.execute("SELECT AVG(confidence) FROM verification_reports")
    avg_confidence_val = cursor.fetchone()[0]
    average_confidence = round(avg_confidence_val, 4) if avg_confidence_val is not None else 0.0
    
    compliance_rate = round(completed_tasks / total_tasks, 4) if total_tasks > 0 else 0.0
    
    conn.close()
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "not_started_tasks": not_started_tasks,
        "average_confidence": average_confidence,
        "compliance_rate": compliance_rate
    }


def db_cleanup_stale_reports():
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        # Find all stale verification reports
        cursor.execute("SELECT id, task_id FROM verification_reports WHERE status = 'PROCESSING'")
        stale_reports = cursor.fetchall()
        
        for r in stale_reports:
            report_id, task_id = r[0], r[1]
            # Update task status back to IN_PROGRESS
            cursor.execute("UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?", (task_id,))
            
        # Update stale reports to FAILED / 100%
        cursor.execute("""
            UPDATE verification_reports 
            SET status = 'FAILED', progress = '100%', reason = 'Validation interrupted due to server restart.'
            WHERE status = 'PROCESSING'
        """)
        conn.commit()
        print(f"Cleaned up {len(stale_reports)} stale verification reports from database.")
    except Exception as e:
        conn.rollback()
        print(f"Error cleaning up stale reports: {e}")
    finally:
        conn.close()

