import os
import uuid
import json
import re
import requests as _requests
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from app.core.evidence_analyzer import verify_evidence_background
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi.responses import FileResponse
from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_dept_officer_scope
from app.models.models import Map, Comparison, Evidence, User, Organization
from app.schemas.schemas import MapResponse, MapCreate, MapStatusUpdate, EvidenceResponse, EvidenceReviewRequest
from app.core.config import settings
from app.core.offline_map_provider import generate_maps_from_regulation

router = APIRouter(prefix="/maps", tags=["MAP Management"])

COLUMNS = ["Pending", "In Progress", "Awaiting Validation", "Completed"]


def _can_transition_status(current_status: str, target_status: str, allow_evidence_submission: bool = False) -> bool:
    if current_status not in COLUMNS or target_status not in COLUMNS:
        return False
    if current_status == target_status:
        return True

    source_index = COLUMNS.index(current_status)
    target_index = COLUMNS.index(target_status)

    if allow_evidence_submission and current_status == "Pending" and target_status == "Awaiting Validation":
        return True
    if allow_evidence_submission and current_status == "In Progress" and target_status == "Awaiting Validation":
        return True

    return abs(target_index - source_index) <= 1


EVIDENCE_DIR = os.path.join(settings.STORAGE_PATH, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

# ─── ChromaDB Configuration ────────────────────────────────────────────────────

_CHROMA_API_KEY    = os.getenv("CHROMA_API_KEY",    "ck-J8T4rhpHwaRyhni6jh2PGkRDNFLTFzxAF7ysxoXcKB49")
_CHROMA_TENANT     = os.getenv("CHROMA_TENANT",     "8a810af5-e80b-474e-b853-5a7eb2db214c")
_CHROMA_DB         = os.getenv("CHROMA_DB",          "acris-data")
_CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION",  "regulations")

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL",    settings.OLLAMA_MODEL)

# ─── Text Utilities ────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

_OBLIGATION_KEYWORDS = (
    "shall", "must", "should", "required", "report", "submit", "maintain",
    "implement", "ensure", "comply", "verify", "review", "update", "train",
    "monitor", "notify", "approve", "disclose", "limit", "exceed", "within",
    "mandate", "prohibit", "restrict", "require", "enforce", "designate",
    "establish", "conduct", "assess", "perform", "document", "retain",
)

def _is_meaningful(text: str, min_length: int = 100) -> bool:
    if len(text) < min_length:
        return False
    return any(kw in text.lower() for kw in _OBLIGATION_KEYWORDS)

def _group_by_regulation(ids, docs, metas):
    groups = {}
    for doc_id, doc, meta in zip(ids, docs, metas):
        meta = meta or {}
        reg_id = meta.get("regulation_id", doc_id)
        source = meta.get("source", reg_id)
        if reg_id not in groups:
            groups[reg_id] = {"chunks": [], "source": source}
        groups[reg_id]["chunks"].append(doc)
    return groups

# ─── LLM Utility ──────────────────────────────────────────────────────────────

def _ask_ollama(system_msg: str, user_msg: str, max_tokens: int = 400) -> str:
    try:
        payload = {
            "model": _OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": user_msg},
            ],
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": max_tokens},
        }
        resp = _requests.post(f"{_OLLAMA_BASE_URL}/api/chat", json=payload, timeout=60)
        resp.raise_for_status()
        content = (resp.json().get("message", {}).get("content") or "").strip()
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
        return content or "[AI Unavailable]"
    except Exception:
        return "[AI Unavailable]"

# ─── MAP Generation ───────────────────────────────────────────────────────────

_ACTION_VERBS = (
    "implement", "submit", "maintain", "report", "train", "verify",
    "ensure", "conduct", "establish", "monitor", "review", "update",
    "notify", "approve", "disclose", "limit", "restrict", "require",
    "provide", "document", "assess", "perform", "comply", "designate",
    "develop", "enforce", "record", "retain", "test", "validate",
    "configure", "deploy", "encrypt", "audit", "remediate",
)

def _generate_maps_rule_based(text: str, regulation_id: str = "") -> list:
    maps, lower = [], text.lower()
    src = f" [{regulation_id}]" if regulation_id else ""
    if any(k in lower for k in ["mfa", "multi-factor", "otp", "authentication"]):
        maps.append(f"Implement Multi-Factor Authentication (MFA) for all digital banking platforms{src}")
    if any(k in lower for k in ["system", "software", "platform", "deploy"]):
        maps.append(f"Update and configure relevant IT systems to comply with the regulation{src}")
    if any(k in lower for k in ["encryption", "encrypt", "data protection"]):
        maps.append(f"Implement encryption controls for all regulated data at rest and in transit{src}")
    if any(k in lower for k in ["vulnerability", "penetration", "security test"]):
        maps.append(f"Conduct vulnerability assessment and penetration testing{src}")
    maps.append(f"Update internal compliance policy documentation to reflect new regulatory requirements{src}")
    if any(k in lower for k in ["kyc", "know your customer", "aml", "anti-money"]):
        maps.append(f"Revise KYC/AML procedures and checklists per updated regulation{src}")
    if any(k in lower for k in ["audit", "audit trail", "audit log"]):
        maps.append(f"Establish audit trail and logging mechanisms as required{src}")
    maps.append(f"Conduct employee awareness training session on new regulatory requirements{src}")
    if any(k in lower for k in ["report", "submit", "quarterly", "annual"]):
        maps.append(f"Submit required regulatory report to the designated authority within the specified deadline{src}")
    if any(k in lower for k in ["capital", "cet1", "ratio", "lcr", "liquidity"]):
        maps.append(f"Maintain required capital/liquidity ratio and report to regulator{src}")
    return maps[:8]

def _generate_maps(regulation_text: str) -> list:
    cleaned = _clean_text(regulation_text)[:2000]
    system_msg = (
        "You are a compliance officer. Break the regulation into specific, granular "
        "Measurable Action Points (MAPs).\n"
        "Generate ALL of the following task types that apply:\n"
        "  1. TECHNICAL task   (e.g. Update system, Configure software)\n"
        "  2. POLICY task      (e.g. Update security policy, Revise documentation)\n"
        "  3. TRAINING task    (e.g. Train employees, Conduct staff awareness)\n"
        "  4. DEADLINE task    (e.g. Complete implementation before <date>)\n"
        "Rules:\n"
        "- Each MAP must start with an action verb.\n"
        "- Be specific — mention system names, roles, numbers or dates.\n"
        "- Output ONLY a numbered list, no explanation."
    )
    raw = _ask_ollama(system_msg, f"Regulation:\n{cleaned}\n\nMAPs:", max_tokens=400)
    if "[AI Unavailable]" in raw:
        return _generate_maps_rule_based(cleaned)

    maps, seen = [], set()
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        if line[0].isdigit() or line.startswith(("-", "*", "•")):
            clean = line.lstrip("0123456789.-)*• ✅[]").strip()
        elif line.lower().split()[0] in _ACTION_VERBS if line.split() else False:
            clean = line
        else:
            continue
        norm = clean.lower()
        if len(clean) > 15 and norm not in seen:
            seen.add(norm)
            maps.append(clean)
    return maps if maps else _generate_maps_rule_based(cleaned)

# ─── Department Assignment ─────────────────────────────────────────────────────

def _assign_department(map_task: str) -> str:
    t = map_task.lower()
    if any(k in t for k in ["submit required", "submit regulatory", "submit report", "filing"]):
        return "Compliance Team"
    if any(k in t for k in ["cybersecurity", "encryption", "firewall", "intrusion", "vulnerability",
                              "penetration test", "data breach", "siem", "soc ", "cyber",
                              "ransomware", "security patch", "malware", "incident response"]):
        return "Cybersecurity Team"
    if any(k in t for k in ["train", "awareness", "staff session", "employee", "workshop", "onboard", "hr "]):
        return "HR Team"
    if any(k in t for k in ["audit trail", "audit log", "internal audit", "external audit", "audit report"]):
        return "Audit Team"
    if any(k in t for k in ["risk assessment", "risk management", "risk framework",
                              "business continuity", "bcp", "bcm", "risk mitigation", "risk register"]):
        return "Risk Management"
    if any(k in t for k in ["legal", "kyc", "know your customer", "identity", "verification",
                              "aml", "anti-money laundering", "contract", "law", "license"]):
        return "Legal Team"
    if any(k in t for k in ["capital ratio", "liquidity", "cet1", "lcr", "financial report",
                              "quarterly report", "annual report", "forex", "report to regulator", "budget"]):
        return "Finance Team"
    if any(k in t for k in ["policy", "documentation", "regulatory", "compliance", "sop",
                              "procedure", "deadline", "complete before", "submit by"]):
        return "Compliance Team"
    if any(k in t for k in ["system", "software", "otp", "mfa", "login", "api", "database",
                              "configure", "deploy", "server", "network", "digital", "platform", "implement"]):
        return "IT Team"
    if any(k in t for k in ["operations", "workflow", "process", "operational"]):
        return "Operations Team"
    return "Compliance Team"

# ─── Deadline Extraction ──────────────────────────────────────────────────────

def _extract_deadline(text: str) -> str:
    patterns = [
        r'(?:by|before|until|no later than|effective|deadline[\:\s]*)\s*'
        r'((?:January|February|March|April|May|June|July|August|September|October|November|December)'
        r'\s+\d{1,2}[,\s]+\d{4})',
        r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})',
        r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})',
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{1,2}/\d{1,2}/\d{4})',
        r'(?:within|in)\s+(\d+\s+(?:days|months))',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip() if m.lastindex else m.group(0).strip()
    return "Not specified"

def _parse_deadline_to_date(deadline_str: str) -> date:
    if not deadline_str or deadline_str == "Not specified":
        return date.today() + timedelta(days=30)
    for fmt in ["%B %d, %Y", "%B %d %Y", "%d %B %Y", "%Y-%m-%d", "%d/%m/%Y", "%B %Y"]:
        try:
            return datetime.strptime(deadline_str.replace(",", ""), fmt.replace(",", "")).date()
        except ValueError:
            continue
    m = re.match(r'within (\d+) (days|months)', deadline_str, re.IGNORECASE)
    if m:
        n = int(m.group(1))
        return date.today() + timedelta(days=n * 30 if "month" in m.group(2).lower() else n)
    return date.today() + timedelta(days=30)

# ─── Impact / Severity Scoring ────────────────────────────────────────────────

_SCORING_RULES = [
    ("mfa", 3), ("multi-factor", 3), ("otp", 2), ("encryption", 3),
    ("firewall", 2), ("vulnerability", 2), ("data breach", 3), ("cyber", 2),
    ("system", 1), ("capital ratio", 3), ("cet1", 3), ("liquidity", 2),
    ("penalty", 3), ("enforcement", 2), ("mandatory", 2),
    ("kyc", 2), ("aml", 2), ("train", 1), ("policy", 1), ("audit", 1),
]

def _score_regulation(text: str) -> dict:
    lower = text.lower()
    score = min(sum(w for kw, w in _SCORING_RULES if kw in lower), 10)
    if score >= 8:
        risk, sev = "CRITICAL", "Critical"
    elif score >= 5:
        risk, sev = "HIGH", "High"
    elif score >= 3:
        risk, sev = "MEDIUM", "Medium"
    else:
        risk, sev = "LOW", "Low"
    return {"risk_level": risk, "severity": sev}

# ─── Static Fallback Templates ────────────────────────────────────────────────

def _static_fallback_maps(services: list, departments: list) -> list:
    maps = [
        {"clause_ref": "RBI-2026-002", "title": "Update KYC Verification Workflow",
         "description": "Reconfigure CBS to trigger annual KYC review for high-risk segment.",
         "owner": "Compliance Team", "severity": "High", "status": "In Progress",
         "deadline": date.today() + timedelta(days=14), "department": "Legal Team"},
        {"clause_ref": "RBI-2026-001", "title": "Re-paper FLDG contracts",
         "description": "Amend FLDG schedules with all LSP partners to cap at 5%.",
         "owner": "Legal Team", "severity": "High", "status": "Pending",
         "deadline": date.today() + timedelta(days=29), "department": "Legal Team"},
        {"clause_ref": "RBI-2026-001", "title": "Stand up DLA quarterly reporting",
         "description": "Build pipeline to RBI portal for DLA metrics.",
         "owner": "IT Team", "severity": "Medium", "status": "In Progress",
         "deadline": date.today() + timedelta(days=39), "department": "IT Team"},
        {"clause_ref": "CERT-2026-006", "title": "Patch Java middleware CVE-2026-3344",
         "description": "Roll emergency patch across core banking nodes.",
         "owner": "Cybersecurity Team", "severity": "Critical", "status": "In Progress",
         "deadline": date.today() + timedelta(days=6), "department": "Cybersecurity Team"},
        {"clause_ref": "SEBI-2026-003", "title": "Update materiality policy",
         "description": "Refresh disclosure thresholds per SEBI LODR amendment.",
         "owner": "Compliance Team", "severity": "Medium", "status": "Awaiting Validation",
         "deadline": date.today() + timedelta(days=14), "department": "Compliance Team"},
        {"clause_ref": "NPCI-2026-005", "title": "UPI velocity rules rollout",
         "description": "Deploy new velocity rules in payments switch.",
         "owner": "IT Team", "severity": "Medium", "status": "Pending",
         "deadline": date.today() + timedelta(days=29), "department": "IT Team"},
        {"clause_ref": "SEBI-2026-004", "title": "Train insider trading designated persons",
         "description": "Conduct mandatory training on updated windows.",
         "owner": "Legal Team", "severity": "Low", "status": "Completed",
         "deadline": date.today() + timedelta(days=8), "department": "HR Team"},
        {"clause_ref": "INT-2026-007", "title": "Refresh vendor risk templates",
         "description": "Push new vendor onboarding templates live.",
         "owner": "Audit Team", "severity": "Low", "status": "Pending",
         "deadline": date.today() + timedelta(days=21), "department": "Audit Team"},
        {"clause_ref": "RBI-2026-002", "title": "Configure V-CIP as default",
         "description": "Set V-CIP as preferred onboarding journey.",
         "owner": "Operations Team", "severity": "High", "status": "Pending",
         "deadline": date.today() + timedelta(days=24), "department": "Operations Team"},
    ]
    if "UPI" in services:
        maps.append({"clause_ref": "NPCI-2026-005", "title": "Deploy NPCI UPI Velocity & Fraud Rules",
                     "description": "Configure daily limits and alert thresholds per NPCI guidelines.",
                     "owner": "IT Team", "severity": "High", "status": "Pending",
                     "deadline": date.today() + timedelta(days=24), "department": "IT Team"})
    if "KYC Services" in services:
        maps.append({"clause_ref": "RBI-2026-002", "title": "Implement RBI V-CIP Compliance Journey",
                     "description": "Upgrade remote onboarding to enforce video verification and geo-tagging.",
                     "owner": "Operations Team", "severity": "Critical", "status": "In Progress",
                     "deadline": date.today() + timedelta(days=9), "department": "Operations Team"})
    if departments:
        filtered = [
            m for m in maps
            if m["department"] in departments or m["department"].replace(" Team", "") in departments
        ]
        if filtered:
            maps = filtered
    return maps

# ─── ChromaDB-Powered MAP Seeding ─────────────────────────────────────────────

def _fetch_chromadb_regulations() -> list[dict]:
    try:
        import chromadb
        client = chromadb.CloudClient(
            api_key=_CHROMA_API_KEY,
            tenant=_CHROMA_TENANT,
            database=_CHROMA_DB,
        )
        collection = client.get_or_create_collection(_CHROMA_COLLECTION)
        results = collection.get(include=["documents", "metadatas"])
        groups = _group_by_regulation(results["ids"], results["documents"], results["metadatas"])
        return [
            {
                "regulation_id": reg_id,
                "source": group.get("source") or reg_id,
                "text": _clean_text(" ".join(group["chunks"])),
            }
            for reg_id, group in groups.items()
            if group.get("chunks")
        ]
    except Exception:
        return []


# ─── ChromaDB-Powered MAP Seeding ───────────────────────────────────────────

def _resolve_regulation_id(clause_ref: str, db: Session) -> Optional[str]:
    """
    Try to resolve a clause_ref string (like 'RBI-2026-001' or a ChromaDB key)
    to an actual Regulation.id UUID in the DB. Falls back to the original string.
    """
    if not clause_ref:
        return clause_ref
    from app.models.models import Regulation as RegModel
    # Try direct source prefix match (e.g. 'RBI', 'SEBI', 'NPCI', 'CERT')
    source_prefix = clause_ref.split("-")[0].upper() if "-" in clause_ref else clause_ref[:5].upper()
    reg = db.query(RegModel).filter(RegModel.source.ilike(f"%{source_prefix}%")).order_by(RegModel.date.desc()).first()
    if reg:
        return str(reg.id)
    return clause_ref


def seed_org_default_maps(org_id, user_id: UUID, db: Session, copilot_mode: str = "beginner"):
    """
    Seed MAPs once per organization per copilot_mode. All maps are attributed to user_id
    (the first admin who triggers the seed) but are visible org-wide.

    Deduplicates by normalized title before inserting to prevent duplicates across calls.
    Falls back to static templates if ChromaDB is unreachable or returns no content.
    """
    import logging
    logger = logging.getLogger("uvicorn.error")

    user = db.query(User).filter(User.id == user_id).first()
    services = ["Retail Banking", "UPI", "KYC Services"]
    departments = ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"]

    if user and user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org:
            services = org.services or services
            departments = org.departments or departments

    # ── Collect existing MAP titles for this org/copilot_mode to prevent duplication ──
    from app.models.models import User as UserModel
    org_user_ids = [u.id for u in db.query(UserModel).filter(UserModel.organization_id == org_id).all()] if org_id else [user_id]
    existing_titles: set = set(
        t[0].lower().strip()
        for t in db.query(Map.title).filter(
            Map.user_id.in_(org_user_ids),
            Map.copilot_mode == copilot_mode
        ).all()
        if t[0]
    )

    chroma_items = []
    # Track titles seen in this seeding batch to avoid in-batch duplicates
    seen_titles: set = set(existing_titles)

    for regulation in _fetch_chromadb_regulations():
        text = regulation.get("text", "")
        if not text or not _is_meaningful(text):
            continue

        try:
            tasks = generate_maps_from_regulation(text)
        except Exception as exc:
            logger.warning(f"Offline map generation failed: {exc}. Falling back to rule-based generator.")
            tasks = _generate_maps(text)

        # Resolve clause_ref to an actual Regulation.id in DB if possible
        resolved_clause_ref = _resolve_regulation_id(regulation.get("regulation_id"), db)

        for task in tasks:
            title = task[:120].strip()
            if not title:
                continue
            norm = title.lower()
            # Skip duplicates (already in DB or already in this batch)
            if norm in seen_titles:
                continue
            seen_titles.add(norm)

            department = _assign_department(task)
            if departments:
                dept_name = department.replace(" Team", "")
                if dept_name not in departments and department not in departments:
                    continue

            chroma_items.append({
                "clause_ref": resolved_clause_ref,
                "title": title,
                "description": task,
                "owner": department,
                "severity": "High" if any(k in task.lower() for k in ["critical", "mandatory", "required", "urgent"]) else "Medium",
                "status": "Pending",
                "deadline": _parse_deadline_to_date(_extract_deadline(task)),
                "department": department,
            })

    if not chroma_items:
        logger.warning("ChromaDB returned no usable MAP source. Falling back to static templates.")
        fallback = _static_fallback_maps(services, departments)
        for m in fallback:
            title = m.get("title", "").strip()
            if not title:
                continue
            norm = title.lower()
            if norm in seen_titles:
                continue
            seen_titles.add(norm)
            chroma_items.append(m)

    if not chroma_items:
        return

    db_items = []
    for m in chroma_items:
        db_items.append(Map(
            user_id=user_id,
            clause_ref=m.get("clause_ref"),
            title=m.get("title"),
            description=m.get("description"),
            owner=m.get("owner"),
            severity=m.get("severity", "Medium"),
            status=m.get("status", "Pending"),
            deadline=m.get("deadline"),
            copilot_mode=copilot_mode,
            assigned_department=m.get("department"),
        ))

    db.add_all(db_items)
    db.commit()
    logger.info(f"Seeded {len(db_items)} MAPs for org {org_id} (copilot_mode={copilot_mode})")


def seed_user_default_maps(user_id: UUID, db: Session, copilot_mode: str = "beginner"):
    """
    Wrapper kept for backward compat. Delegates to seed_org_default_maps.
    """
    seed_org_default_maps(org_id=None, user_id=user_id, db=db, copilot_mode=copilot_mode)


@router.get("", response_model=List[MapResponse])
def get_user_maps(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    org_id = current_user.get("organization_id")
    utype = current_user.get("user_type", "admin")
    dept = current_user.get("department")
    copilot_mode = current_user.get("copilot_mode", "beginner")

    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        # ── Guard: seed once per ORG, not per user ─────────────────────────────
        # Check if ANY user in the org already has maps; if not, seed once.
        existing_org_maps = db.query(Map).filter(
            Map.user_id.in_(org_user_ids),
            Map.copilot_mode == copilot_mode
        ).first()
        if not existing_org_maps:
            seed_org_default_maps(org_id=org_id, user_id=user_id, db=db, copilot_mode=copilot_mode)

        q = db.query(Map).filter(Map.user_id.in_(org_user_ids), Map.copilot_mode == copilot_mode)
        if utype == "department_officer":
            q = q.filter(Map.assigned_department == dept)
        return q.order_by(Map.created_at.desc()).all()
    else:
        existing = db.query(Map).filter(Map.user_id == user_id, Map.copilot_mode == copilot_mode).first()
        if not existing:
            seed_user_default_maps(user_id, db, copilot_mode=copilot_mode)
        return db.query(Map).filter(Map.user_id == user_id, Map.copilot_mode == copilot_mode).order_by(Map.created_at.desc()).all()


@router.post("", response_model=MapResponse)
def create_map(
    schema: MapCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    copilot_mode = current_user.get("copilot_mode", "beginner")
    utype = current_user.get("user_type", "admin")
    dept = current_user.get("department")
    
    assigned_dept = schema.assigned_department
    if utype == "department_officer":
        assigned_dept = dept
        
    new_map = Map(
        user_id=user_id,
        comparison_id=schema.comparison_id,
        clause_ref=schema.clause_ref,
        title=schema.title,
        description=schema.description,
        owner=schema.owner,
        severity=schema.severity,
        status="Pending",
        deadline=schema.deadline,
        copilot_mode=copilot_mode,
        assigned_department=assigned_dept
    )
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    
    return new_map

@router.patch("/{map_id}/status", response_model=MapResponse)
def update_map_status(
    map_id: UUID,
    schema: MapStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    utype = current_user.get("user_type", "admin")
    if utype == "department_officer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence required. Use POST /maps/{id}/evidence with requested_status."
        )
        
    user_id = current_user.get("id")
    org_id = current_user.get("organization_id")
    target_status = schema.status
    
    if target_status not in COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: '{target_status}'. Allowed: {COLUMNS}"
        )
        
    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        db_map = db.query(Map).filter(Map.id == map_id, Map.user_id.in_(org_user_ids)).first()
    else:
        db_map = db.query(Map).filter(Map.id == map_id, Map.user_id == user_id).first()
        
    if not db_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MAP not found"
        )
        
    if db_map.status == "Completed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workflow Locked: Completed MAPs cannot be modified."
        )
        
    if not _can_transition_status(db_map.status, target_status):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Workflow Violation: Cannot transition status directly from '{db_map.status}' to '{target_status}'. Sequential flow required."
        )
        
    db_map.status = target_status
    db.commit()
    db.refresh(db_map)
    
    return db_map


# ─── Evidence Endpoints ────────────────────────────────────────────────────────

@router.post("/{map_id}/evidence", response_model=EvidenceResponse)
def upload_map_evidence(
    map_id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    requested_status: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    utype = current_user.get("user_type", "admin")
    user_dept = current_user.get("department")
    org_id = current_user.get("organization_id")
    
    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        m = db.query(Map).filter(Map.id == map_id, Map.user_id.in_(org_user_ids)).first()
    else:
        m = db.query(Map).filter(Map.id == map_id, Map.user_id == user_id).first()
        
    if not m:
        raise HTTPException(status_code=404, detail="MAP not found.")
        
    if utype == "department_officer":
        require_dept_officer_scope(map_id, current_user, db)
        
    if requested_status not in COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: '{requested_status}'. Allowed: {COLUMNS}"
        )
        
    if m.status == "Completed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workflow Locked: Completed MAPs cannot be modified."
        )
        
    if not _can_transition_status(m.status, requested_status, allow_evidence_submission=True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workflow Violation: Cannot transition status directly from '{m.status}' to '{requested_status}'. Sequential flow required."
        )
    
    # Capture the MAP's current status before transition (for auto-fail revert)
    previous_status = m.status
    
    evidence_id = uuid.uuid4()
    ext = os.path.splitext(file.filename)[1] or ".pdf"
    filename = f"evidence-{evidence_id}{ext}"
    file_path = os.path.join(EVIDENCE_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
        
    db_ev = Evidence(
        id=evidence_id,
        map_id=map_id,
        user_id=user_id,
        filename=file.filename,
        file_path=f"/storage/evidence/{filename}",
        validation_status="Pending",
        department=user_dept,
        organization_id=org_id,
        requested_status=requested_status,
        previous_status=previous_status,
        rejection_reason=None
    )
    db.add(db_ev)
    
    m.status = "Awaiting Validation"
    db.commit()
    db.refresh(db_ev)
    db.refresh(m)
    
    # Trigger background compliance verification task
    background_tasks.add_task(verify_evidence_background, db_ev.id, db)
    
    return db_ev


@router.get("/{map_id}/evidence", response_model=List[EvidenceResponse])
def get_map_evidence(
    map_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    org_id = current_user.get("organization_id")
    utype = current_user.get("user_type", "admin")
    
    if org_id:
        org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == org_id).all()]
        m = db.query(Map).filter(Map.id == map_id, Map.user_id.in_(org_user_ids)).first()
    else:
        m = db.query(Map).filter(Map.id == map_id, Map.user_id == user_id).first()
        
    if not m:
        raise HTTPException(status_code=404, detail="MAP not found.")
        
    if utype == "department_officer":
        require_dept_officer_scope(map_id, current_user, db)
        
    return db.query(Evidence).filter(Evidence.map_id == map_id).order_by(Evidence.created_at.desc()).all()


@router.get("/evidence/{evidence_id}/download")
def download_evidence(
    evidence_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence record not found.")
        
    utype = current_user.get("user_type", "admin")
    dept = current_user.get("department")
    org_id = current_user.get("organization_id")
    
    if org_id and evidence.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied: Evidence belongs to a different organization.")
        
    if utype == "department_officer" and evidence.department != dept:
        raise HTTPException(status_code=403, detail="Access denied: Evidence belongs to a different department.")
        
    filename = os.path.basename(evidence.file_path)
    file_path = os.path.join(EVIDENCE_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical evidence file not found.")
        
    return FileResponse(
        path=file_path,
        filename=evidence.filename,
        media_type="application/octet-stream"
    )


# ─── Evidence Review (Admin Only) ──────────────────────────────────────────

@router.patch("/evidence/{evidence_id}/review", response_model=EvidenceResponse)
def review_evidence(
    evidence_id: UUID,
    schema: EvidenceReviewRequest,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found.")
        
    admin_org_id = current_user.get("organization_id")
    if admin_org_id and evidence.organization_id != admin_org_id:
        raise HTTPException(status_code=403, detail="Not authorized to review evidence from another organization.")
        
    map_task = db.query(Map).filter(Map.id == evidence.map_id).first()
    if not map_task:
        raise HTTPException(status_code=404, detail="Associated MAP not found.")
        
    if schema.status == "Passed":
        evidence.validation_status = "Passed"
        evidence.rejection_reason = None
        
        target_status = evidence.requested_status
        if target_status not in COLUMNS:
            raise HTTPException(status_code=400, detail=f"Invalid target status: '{target_status}'")
            
        map_task.status = target_status
    elif schema.status == "Failed":
        evidence.validation_status = "Failed"
        evidence.rejection_reason = schema.rejection_reason or "Evidence did not satisfy compliance requirements."
        
        map_task.status = evidence.previous_status
    else:
        raise HTTPException(status_code=400, detail="Invalid review status. Must be 'Passed' or 'Failed'.")
        
    db.commit()
    db.refresh(evidence)
    db.refresh(map_task)
    
    return evidence


@router.get("/evidence/all", response_model=List[EvidenceResponse])
def get_all_evidences(
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    admin_org_id = current_user.get("organization_id")
    if not admin_org_id:
        raise HTTPException(status_code=400, detail="Admin has no organization associated.")
        
    q = db.query(Evidence).filter(Evidence.organization_id == admin_org_id)
    if status:
        q = q.filter(Evidence.validation_status == status)
        
    return q.order_by(Evidence.created_at.desc()).all()
