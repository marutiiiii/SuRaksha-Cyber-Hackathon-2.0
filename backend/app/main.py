import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.api.router import api_router

# Initialize database schema on startup
from app.core.database import engine, Base, SessionLocal
from app.models import models
from app.models.models import Regulation, Role
from datetime import datetime

from sqlalchemy import text

# Run schema creation inside a connection with 5-second lock timeout to prevent hanging on startup locks
try:
    with engine.connect() as conn:
        # Set lock_timeout for this connection session if postgres
        if conn.dialect.name == "postgresql":
            conn.execute(text("SET lock_timeout = 5000"))
        Base.metadata.create_all(bind=conn)
except Exception as e:
    import logging
    logging.getLogger("uvicorn.error").warning(f"Schema creation failed or timed out: {e}")

# Seed default data if DB is empty
db = SessionLocal()
try:
    # Set a short lock timeout (5 seconds) to avoid hanging uvicorn startup if tables are locked
    if db.bind.dialect.name == "postgresql":
        try:
            db.execute(text("SET lock_timeout = 5000"))
            db.commit()
        except Exception:
            db.rollback()

    # Dynamically ensure copilot_mode column exists in tables
    for table in ["documents", "comparisons", "maps", "reports", "notifications"]:
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN copilot_mode VARCHAR(50) DEFAULT 'beginner'"))
            db.commit()
            print(f"Added copilot_mode to {table}")
        except Exception:
            db.rollback()

    # Dynamically ensure new regulation columns exist (SQLite/PostgreSQL compatible)
    is_sqlite = db.bind.dialect.name == "sqlite"
    for col, col_type in [
        ("risk_level", "VARCHAR(50) DEFAULT 'Medium'"), 
        ("obligations", "JSON DEFAULT '[]'" if is_sqlite else "JSONB DEFAULT '[]'::jsonb"), 
        ("suggested_actions", "JSON DEFAULT '[]'" if is_sqlite else "JSONB DEFAULT '[]'::jsonb")
    ]:
        try:
            db.execute(text(f"ALTER TABLE regulations ADD COLUMN {col} {col_type}"))
            db.commit()
            print(f"Added dynamic column {col} to regulations")
        except Exception:
            db.rollback()

    # Dynamic columns migration for RBAC & Evidence
    rbac_columns = [
        ("users", "department", "VARCHAR(100)"),
        ("users", "user_type", "VARCHAR(50) DEFAULT 'admin'"),
        ("maps", "assigned_department", "VARCHAR(100)"),
        ("evidences", "department", "VARCHAR(100)"),
        ("evidences", "organization_id", "UUID"),
        ("evidences", "requested_status", "VARCHAR(50)"),
        ("evidences", "previous_status", "VARCHAR(50)"),
        ("evidences", "rejection_reason", "TEXT"),
        ("evidences", "confidence", "FLOAT DEFAULT 0.0"),
        ("evidences", "score", "FLOAT DEFAULT 0.0"),
        ("evidences", "evidence_found", "TEXT"),
        ("evidences", "missing_requirements", "TEXT"),
        ("evidences", "progress", "VARCHAR(50) DEFAULT '0%'")
    ]
    for tbl, col, ctype in rbac_columns:
        try:
            db.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {ctype}"))
            db.commit()
            print(f"Added column {col} ({ctype}) to table {tbl}")
        except Exception:
            db.rollback()

    # Seed default roles
    if db.query(Role).count() == 0:
        default_roles = [
            Role(name="Admin", description="Full system administrator access"),
            Role(name="Compliance Officer", description="Manages compliance workflows"),
            Role(name="Legal Officer", description="Legal review and advisory"),
            Role(name="Auditor", description="Audit and readiness review"),
            Role(name="Executive Viewer", description="Read-only executive dashboards"),
        ]
        db.add_all(default_roles)
        db.commit()

    # Seed new roles
    for rname, rdesc in [
        ("AI Compliance Officer", "Full access compliance officer with admin capabilities"),
        ("Department Officer", "Department-specific compliance task manager")
    ]:
        if not db.query(Role).filter(Role.name == rname).first():
            db.add(Role(name=rname, description=rdesc))
            db.commit()

    # Backfill maps.assigned_department from title/owner mapping
    from app.models.models import Map
    try:
        null_dept_maps = db.query(Map).filter(Map.assigned_department == None).all()
        if null_dept_maps:
            title_to_dept = {
                "KYC": "Compliance",
                "FLDG": "Legal",
                "DLA quarterly": "IT",
                "Java middleware": "Cybersecurity",
                "materiality policy": "Compliance",
                "UPI velocity": "IT",
                "insider trading": "Legal",
                "vendor risk": "Audit",
                "V-CIP": "Operations",
                "NPCI UPI": "IT",
                "Lending FLDG": "Compliance",
                "Billing Cycle": "Compliance"
            }
            for m in null_dept_maps:
                matched = False
                for kw, dept in title_to_dept.items():
                    if kw.lower() in m.title.lower():
                        m.assigned_department = dept
                        matched = True
                        break
                if not matched and m.owner:
                    if "Compliance" in m.owner:
                        m.assigned_department = "Compliance"
                    elif "Legal" in m.owner:
                        m.assigned_department = "Legal"
                    elif "IT" in m.owner:
                        m.assigned_department = "IT"
                    elif "Cyber" in m.owner:
                        m.assigned_department = "Cybersecurity"
                    elif "Audit" in m.owner:
                        m.assigned_department = "Audit"
                    elif "Operations" in m.owner:
                        m.assigned_department = "Operations"
            db.commit()
            print("Backfilled assigned_department for existing maps")
    except Exception as ex:
        db.rollback()
        print(f"Error backfilling assigned_department: {ex}")

    # Seed default demo user and organization
    from app.models.models import Organization, User
    import uuid
    import hashlib
    demo_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    demo_org = db.query(Organization).filter(Organization.id == demo_id).first()
    if not demo_org:
        demo_org = Organization(
            id=demo_id,
            name="SafeBank India",
            industry="Banking",
            org_size="Enterprise",
            departments=["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"],
            services=["Retail Banking", "Corporate Banking", "Internet Banking", "Mobile Banking", "UPI", "Digital Payments", "Loans", "Credit Cards", "KYC Services"],
            enabled_sources=["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
            is_setup_complete=True
        )
        db.add(demo_org)
        db.commit()

    demo_user = db.query(User).filter(User.id == demo_id).first()
    if not demo_user:
        co_role = db.query(Role).filter(Role.name == "Compliance Officer").first()
        demo_user = User(
            id=demo_id,
            organization_id=demo_org.id,
            role_id=co_role.id if co_role else None,
            full_name="Aarav Mehta",
            email="demo@safebank.com",
            password_hash=hashlib.sha256(b"demo123").hexdigest(),
            status="Active"
        )
        db.add(demo_user)
        db.commit()

    # Seed default regulations
    if db.query(Regulation).count() == 0:
        seed_regs = [
            Regulation(
                source="RBI",
                title="Master Direction on Digital Lending Guidelines",
                date=datetime.strptime("2026-05-15", "%Y-%m-%d").date(),
                link="https://rbi.org.in",
                summary="Sets out mandatory disclosure norms for Digital Lending Apps (DLAs), First Loss Default Guarantee (FLDG) caps, and customer grievance mechanisms."
            ),
            Regulation(
                source="RBI",
                title="Master Direction on KYC (Amendment 2026)",
                date=datetime.strptime("2026-04-08", "%Y-%m-%d").date(),
                link="https://rbi.org.in",
                summary="Shifts high-risk customer CDD from biennial to annual cadence; elevates V-CIP from permissive to preferred."
            ),
            Regulation(
                source="SEBI",
                title="LODR Amendment — Materiality Threshold",
                date=datetime.strptime("2026-04-04", "%Y-%m-%d").date(),
                link="https://sebi.gov.in",
                summary="Lowers materiality threshold for event disclosures under Regulation 30, increasing the frequency of mandatory disclosures."
            ),
            Regulation(
                source="NPCI",
                title="UPI Transaction Limits and Risk Management Circular (2026)",
                date=datetime.strptime("2026-05-20", "%Y-%m-%d").date(),
                link="https://www.npci.org.in",
                summary="Sets daily limits for high-risk accounts and establishes risk alerts for anomalous peer-to-peer payment velocities."
            ),
            Regulation(
                source="NPCI",
                title="Guidelines on UPI Lite and Offline Transaction Security",
                date=datetime.strptime("2026-03-12", "%Y-%m-%d").date(),
                link="https://www.npci.org.in",
                summary="Upgrades transaction authentication and limit controls for offline wallets and UPI Lite services on mobile devices."
            ),
            Regulation(
                source="CERT-In",
                title="Cybersecurity Advisory on Ransomware Mitigations for Critical Financial Infrastructure",
                date=datetime.strptime("2026-06-01", "%Y-%m-%d").date(),
                link="https://www.cert-in.org.in",
                summary="Mandates specific application controls, Java middleware updates, and strict 6-hour incident disclosure reporting windows."
            ),
            Regulation(
                source="CERT-In",
                title="Mandatory Information Security Practices and Log Retention Rules",
                date=datetime.strptime("2026-02-18", "%Y-%m-%d").date(),
                link="https://www.cert-in.org.in",
                summary="Requires system logging for all user operations and mandates 180-day secure offsite retention of security logs."
            ),
            Regulation(
                source="FIU-IND",
                title="Anti-Money Laundering (AML) and Counter-Terrorism Financing (CFT) Reporting Guidelines",
                date=datetime.strptime("2026-05-10", "%Y-%m-%d").date(),
                link="https://fiuindia.gov.in",
                summary="Clarifies red flag indicators for high-risk trading accounts and outlines structural formatting for Suspicious Transaction Reports (STRs)."
            ),
            Regulation(
                source="MeitY / DPDP",
                title="Digital Personal Data Protection (DPDP) Rules on Consent Management",
                date=datetime.strptime("2026-06-15", "%Y-%m-%d").date(),
                link="https://www.meity.gov.in",
                summary="Outlines mandatory interfaces for consent withdrawability, user data erasure, and data principal grievance redressal."
            ),
            Regulation(
                source="MeitY / DPDP",
                title="Information Technology (Reasonable Security Practices and Procedures) Amendment",
                date=datetime.strptime("2026-01-20", "%Y-%m-%d").date(),
                link="https://www.meity.gov.in",
                summary="Specifies data protection audits and independent certification requirements for organizations handling sensitive personal data."
            )
        ]
        db.add_all(seed_regs)
        db.commit()
finally:
    db.close()

# ─── Startup Health Checks ────────────────────────────────────────────────────
import logging
_startup_logger = logging.getLogger("uvicorn.error")

# 1. Ollama startup check
try:
    from app.core.ai_service import LlamaAIService
    ollama_status = LlamaAIService.startup_health_check()
    _startup_logger.info(f"[Startup] Ollama: {ollama_status['message']}")
except Exception as e:
    _startup_logger.warning(f"[Startup] Ollama check failed: {e}")

# 2. Embedding model startup check
try:
    from app.core.embeddings import EmbeddingService
    test_vec = EmbeddingService.encode("startup test")
    if EmbeddingService.is_zero_vector(test_vec):
        _startup_logger.warning("[Startup] Embeddings: Model failed to load — zero vectors in use")
    else:
        _startup_logger.info(f"[Startup] Embeddings: all-MiniLM-L6-v2 ready (dim={len(test_vec)})")
except Exception as e:
    _startup_logger.warning(f"[Startup] Embeddings check failed: {e}")
 
# 3. Qwen Vision Model startup check/load
try:
    import threading
    from app.core.qwen_service import load_qwen_model_on_startup
    _startup_logger.info("[Startup] Qwen: Triggering model load in background thread...")
    threading.Thread(target=load_qwen_model_on_startup, daemon=True).start()
except Exception as e:
    _startup_logger.warning(f"[Startup] Qwen model check failed: {e}")

# 3. ReguFlow Validation — Qwen2.5-VL model pre-load (background thread, non-blocking)
try:
    import threading
    from app.core.validation.qwen_service import load_qwen_model_on_startup, verify_model_integrity
    if verify_model_integrity():
        _startup_logger.info(f"[Startup] Qwen2.5-VL model files detected at '{settings.QWEN_MODEL_PATH}'. Pre-loading in background...")
        _qwen_thread = threading.Thread(target=load_qwen_model_on_startup, daemon=True)
        _qwen_thread.start()
    else:
        _startup_logger.warning(
            f"[Startup] Qwen2.5-VL model NOT found at '{settings.QWEN_MODEL_PATH}'. "
            "Evidence will require manual review. Set QWEN_MODEL_PATH env var to enable AI verification."
        )
except Exception as e:
    _startup_logger.warning(f"[Startup] Qwen startup check failed: {e}")

# Create storage directories locally on startup
os.makedirs(os.path.join(settings.STORAGE_PATH, "documents"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_PATH, "reports"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_PATH, "evidence"), exist_ok=True)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount local storage folder to serve documents and reports
app.mount("/storage", StaticFiles(directory=settings.STORAGE_PATH), name="storage")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get(f"{settings.API_V1_STR}", include_in_schema=False)
def api_root():
    return RedirectResponse(url="/docs")

@app.get(f"{settings.API_V1_STR}/", include_in_schema=False)
def api_root_slash():
    return RedirectResponse(url="/docs")

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def api_health_check():
    return {"status": "healthy"}

# ─── 24-Hour Auto-Scraper Background Thread ──────────────────────────────────
import threading
import time

def run_auto_scraper():
    # Wait for the database and startup checks to settle
    time.sleep(1800)
    _startup_logger.info("[Scheduler] Starting 24-hour auto scraping pipeline thread...")
    while True:
        db = SessionLocal()
        try:
            from app.core.scraper import scrape_latest_regulations
            scraped_count = scrape_latest_regulations(db, limit=5)
            _startup_logger.info(f"[Scheduler] Auto scrape completed. Ingested {scraped_count} new regulations.")
        except Exception as e:
            _startup_logger.error(f"[Scheduler] Auto scrape error: {e}")
        finally:
            db.close()
        
        # Sleep for 24 hours
        time.sleep(24 * 60 * 60)

def run_backfill_pipeline():
    time.sleep(5)  # Wait for startup checks to settle
    _startup_logger.info("[Backfill] Starting backfill thread for existing regulations...")
    db = SessionLocal()
    try:
        from app.models.models import Regulation, User, Document
        from app.core.pipeline import execute_downstream_pipeline
        import uuid
        
        users = db.query(User).all()
        # Prioritize demo@safebank.com to be absolute first, followed by bankarjay2304@gmail.com to build cache
        def sort_key(u):
            if u.email == "demo@safebank.com":
                return 0
            elif u.email == "bankarjay2304@gmail.com":
                return 1
            else:
                return 2
        users = sorted(users, key=sort_key)
        regulations = db.query(Regulation).order_by(Regulation.date.asc()).all()
        
        _startup_logger.info(f"[Backfill] Found {len(users)} users and {len(regulations)} regulations to check.")
        for u in users:
            _startup_logger.info(f"[Backfill] Checking regulations for user: {u.email}")
            for reg in regulations:
                for mode in ["beginner"]:
                    doc = db.query(Document).filter(
                        Document.user_id == u.id,
                        Document.title == reg.title,
                        Document.copilot_mode == mode
                    ).first()
                    if not doc:
                        _startup_logger.info(f"[Backfill] Creating Document for '{reg.title}' ({mode}) for user {u.email}")
                        doc_id = uuid.uuid4()
                        doc = Document(
                            id=doc_id,
                            user_id=u.id,
                            title=reg.title,
                            source=reg.source or "RBI",
                            file_path=reg.link or "/storage/documents/placeholder.pdf",
                            status="extracted",
                            extracted_text=reg.summary or "Summary placeholder",
                            copilot_mode=mode
                        )
                        db.add(doc)
                        db.commit()
                        db.refresh(doc)
                        
                        try:
                            execute_downstream_pipeline(db, doc, u.id, mode)
                        except Exception as e:
                            _startup_logger.error(f"[Backfill] Error in backfill pipeline for '{reg.title}' ({mode}): {e}")
        _startup_logger.info("[Backfill] Backfill pipeline complete!")
    except Exception as e:
        _startup_logger.error(f"[Backfill] Backfill thread error: {e}")
    finally:
        db.close()

scraper_thread = threading.Thread(target=run_auto_scraper, name="AutoScraperThread", daemon=True)
scraper_thread.start()

backfill_thread = threading.Thread(target=run_backfill_pipeline, name="BackfillThread", daemon=True)
backfill_thread.start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
