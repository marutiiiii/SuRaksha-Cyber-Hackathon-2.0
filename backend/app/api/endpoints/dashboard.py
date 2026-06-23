from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from typing import Dict, Any, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Map, Regulation, Finding, ImpactAnalysis, Document
from app.schemas.schemas import DashboardOverviewResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard KPIs"])

DEPARTMENTS = ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"]

@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.get("id")
    today = date.today()
    copilot_mode = current_user.get("copilot_mode", "beginner")
    
    from sqlalchemy.orm import joinedload
    
    # Real database queries for MAPs
    all_maps = db.query(Map).options(joinedload(Map.evidences)).filter(
        Map.user_id == user_id,
        Map.copilot_mode == copilot_mode
    ).all()
    total = len(all_maps)
    completed = len([m for m in all_maps if m.status == "Completed"])
    
    # Calculate overdue: status != Completed and deadline < today
    overdue = 0
    for m in all_maps:
        if m.status != "Completed" and m.deadline and m.deadline < today:
            overdue += 1
            
    score = round((completed / total) * 100) if total > 0 else 0
    
    # Calculate department readiness scores dynamically
    dept_stats = {}
    for d in DEPARTMENTS:
        dept_stats[d] = {"total": 0, "completed": 0, "missing_evidence": 0}
        
    for m in all_maps:
        # Normalize owner to department
        owner = m.owner or ""
        matched_dept = "Compliance"
        for d in DEPARTMENTS:
            if d.lower() in owner.lower():
                matched_dept = d
                break
        dept_stats[matched_dept]["total"] += 1
        if m.status == "Completed":
            dept_stats[matched_dept]["completed"] += 1
        else:
            # Check missing evidence
            passed_ev = [ev for ev in m.evidences if ev.validation_status == "Passed"]
            if not passed_ev:
                dept_stats[matched_dept]["missing_evidence"] += 1
            
    departments = []
    # Dynamically compute findings counts from MAP tasks to align with real data
    findings_heatmap = {}
    for d in DEPARTMENTS:
        # Filter maps for this department
        dept_maps = []
        for m in all_maps:
            owner = m.owner or ""
            matched_d = "Compliance"
            for x_d in DEPARTMENTS:
                if x_d.lower() in owner.lower():
                    matched_d = x_d
                    break
            if matched_d == d:
                dept_maps.append(m)

        open_c = len([m for m in dept_maps if m.status != "Completed"])
        closed_c = len([m for m in dept_maps if m.status == "Completed"])
        critical_c = len([m for m in dept_maps if m.status != "Completed" and m.severity in ["Critical", "High"]])
        
        risk_rating = "Low"
        if critical_c > 0:
            risk_rating = "High"
        elif open_c > 0:
            risk_rating = "Medium"

        findings_heatmap[d] = {
            "open": open_c,
            "critical": critical_c,
            "closed": closed_c,
            "risk": risk_rating
        }
    
    for d in DEPARTMENTS:
        d_total = dept_stats[d]["total"]
        d_completed = dept_stats[d]["completed"]
        d_score = round((d_completed / d_total) * 100) if d_total > 0 else 0
        
        f_info = findings_heatmap.get(d, {"open": 0, "critical": 0, "closed": 0, "risk": "Low"})
        
        departments.append({
            "department": d,
            "readinessScore": d_score,
            "openFindings": f_info["open"],
            "criticalFindings": f_info["critical"],
            "closedFindings": f_info["closed"],
            "missingEvidence": dept_stats[d]["missing_evidence"],
            "risk": f_info["risk"]
        })
        
    import datetime

    # 1. Dynamic Recent Activity from DB (Recent Regulations / Document Uploads)
    recent_activity = []
    try:
        if copilot_mode == "beginner":
            recent_regs = db.query(Regulation).order_by(Regulation.created_at.desc()).limit(3).all()
            for reg in recent_regs:
                recent_activity.append({
                    "id": str(reg.id),
                    "title": reg.title,
                    "source": reg.source,
                    "changeType": "New" if "guideline" in reg.title.lower() or "direction" in reg.title.lower() else "Updated",
                    "risk": "High" if reg.source in ["RBI", "SEBI"] else "Medium",
                    "status": "Active",
                    "time": "Recent"
                })
        else:
            recent_docs = db.query(Document).filter(
                Document.user_id == user_id,
                Document.copilot_mode == "expert"
            ).order_by(Document.created_at.desc()).limit(3).all()
            for doc in recent_docs:
                recent_activity.append({
                    "id": str(doc.id),
                    "title": doc.title,
                    "source": doc.source or "Upload",
                    "changeType": "Uploaded",
                    "risk": "Medium",
                    "status": "Active",
                    "time": "Recent"
                })
    except Exception as e:
        pass

    # 2. Dynamic Insights
    open_maps_count = len([m for m in all_maps if m.status != "Completed"])
    critical_maps_count = len([m for m in all_maps if m.status != "Completed" and m.severity == "Critical"])
    high_maps_count = len([m for m in all_maps if m.status != "Completed" and m.severity == "High"])

    dept_open_counts = {d: 0 for d in DEPARTMENTS}
    for m in all_maps:
        if m.status != "Completed":
            owner = m.owner or ""
            matched_dept = "Compliance"
            for d in DEPARTMENTS:
                if d.lower() in owner.lower():
                    matched_dept = d
                    break
            dept_open_counts[matched_dept] += 1

    highest_risk_dept = max(dept_open_counts, key=dept_open_counts.get) if any(dept_open_counts.values()) else "Operations"
    highest_risk_count = dept_open_counts[highest_risk_dept]

    insights = [
        {
            "title": f"{open_maps_count} MAP tasks require attention" if open_maps_count > 0 else "All MAP tasks are up to date",
            "description": f"Focus on {critical_maps_count} critical and {high_maps_count} high-severity action items pending completion." if open_maps_count > 0 else "All action items have been completed. Great job!",
            "severity": "High" if critical_maps_count > 0 or high_maps_count > 0 else "Medium" if open_maps_count > 0 else "Low",
            "trend": {"value": open_maps_count, "suffix": " tasks"}
        },
        {
            "title": f"Compliance readiness stands at {score}%",
            "description": f"Calculated based on {completed} completed tasks out of {total} total mapped across active circulars." if total > 0 else "No MAP tasks mapped yet. Upload a document to start.",
            "severity": "Low" if score >= 80 else "Medium" if score >= 50 else "High",
            "trend": {"value": score - 80 if score >= 80 else score, "suffix": "%"}
        },
        {
            "title": f"{highest_risk_dept} has highest risk exposure" if highest_risk_count > 0 else "No department is at high risk",
            "description": f"{highest_risk_dept} department has {highest_risk_count} open compliance action items requiring resource allocation." if highest_risk_count > 0 else "All departments are performing excellently.",
            "severity": "High" if highest_risk_count > 3 else "Medium" if highest_risk_count > 0 else "Low",
            "trend": {"value": highest_risk_count, "suffix": " open", "inverse": True}
        }
    ]

    try:
        latest_impact = db.query(ImpactAnalysis).filter(
            ImpactAnalysis.user_id == user_id
        ).order_by(ImpactAnalysis.created_at.desc()).first()
        if latest_impact and latest_impact.matrix_json:
            highest_impact_dept = "Compliance"
            highest_impact_score = 0
            for item in latest_impact.matrix_json:
                if item["impact"] > highest_impact_score:
                    highest_impact_score = item["impact"]
                    highest_impact_dept = item["department"]
            
            if highest_impact_score > 0:
                insights[2] = {
                    "title": f"AI Risk Exposure: {highest_impact_dept} (Score: {highest_impact_score})",
                    "description": f"AI impact analysis identified {highest_impact_dept} as the most impacted department under recent circular changes.",
                    "severity": "High" if highest_impact_score >= 75 else "Medium" if highest_impact_score >= 45 else "Low",
                    "trend": {"value": highest_impact_score, "suffix": " impact", "inverse": True}
                }
    except Exception as e:
        pass

    # 3. Dynamic Compliance Trend (6-month timeline)
    compliance_trend = []
    current_date = datetime.date.today()
    for i in range(5, -1, -1):
        m = current_date.month - i
        y = current_date.year
        while m <= 0:
            m += 12
            y -= 1
        m_name = datetime.date(y, m, 1).strftime("%b")
        if m == 12:
            next_m_first = datetime.date(y + 1, 1, 1)
        else:
            next_m_first = datetime.date(y, m + 1, 1)
            
        maps_before = [m for m in all_maps if m.created_at and m.created_at.date() < next_m_first]
        total_before = len(maps_before)
        completed_before = len([
            m for m in maps_before 
            if m.status == "Completed" and m.created_at.date() < next_m_first
        ])
        month_score = round((completed_before / total_before) * 100) if total_before > 0 else 0
        compliance_trend.append({"month": m_name, "score": month_score})

    # 4. Dynamic MAP Progress (4-week breakdown)
    completed_count = len([m for m in all_maps if m.status == "Completed"])
    in_progress_count = len([m for m in all_maps if m.status == "In Progress"])
    open_count = len([m for m in all_maps if m.status == "Open"])

    today_dt = datetime.datetime.now(datetime.timezone.utc)
    w1_maps, w2_maps, w3_maps, w4_maps = [], [], [], []
    for m in all_maps:
        m_created = m.created_at or today_dt
        if isinstance(m_created, datetime.date) and not isinstance(m_created, datetime.datetime):
            m_created = datetime.datetime.combine(m_created, datetime.time.min, tzinfo=datetime.timezone.utc)
        elif isinstance(m_created, datetime.datetime) and m_created.tzinfo is None:
            m_created = m_created.replace(tzinfo=datetime.timezone.utc)
        age_days = (today_dt - m_created).days
        if age_days >= 22:
            w1_maps.append(m)
        elif age_days >= 15:
            w2_maps.append(m)
        elif age_days >= 8:
            w3_maps.append(m)
        else:
            w4_maps.append(m)
            
    w1_completed = len([m for m in w1_maps if m.status == "Completed"])
    w1_total = len(w1_maps)
    w1_in_progress = len([m for m in w1_maps if m.status == "In Progress"])
    w1_pending = w1_total - w1_completed - w1_in_progress

    w2_cum = w1_maps + w2_maps
    w2_completed = len([m for m in w2_cum if m.status == "Completed"])
    w2_total = len(w2_cum)
    w2_in_progress = len([m for m in w2_cum if m.status == "In Progress"])
    w2_pending = w2_total - w2_completed - w2_in_progress

    w3_cum = w1_maps + w2_maps + w3_maps
    w3_completed = len([m for m in w3_cum if m.status == "Completed"])
    w3_total = len(w3_cum)
    w3_in_progress = len([m for m in w3_cum if m.status == "In Progress"])
    w3_pending = w3_total - w3_completed - w3_in_progress

    w4_completed = completed_count
    w4_in_progress = in_progress_count
    w4_pending = open_count

    map_progress = [
        {"week": "W1", "completed": w1_completed, "inProgress": w1_in_progress, "pending": w1_pending},
        {"week": "W2", "completed": w2_completed, "inProgress": w2_in_progress, "pending": w2_pending},
        {"week": "W3", "completed": w3_completed, "inProgress": w3_in_progress, "pending": w3_pending},
        {"week": "W4", "completed": w4_completed, "inProgress": w4_in_progress, "pending": w4_pending}
    ]
    
    return {
        "score": score,
        "total": total,
        "completed": completed,
        "overdue": overdue,
        "departments": departments,
        "recentActivity": recent_activity,
        "insights": insights,
        "complianceTrend": compliance_trend,
        "mapProgress": map_progress
    }
