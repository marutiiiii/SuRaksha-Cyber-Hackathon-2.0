import sqlite3
import os
import uuid
import datetime

# The database is located in the backend folder
DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "backend",
    "backend.db"
)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def insert_regulation(data):
    conn = get_db()
    cursor = conn.cursor()
    new_id = str(uuid.uuid4())
    
    # SQLAlchemy stores Uuid in SQLite natively as 16-byte blobs if configured so,
    # but the current models use string format. We'll use hex format just in case,
    # or the standard dash format. Let's use hex as it's common for SQLAlchemy UUID.
    cursor.execute("""
        INSERT INTO regulations (id, source, title, date, summary, risk_level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id.replace('-', ''),
        data.get("source", "Unknown"),
        data.get("pdf_name", "Unknown Title"),
        datetime.date.today().isoformat(),
        data.get("content", "")[:1000],
        "Medium",
        datetime.datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()
    return new_id

def insert_chunks(regulation_id, chunks):
    conn = get_db()
    cursor = conn.cursor()
    rows = []
    now = datetime.datetime.now().isoformat()
    for idx, chunk in enumerate(chunks):
        rows.append((
            str(uuid.uuid4()).replace('-', ''),
            regulation_id.replace('-', ''),
            idx + 1,
            chunk,
            now
        ))
        
    cursor.executemany("""
        INSERT INTO regulation_chunks (id, regulation_id, chunk_index, chunk_text, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, rows)
    conn.commit()
    conn.close()

def regulation_exists(pdf_name):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM regulations WHERE title = ?", (pdf_name,))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def get_all_chunks():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM regulation_chunks")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_regulation_by_id(regulation_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM regulations WHERE id = ?", (regulation_id.replace('-', ''),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None
