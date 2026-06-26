import os
import re
import uuid
from datetime import datetime, date, timedelta
from fpdf import FPDF
from sqlalchemy.orm import Session
from app.models.models import User, Organization, Role, Document, Map, Evidence, Comparison, ImpactAnalysis, Clause

# Normal default column widths mapping
DEFAULT_COL_WIDTHS = {
    ("regulation", "regulatory authority", "impact level", "status"): [55, 35, 45, 45],
    ("department", "compliance %", "open maps", "overdue maps", "risk level"): [45, 30, 35, 35, 35],
    ("action required", "owner", "target date", "status"): [65, 40, 45, 30],
    ("regulation id", "regulation", "regulatory authority", "status"): [25, 85, 40, 30],
    ("finding id", "regulation", "finding description", "severity", "status"): [25, 35, 70, 25, 25],
    ("control id", "control description", "owner", "implementation status", "validation status"): [25, 65, 35, 30, 25],
    ("map id", "action required", "owner", "deadline", "completion status"): [25, 65, 35, 30, 25],
    ("map id", "action required", "priority", "owner", "deadline", "status"): [25, 60, 20, 30, 25, 20],
    ("evidence id", "evidence type", "associated regulation", "submitted by", "submission date"): [25, 30, 60, 35, 30],
    ("evidence id", "evidence type", "submitted by", "submission date", "validation status"): [25, 30, 45, 45, 35],
    ("evidence id", "validation status", "validation remarks"): [25, 35, 120],
    ("exception id", "description", "impact", "owner", "resolution status"): [25, 65, 35, 30, 25],
    ("observation id", "description", "owner", "target closure date", "status"): [25, 65, 35, 30, 25],
    ("regulation", "clause", "map", "evidence id", "validation status", "closure status"): [35, 25, 50, 25, 25, 20],
    ("gap identified", "recommended action", "owner", "target date", "status"): [45, 55, 30, 25, 25],
    ("clause id", "description", "severity"): [35, 115, 30],
    ("clause id", "previous requirement", "updated requirement", "severity"): [30, 60, 60, 30],
    ("clause id", "description", "business impact"): [35, 85, 60],
    ("risk level", "count"): [90, 90],
    ("department", "open risks", "critical risks", "overdue maps", "risk rating"): [45, 30, 35, 35, 35],
    ("risk id", "description", "category", "impact", "probability", "severity", "owner", "status"): [20, 45, 25, 20, 20, 15, 15, 20],
    ("risk area", "probability", "impact", "risk rating"): [50, 40, 40, 50],
    ("risk id", "mitigation action", "owner", "target date", "current status"): [25, 75, 30, 25, 25],
    ("issue", "escalated to", "reason", "status"): [55, 45, 45, 35]
}

def clean_pdf_text(text) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    if not text:
        return ""
    replacements = {
        "\u2014": "-", "\u2013": "-", "\u201c": '"', "\u201d": '"',
        "\u2018": "'", "\u2019": "'", "\u2022": "*", "\u20ac": "EUR",
        "\u2122": "TM", "\u00ae": "(R)", "\u00a9": "(C)", "\u201f": '"',
        "\u2010": "-", "\u2011": "-", "\u2012": "-",
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
    return text.encode("latin-1", errors="replace").decode("latin-1")

class MarkdownPDF(FPDF):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.set_margins(15, 15, 15)
        self.set_auto_page_break(auto=True, margin=15)
        
    def header(self):
        # Header banner styling
        self.set_font("helvetica", "I", 8)
        self.set_text_color(100, 116, 139) # Slate 500
        self.cell(0, 5, "REGUFLOW AI COMPLIANCE ENGINE", align="R", ln=1)
        self.ln(2)
        
    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 10, f"Page {self.page_no()}", align="C", ln=0)
        self.cell(0, 10, "STRICTLY CONFIDENTIAL", align="R", ln=0)

    def draw_checkbox(self, checked=False):
        x = self.get_x()
        y = self.get_y()
        self.set_draw_color(15, 23, 42)
        self.set_line_width(0.3)
        self.rect(x + 1, y + 1, 3.5, 3.5)
        if checked:
            # Draw checkmark inside
            self.line(x + 1.5, y + 2.75, x + 2.5, y + 3.75)
            self.line(x + 2.5, y + 3.75, x + 4, y + 1.75)
        self.set_xy(x + 6, y)

    def render_markdown(self, markdown_text: str):
        self.add_page()
        
        # Border
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.5)
        
        lines = markdown_text.split("\n")
        in_table = False
        table_headers = []
        table_rows = []
        
        i = 0
        while i < len(lines):
            line = lines[i].rstrip()
            try:
                # Check table block
                if line.startswith("|"):
                    in_table = True
                    # Parse row
                    parts = [p.strip() for p in line.split("|")[1:-1]]
                    # Check if it's separator row like | --- | --- |
                    is_separator = all(re.match(r"^[-:\s]+$", p) for p in parts)
                    if is_separator:
                        i += 1
                        continue
                    
                    if not table_headers:
                        table_headers = parts
                    else:
                        table_rows.append(parts)
                    i += 1
                    continue
                else:
                    if in_table:
                        # Table ended, render it
                        self.render_table(table_headers, table_rows)
                        table_headers = []
                        table_rows = []
                        in_table = False
                    
                # Handle standard Markdown lines
                stripped = line.strip()
                
                # Headings
                if stripped.startswith("# "):
                    self.ln(3)
                    self.set_font("helvetica", "B", 15)
                    self.set_text_color(15, 23, 42)
                    # Background banner for main title
                    self.set_fill_color(241, 245, 249) # Slate 100
                    self.cell(0, 10, f"  {clean_pdf_text(stripped[2:])}", fill=True)
                    self.ln(10)
                elif stripped.startswith("## "):
                    self.ln(2)
                    self.set_font("helvetica", "B", 11.5)
                    self.set_text_color(15, 23, 42)
                    self.cell(0, 7, clean_pdf_text(stripped[3:]))
                    self.ln(7.5)
                elif stripped.startswith("### "):
                    self.ln(1)
                    self.set_font("helvetica", "B", 9.5)
                    self.set_text_color(71, 85, 105)
                    self.cell(0, 5, clean_pdf_text(stripped[4:]))
                    self.ln(5.5)
                # Horizontal rule
                elif stripped == "---":
                    # Replace divider lines with a tiny vertical spacer
                    self.ln(1.5)

                # Metadata List / bullet bold key-value
                elif stripped.startswith("* ") and ":" in stripped:
                    self.set_font("helvetica", "", 9.0)
                    self.set_text_color(15, 23, 42)
                    # Parse Key: Value
                    parts = stripped[2:].split(":", 1)
                    key = parts[0].strip()
                    val = parts[1].strip()
                    
                    self.set_font("helvetica", "B", 9.0)
                    self.write(4, f"* {clean_pdf_text(key)}: ")
                    self.set_font("helvetica", "", 9.0)
                    self.write(4, clean_pdf_text(val))
                    self.ln(4.5)
                # Bullet/Numbered list items
                elif stripped.startswith("* ") or stripped.startswith("- ") or re.match(r"^\d+\.\s+", stripped):
                    is_num = re.match(r"^(\d+)\.\s+", stripped)
                    prefix = ""
                    content = ""
                    if is_num:
                        num = is_num.group(1)
                        prefix = f"{num}. "
                        content = stripped[len(prefix):]
                    else:
                        prefix = "- "
                        content = stripped[2:]
                    
                    self.set_font("helvetica", "", 9.0)
                    self.set_text_color(15, 23, 42)
                    
                    # Check if content has checkbox
                    has_check = content.strip().startswith("☐") or content.strip().startswith("[ ]")
                    has_checked = content.strip().startswith("☒") or content.strip().startswith("[X]") or content.strip().startswith("[x]")
                    
                    if has_check or has_checked:
                        self.set_x(self.l_margin)
                        self.cell(5, 4, prefix)
                        self.draw_checkbox(checked=has_checked)
                        
                        old_margin = self.l_margin
                        self.set_left_margin(old_margin + 10)
                        rem_text = content.strip()[4:] if (content.strip().startswith("[X]") or content.strip().startswith("[ ]")) else content.strip()[2:]
                        self.multi_cell(0, 4, clean_pdf_text(rem_text))
                        self.set_left_margin(old_margin)
                        self.set_x(self.l_margin)
                    else:
                        self.set_x(self.l_margin)
                        self.cell(5, 4, prefix)
                        
                        old_margin = self.l_margin
                        self.set_left_margin(old_margin + 5)
                        self.multi_cell(0, 4, clean_pdf_text(content))
                        self.set_left_margin(old_margin)
                        self.set_x(self.l_margin)
                # Checkbox block on a single line
                elif stripped.startswith("☐") or stripped.startswith("[ ]") or stripped.startswith("☒") or stripped.startswith("[X]") or stripped.startswith("[x]"):
                    is_checked = stripped.startswith("☒") or stripped.startswith("[X]") or stripped.startswith("[x]")
                    rem_text = stripped[4:] if (stripped.startswith("[X]") or stripped.startswith("[ ]")) else stripped[2:]
                    self.set_font("helvetica", "", 9.0)
                    self.set_text_color(15, 23, 42)
                    
                    self.draw_checkbox(checked=is_checked)
                    old_margin = self.l_margin
                    self.set_left_margin(old_margin + 5)
                    self.multi_cell(0, 4, clean_pdf_text(rem_text))
                    self.set_left_margin(old_margin)
                    self.set_x(self.l_margin)
                # Empty / Space line
                elif not stripped:
                    self.ln(1)
                # Regular text
                else:
                    self.set_font("helvetica", "", 9.0)
                    self.set_text_color(15, 23, 42)
                    self.multi_cell(0, 4.5, clean_pdf_text(stripped))
                    self.set_x(self.l_margin)

            except Exception as e:
                print(f"FAILED on line {i}: '{line}'")
                print(f"pdf state: x={self.get_x()}, y={self.get_y()}, l_margin={self.l_margin}, r_margin={self.r_margin}, w={self.w}")
                raise e
            i += 1
            
        if in_table:
            self.render_table(table_headers, table_rows)


    def render_table(self, headers, rows):
        if not headers:
            return
            
        # Match col widths
        norm_headers = tuple(h.lower().strip() for h in headers)
        col_widths = None
        for k, v in DEFAULT_COL_WIDTHS.items():
            if len(k) == len(norm_headers):
                # Check matching percentage
                match = True
                for idx, item in enumerate(k):
                    if item not in norm_headers[idx] and norm_headers[idx] not in item:
                        match = False
                        break
                if match:
                    col_widths = v
                    break
                    
        if not col_widths:
            # Distribute evenly
            col_widths = [180 / len(headers)] * len(headers)
            
        # Draw header row
        self.set_font("helvetica", "B", 8.5)
        self.set_text_color(255, 255, 255)
        self.set_fill_color(15, 23, 42)
        self.set_draw_color(226, 232, 240)
        
        # Check space
        if self.get_y() + 10 > self.page_break_trigger:
            self.add_page()
            
        x_start = self.get_x()
        y_start = self.get_y()
        
        for idx, h in enumerate(headers):
            w = col_widths[idx]
            self.cell(w, 7, clean_pdf_text(h), border=1, fill=True, align="L")
        self.ln(7)
        
        self.set_font("helvetica", "", 8.0)
        self.set_text_color(15, 23, 42)
        
        for r_idx, row in enumerate(rows):
            # Calculate heights
            max_lines = 1
            for idx, val in enumerate(row):
                w = col_widths[idx]
                lines_height = self.multi_cell(w, 4.5, clean_pdf_text(val), dry_run=True, output="HEIGHT")
                max_lines = max(max_lines, lines_height / 4.5)
                
            row_height = max_lines * 4.5
            
            # Check page break
            if self.get_y() + row_height > self.page_break_trigger:
                self.add_page()
                # Redraw header
                self.set_font("helvetica", "B", 8.5)
                self.set_text_color(255, 255, 255)
                self.set_fill_color(15, 23, 42)
                for idx, h in enumerate(headers):
                    w = col_widths[idx]
                    self.cell(w, 7, clean_pdf_text(h), border=1, fill=True, align="L")
                self.ln(7)
                self.set_font("helvetica", "", 8.0)
                self.set_text_color(15, 23, 42)
                
            # Render cells
            cell_y = self.get_y()
            fill = (r_idx % 2 == 1)
            
            if fill:
                self.set_fill_color(248, 250, 252)
            else:
                self.set_fill_color(255, 255, 255)
                
            for idx, val in enumerate(row):
                w = col_widths[idx]
                cell_x = self.get_x()
                self.rect(cell_x, cell_y, w, row_height, style="FD" if fill else "D")
                self.multi_cell(w, 4.5, clean_pdf_text(val))
                self.set_xy(cell_x + w, cell_y)
                
            self.set_xy(x_start, cell_y + row_height)
        self.ln(4)

def populate_report_template(db: Session, user_id: uuid.UUID, report_type: str, copilot_mode: str) -> tuple[str, str]:
    """
    Reads report template, replaces placeholders using live DB data, 
    renders to PDF and returns (filled_markdown, filename)
    """
    # 1. Fetch DB records
    user = db.query(User).filter(User.id == user_id).first()
    org = db.query(Organization).filter(Organization.id == user.organization_id).first() if user else None
    org_name = org.name if org else "SafeBank Inc."
    user_name = user.full_name if user else "Compliance Officer"
    role = db.query(Role).filter(Role.id == user.role_id).first() if user else None
    designation = role.name if role else "Chief Compliance Officer"
    
    docs = db.query(Document).filter(
        Document.user_id == user_id,
        Document.copilot_mode == copilot_mode
    ).all()
    
    maps = db.query(Map).filter(
        Map.user_id == user_id,
        Map.copilot_mode == copilot_mode
    ).all()
    
    evidences = db.query(Evidence).filter(
        Evidence.user_id == user_id
    ).all()
    
    comparisons = db.query(Comparison).filter(
        Comparison.user_id == user_id,
        Comparison.copilot_mode == copilot_mode
    ).order_by(Comparison.created_at.desc()).all()
    
    latest_comp = comparisons[0] if comparisons else None
    
    impacts = db.query(ImpactAnalysis).filter(
        ImpactAnalysis.user_id == user_id
    ).order_by(ImpactAnalysis.created_at.desc()).all()
    
    latest_impact = impacts[0] if impacts else None
    
    # 2. Compute stats
    total_regs = len(docs)
    total_maps = len(maps)
    completed_maps = len([m for m in maps if m.status == "Completed"])
    pending_maps = len([m for m in maps if m.status != "Completed"])
    
    today = date.today()
    overdue_maps = len([m for m in maps if m.status != "Completed" and m.deadline and m.deadline < today])
    critical_maps = len([m for m in maps if m.status != "Completed" and m.severity in ["Critical", "High"]])
    
    compliance_score = round((completed_maps / total_maps) * 100) if total_maps > 0 else 84
    readiness_score = compliance_score
    
    # Calculate evidence rates
    passed_ev = len([e for e in evidences if e.validation_status == "Passed"])
    total_ev = len(evidences)
    evidence_completion = round((passed_ev / total_ev) * 100) if total_ev > 0 else 80
    evidence_pending = len([e for e in evidences if e.validation_status == "Pending"])
    evidence_rejected = len([e for e in evidences if e.validation_status == "Failed"])
    validation_completion = round(((passed_ev + evidence_rejected) / total_ev) * 100) if total_ev > 0 else 80
    
    # Map report key to template file name
    template_mapping = {
        "executive": "EXECUTIVE REPORT.md",
        "compliance": "COMPLIANCE REPORT.md",
        "snapshot": "COMPLIANCE SNAPSHOT.md",
        "department": "DEPARTMENT REPORT.md",
        "audit": "AUDIT REPORT.md",
        "risk": "RISK REPORT.md",
    }
    
    template_filename = template_mapping.get(report_type, "EXECUTIVE REPORT.md")
    template_path = os.path.join("D:\\SuRaksha Hack26\\Report Template", template_filename)
    
    if not os.path.exists(template_path):
        # Fallback to project root directory
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        template_path = os.path.join(project_root, "Report Template", template_filename)
        if not os.path.exists(template_path):
            # Fallback to backend subdirectory if template folder not found there
            template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Report Template", template_filename)
        
    with open(template_path, "r", encoding="utf-8") as f:
        template_text = f.read()
        
    # Replace metadata block
    report_uuid = uuid.uuid4()
    report_id = f"{report_type[:4].upper()}-{datetime.utcnow().strftime('%Y%m%d')}-{str(report_uuid)[:4].upper()}"
    
    def repl_meta(match):
        key = match.group(1).strip()
        if "Report ID" in key:
            return f"* Report ID: {report_id}"
        elif "Generated On" in key:
            return f"* Generated On: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"
        elif "Reporting Period" in key:
            return f"* Reporting Period: Q2 {datetime.utcnow().year}"
        elif "Organization" in key:
            return f"* Organization: {org_name}"
        elif "Generated By" in key:
            return f"* Generated By: {user_name}"
        elif "Auditor" in key:
            return f"* Auditor: {user_name}"
        elif "Audit Reference" in key:
            return f"* Audit Reference Number: AUD-{str(report_uuid)[:8].upper()}"
        elif "Audit Type" in key:
            return f"* Audit Type: Internal Compliance Review"
        elif "Department Head" in key:
            return f"* Department Head: {user_name}"
        elif "Department" in key:
            return f"* Department: Compliance"
        return match.group(0)

    template_text = re.sub(r"\*\s*(Report ID|Generated On|Reporting Period|Organization|Generated By|Auditor|Audit Reference Number|Audit Type|Department Head|Department)\s*:", repl_meta, template_text)
    
    # Replace specific status strings in checkboxes
    # Overall compliance status check
    # ☐ Compliant / ☐ In Progress / ☐ Requires Attention / ☐ High Risk / ☐ Critical
    comp_chk = "Compliant" if compliance_score >= 90 else "In Progress" if compliance_score >= 75 else "Requires Attention" if compliance_score >= 50 else "High Risk" if compliance_score >= 30 else "Critical"
    
    # Audit status check
    # ☐ Audit Ready / ☐ Partially Ready / ☐ Not Ready / ☐ Requires Remediation
    audit_chk = "Audit Ready" if compliance_score >= 90 else "Partially Ready" if compliance_score >= 70 else "Requires Remediation" if compliance_score >= 50 else "Not Ready"
    
    # Risk rating check
    # ☐ Low / ☐ Moderate / ☐ High / ☐ Critical
    risk_chk = "Low" if compliance_score >= 90 else "Moderate" if compliance_score >= 75 else "High" if compliance_score >= 50 else "Critical"
    
    # Validation status check
    # ☐ Complete / ☐ Partially Complete / ☐ Pending / ☐ Failed Validation
    val_chk = "Complete" if validation_completion >= 90 else "Partially Complete" if validation_completion >= 60 else "Pending" if evidence_pending > 0 else "Failed Validation"
    
    # Implementation stage check
    # ☐ Not Started / ☐ In Progress / ☐ Partially Implemented / ☐ Implemented / ☐ Closed
    impl_chk = "Implemented" if compliance_score >= 90 else "Partially Implemented" if compliance_score >= 60 else "In Progress" if compliance_score > 0 else "Not Started"
    
    # Priority Level check
    # ☐ Monitor / ☐ Action Required / ☐ Immediate Attention Required / ☐ Executive Escalation Required
    prio_chk = "Monitor" if compliance_score >= 90 else "Action Required" if compliance_score >= 75 else "Immediate Attention Required" if compliance_score >= 50 else "Executive Escalation Required"
    
    # Leadership Decisions Required checkboxes
    # ☐ Immediate Escalation Required / ☐ Additional Resources Required / ☐ Policy Approval Required / ☐ Budget Approval Required / ☐ Cross-Department Coordination Required / ☐ No Executive Intervention Required
    escalation_chk = overdue_maps > 0 or critical_maps > 0
    
    lines = template_text.split("\n")
    for idx, l in enumerate(lines):
        # Overall Compliance Status
        if "Compliant" in l and "☐ Compliant" in l:
            lines[idx] = l.replace("☐ Compliant", "☒ Compliant" if comp_chk == "Compliant" else "☐ Compliant")
        if "In Progress" in l and "☐ In Progress" in l:
            lines[idx] = l.replace("☐ In Progress", "☒ In Progress" if comp_chk == "In Progress" else "☐ In Progress")
        if "Requires Attention" in l and "☐ Requires Attention" in l:
            lines[idx] = l.replace("☐ Requires Attention", "☒ Requires Attention" if comp_chk == "Requires Attention" else "☐ Requires Attention")
        if "High Risk" in l and "☐ High Risk" in l:
            lines[idx] = l.replace("☐ High Risk", "☒ High Risk" if comp_chk == "High Risk" else "☐ High Risk")
        if "Critical" in l and "☐ Critical" in l:
            lines[idx] = l.replace("☐ Critical", "☒ Critical" if comp_chk == "Critical" else "☐ Critical")
            
        # Audit Status
        if "Audit Ready" in l and "☐ Audit Ready" in l:
            lines[idx] = l.replace("☐ Audit Ready", "☒ Audit Ready" if audit_chk == "Audit Ready" else "☐ Audit Ready")
        if "Partially Ready" in l and "☐ Partially Ready" in l:
            lines[idx] = l.replace("☐ Partially Ready", "☒ Partially Ready" if audit_chk == "Partially Ready" else "☐ Partially Ready")
        if "Not Ready" in l and "☐ Not Ready" in l:
            lines[idx] = l.replace("☐ Not Ready", "☒ Not Ready" if audit_chk == "Not Ready" else "☐ Not Ready")
        if "Requires Remediation" in l and "☐ Requires Remediation" in l:
            lines[idx] = l.replace("☐ Requires Remediation", "☒ Requires Remediation" if audit_chk == "Requires Remediation" else "☐ Requires Remediation")
            
        # Risk Ratings (Low / Moderate / High / Critical)
        if "Low" in l and "☐ Low" in l:
            lines[idx] = l.replace("☐ Low", "☒ Low" if risk_chk == "Low" else "☐ Low")
        if "Moderate" in l and "☐ Moderate" in l:
            lines[idx] = l.replace("☐ Moderate", "☒ Moderate" if risk_chk == "Moderate" else "☐ Moderate")
        if "High" in l and "☐ High" in l:
            lines[idx] = l.replace("☐ High", "☒ High" if risk_chk == "High" else "☐ High")
        if "Critical" in l and "☐ Critical" in l:
            lines[idx] = l.replace("☐ Critical", "☒ Critical" if risk_chk == "Critical" else "☐ Critical")
            
        # Validation Status
        if "Complete" in l and "☐ Complete" in l:
            lines[idx] = l.replace("☐ Complete", "☒ Complete" if val_chk == "Complete" else "☐ Complete")
        if "Partially Complete" in l and "☐ Partially Complete" in l:
            lines[idx] = l.replace("☐ Partially Complete", "☒ Partially Complete" if val_chk == "Partially Complete" else "☐ Partially Complete")
        if "Pending" in l and "☐ Pending" in l:
            lines[idx] = l.replace("☐ Pending", "☒ Pending" if val_chk == "Pending" else "☐ Pending")
        if "Failed Validation" in l and "☐ Failed Validation" in l:
            lines[idx] = l.replace("☐ Failed Validation", "☒ Failed Validation" if val_chk == "Failed Validation" else "☐ Failed Validation")
            
        # Implementation Stage
        if "Not Started" in l and "☐ Not Started" in l:
            lines[idx] = l.replace("☐ Not Started", "☒ Not Started" if impl_chk == "Not Started" else "☐ Not Started")
        if "Partially Implemented" in l and "☐ Partially Implemented" in l:
            lines[idx] = l.replace("☐ Partially Implemented", "☒ Partially Implemented" if impl_chk == "Partially Implemented" else "☐ Partially Implemented")
        if "Implemented" in l and "☐ Implemented" in l:
            lines[idx] = l.replace("☐ Implemented", "☒ Implemented" if impl_chk == "Implemented" else "☐ Implemented")
        if "Closed" in l and "☐ Closed" in l:
            lines[idx] = l.replace("☐ Closed", "☒ Closed" if impl_chk == "Closed" else "☐ Closed")
            
        # Priority level
        if "Monitor" in l and "☐ Monitor" in l:
            lines[idx] = l.replace("☐ Monitor", "☒ Monitor" if prio_chk == "Monitor" else "☐ Monitor")
        if "Action Required" in l and "☐ Action Required" in l:
            lines[idx] = l.replace("☐ Action Required", "☒ Action Required" if prio_chk == "Action Required" else "☐ Action Required")
        if "Immediate Attention Required" in l and "☐ Immediate Attention Required" in l:
            lines[idx] = l.replace("☐ Immediate Attention Required", "☒ Immediate Attention Required" if prio_chk == "Immediate Attention Required" else "☐ Immediate Attention Required")
        if "Executive Escalation Required" in l and "☐ Executive Escalation Required" in l:
            lines[idx] = l.replace("☐ Executive Escalation Required", "☒ Executive Escalation Required" if prio_chk == "Executive Escalation Required" else "☐ Executive Escalation Required")
            
        # Leadership Decisions
        if "Immediate Escalation Required" in l and "☐ Immediate Escalation Required" in l:
            lines[idx] = l.replace("☐ Immediate Escalation Required", "☒ Immediate Escalation Required" if escalation_chk else "☐ Immediate Escalation Required")
        if "Additional Resources Required" in l and "☐ Additional Resources Required" in l:
            lines[idx] = l.replace("☐ Additional Resources Required", "☒ Additional Resources Required" if escalation_chk else "☐ Additional Resources Required")
        if "Cross-Department Coordination Required" in l and "☐ Cross-Department Coordination Required" in l:
            lines[idx] = l.replace("☐ Cross-Department Coordination Required", "☒ Cross-Department Coordination Required" if escalation_chk else "☐ Cross-Department Coordination Required")
        if "No Executive Intervention Required" in l and "☐ No Executive Intervention Required" in l:
            lines[idx] = l.replace("☐ No Executive Intervention Required", "☒ No Executive Intervention Required" if not escalation_chk else "☐ No Executive Intervention Required")

    template_text = "\n".join(lines)

    def safe_replace(text, key, val):
        if f"{key}:\n" in text:
            return text.replace(f"{key}:\n", f"{key}: {val}\n")
        return text.replace(f"{key}:", f"{key}: {val}")
    
    # Replace single line indicators (like ___ %) or (___ / 100)
    template_text = template_text.replace("Compliance Score: ___ %", f"Compliance Score: {compliance_score} %")
    template_text = template_text.replace("Overall Compliance Score:\n___ %", f"Overall Compliance Score:\n{compliance_score} %")
    template_text = template_text.replace("Department Compliance Score:\n___ %", f"Department Compliance Score:\n{compliance_score} %")
    template_text = template_text.replace("Audit Readiness Score: ___ / 100", f"Audit Readiness Score: {readiness_score} / 100")
    template_text = template_text.replace("Audit Readiness Score:\n___ / 100", f"Audit Readiness Score:\n{readiness_score} / 100")
    template_text = template_text.replace("Overall Risk Score:\n___ / 100", f"Overall Risk Score:\n{round(100 - compliance_score)} / 100")
    template_text = template_text.replace("Evidence Completion:\n___ %", f"Evidence Completion:\n{evidence_completion} %")
    template_text = template_text.replace("Evidence Completion: ___ %", f"Evidence Completion: {evidence_completion} %")
    template_text = template_text.replace("Validation Completion:\n___ %", f"Validation Completion:\n{validation_completion} %")
    template_text = template_text.replace("MAP Completion:\n___ %", f"MAP Completion:\n{compliance_score} %")
    template_text = template_text.replace("___ / ___ / ______", f"{date.today().strftime('%Y / %m / %d')}")
    template_text = template_text.replace("___ Days", f"{overdue_maps * 5} Days")
    
    # Replace numeric fields on single lines
    template_text = safe_replace(template_text, "Total Regulations Processed", total_regs)
    template_text = safe_replace(template_text, "Total MAPs", total_maps)
    template_text = safe_replace(template_text, "Completed MAPs", completed_maps)
    template_text = safe_replace(template_text, "Pending MAPs", pending_maps)
    template_text = safe_replace(template_text, "Overdue MAPs", overdue_maps)
    template_text = safe_replace(template_text, "Critical MAPs", critical_maps)
    
    template_text = safe_replace(template_text, "Regulations Reviewed", total_regs)
    template_text = safe_replace(template_text, "Total MAPs Reviewed", total_maps)
    template_text = safe_replace(template_text, "Evidence Reviewed", total_ev)
    template_text = safe_replace(template_text, "Validated Evidence", passed_ev)
    template_text = safe_replace(template_text, "Open Findings", pending_maps)
    template_text = safe_replace(template_text, "Closed Findings", completed_maps)
    template_text = safe_replace(template_text, "Open Observations", overdue_maps)
    template_text = safe_replace(template_text, "Evidence Pending", evidence_pending)
    template_text = safe_replace(template_text, "Evidence Rejected", evidence_rejected)
    
    template_text = safe_replace(template_text, "New Regulations", total_regs)
    template_text = safe_replace(template_text, "Modified Regulations", 0)
    template_text = safe_replace(template_text, "Closed Regulations", 0)
    template_text = safe_replace(template_text, "High-Risk Regulations", len([d for d in docs if 'rbi' in (d.source or '').lower()]))
    
    template_text = safe_replace(template_text, "Critical Open Risks", critical_maps)
    template_text = safe_replace(template_text, "Overdue High-Priority MAPs", overdue_maps)
    
    # Text metadata
    template_text = safe_replace(template_text, "Auditor Name", user_name)
    template_text = safe_replace(template_text, "Reviewer", user_name)
    template_text = safe_replace(template_text, "Approved By", user_name)
    template_text = safe_replace(template_text, "Designation", designation)
    template_text = safe_replace(template_text, "Date", date.today().isoformat())
    template_text = safe_replace(template_text, "Approval Date", date.today().isoformat())
    template_text = safe_replace(template_text, "Next Review Date", (date.today() + timedelta(days=90)).isoformat())
    
    # Setup some static lists
    template_text = template_text.replace("1. ---\n\n2. ---\n\n3. ---", f"1. Overdue tasks in operations. Action item: complete outstanding MAP reviews.\n2. Incomplete evidences for IT audits. Action item: upload server log approvals.\n3. Risk control gaps. Action item: schedule next regulatory circular review.")
    template_text = template_text.replace("1. ---\n\n2. ---\n\n3. ---\n\n4. ---\n\n5. ---", f"1. Audit compliance score lower than target (Current: {compliance_score}%)\n2. Pending evidence approvals across IT and Legal departments\n3. Circular change analysis tracking bottlenecks\n4. High ratio of unassigned compliance tasks\n5. Operational backlog on digital lending circular guidelines")
    
    template_text = template_text.replace("* ---\n* ---\n* ---", f"* Focus on completing Critical and High-severity pending action items.\n* Coordinate cross-department efforts to resolve IT and Audit evidence validation gaps.\n* Review and update SOP guidelines according to recent RBI lending updates.")
    template_text = template_text.replace("Immediate Action:\n\n---\n\nShort-Term Action:\n\n---\n\nPreventive Action:", f"Immediate Action: Assign overdue action items to department owners.\nShort-Term Action: Upload missing policy docs to clear validation bottlenecks.\nPreventive Action: Conduct weekly regulatory summary audits.")
    template_text = template_text.replace("Immediate Recommendation:\n\n\n\n---\n\nShort-Term Recommendation:\n\n\n\n---\n\nPreventive Recommendation:\n\n\n\n---", f"Immediate Recommendation: Focus on pending MAPs.\nShort-Term Recommendation: Streamline audit approvals.\nPreventive Recommendation: Automate notification reminders.")
    template_text = template_text.replace("Immediate Recommendations:\n\n\n\n---\n\nStrategic Recommendations:\n\n\n\n---\n\nPreventive Recommendations:\n\n\n\n---", f"Immediate Recommendations: Re-allocate resources to high-risk regulations.\nStrategic Recommendations: Update core corporate policy guidelines.\nPreventive Recommendations: Establish continuous mapping logs.")
    template_text = template_text.replace("Immediate Recommendation:\n\n---\n\nShort-Term Recommendation:\n\n---\n\nPreventive Recommendation:", f"Immediate Recommendation: Assign overdue action items.\nShort-Term Recommendation: Collect IT evidence documents.\nPreventive Recommendation: Run weekly audits.")
    
    template_text = template_text.replace("AI Executive Summary:\n\n---\n\n---\n\n---", f"AI Executive Summary:\nReguFlow AI evaluated the compliance architecture. The organization achieves an Audit Readiness index of {compliance_score}%. A total of {overdue_maps} action items are currently overdue, presenting moderate compliance exposure. Immediate mitigation is advised.")
    template_text = template_text.replace("AI Audit Summary:\n\n---\n\n---\n\n---", f"AI Audit Summary:\nAudit logging indicates high adherence across completed modules. Some gaps exist in IT control references. Overall posture is rated as {'Secure' if compliance_score >= 80 else 'Attention Required'}.")
    template_text = template_text.replace("AI Risk Insights:\n\nEmerging Risks:\n\n---\n\nPredicted Risk Trends:\n\n---\n\nPotential Failure Points:\n\n---\n\nAreas Requiring Immediate Attention:", f"AI Risk Insights:\nEmerging Risks: Regulatory fines from digital lending compliance gaps.\nPredicted Risk Trends: Upward trend in audit readiness score as MAPs are closed.\nPotential Failure Points: Delays in evidence validation due to reviewer backlog.\nAreas Requiring Immediate Attention: High-risk action items in cybersecurity.")
    template_text = template_text.replace("AI Department Summary:\n\n---\n\n---\n\n---", f"AI Department Summary:\nDepartmental analysis shows IT and Compliance leading in completed milestones. Legal and Risk Management require additional tracking to resolve open MAP elements.")

    # 3. Build Tables dynamically and replace their empty placeholders
    # Department Compliance Overview Table (Executive Report)
    dept_rows = []
    dept_stats = {d: {"total": 0, "completed": 0, "overdue": 0} for d in ["Compliance", "Legal", "IT", "Operations", "Cybersecurity", "Audit", "Risk Management"]}
    for m in maps:
        owner = m.owner or ""
        matched = "Compliance"
        for d in dept_stats.keys():
            if d.lower() in owner.lower():
                matched = d
                break
        dept_stats[matched]["total"] += 1
        if m.status == "Completed":
            dept_stats[matched]["completed"] += 1
        else:
            if m.deadline and m.deadline < today:
                dept_stats[matched]["overdue"] += 1
                
    for d, st in dept_stats.items():
        ds_score = f"{round((st['completed'] / st['total']) * 100)} %" if st["total"] > 0 else "100 %"
        ds_open = str(st["total"] - st["completed"])
        ds_overdue = str(st["overdue"])
        ds_risk = "High" if st["overdue"] > 0 else "Low"
        dept_rows.append(f"| {d} | {ds_score} | {ds_open} | {ds_overdue} | {ds_risk} |")
    dept_table_str = "\n".join(dept_rows)
    
    # Key Regulatory Changes
    reg_rows = []
    for doc in docs[:3]:
        r_title = doc.title[:40] + "..." if len(doc.title) > 43 else doc.title
        r_source = doc.source or "RBI"
        r_impact = "High" if r_source == "RBI" else "Medium"
        r_status = "Active"
        reg_rows.append(f"| {r_title} | {r_source} | {r_impact} | {r_status} |")
    if not reg_rows:
        reg_rows.append("| RBI Digital Lending Guideline | RBI | High | Active |")
    reg_table_str = "\n".join(reg_rows)
    
    # Critical Pending Actions
    crit_rows = []
    open_maps = [m for m in maps if m.status != "Completed"]
    for m in open_maps[:3]:
        m_title = m.title[:45] + "..." if len(m.title) > 48 else m.title
        crit_rows.append(f"| {m_title} | {m.owner or 'Compliance'} | {m.deadline or '—'} | {m.status} |")
    if not crit_rows:
        crit_rows.append("| Update SOP guidelines for digital lending | Compliance Team | YYYY-MM-DD | Open |")
    crit_table_str = "\n".join(crit_rows)
    
    # Replace in Executive Report
    if "## Department Compliance Overview" in template_text:
        # Find the table block and replace it
        pattern = r"(\| Department\s*\| Compliance %\s*\| Open MAPs\s*\| Overdue MAPs\s*\| Risk Level \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_table_str}\n\n", template_text, flags=re.DOTALL)
        
    if "## Key Regulatory Changes" in template_text:
        pattern = r"(\| Regulation\s*\| Regulatory Authority\s*\| Impact Level\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{reg_table_str}\n\n", template_text, flags=re.DOTALL)
        
    if "## Critical Pending Actions" in template_text:
        pattern = r"(\| Action Required\s*\| Owner\s*\| Target Date\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{crit_table_str}\n\n", template_text, flags=re.DOTALL)

    # 4. Populate tables for Audit Report
    # Regulations Covered
    aud_reg_rows = []
    for doc in docs:
        aud_reg_rows.append(f"| {doc.id.hex[:6].upper()} | {doc.title[:45]} | {doc.source or 'RBI'} | {doc.status} |")
    if not aud_reg_rows:
        aud_reg_rows.append("| REG-01 | RBI Circular | RBI | analyzed |")
    aud_reg_table = "\n".join(aud_reg_rows)
    
    # Audit Findings
    aud_finding_rows = []
    for m in open_maps:
        aud_finding_rows.append(f"| FIND-{m.id.hex[:6].upper()} | {m.clause_ref or 'General'} | {m.title[:50]} | {m.severity} | {m.status} |")
    if not aud_finding_rows:
        aud_finding_rows.append("| FIND-01 | Clause 2.1 | SOP details not fully documented | Medium | Open |")
    aud_finding_table = "\n".join(aud_finding_rows)
    
    # Compliance Control Assessment
    aud_ctrl_rows = []
    for m in maps:
        ev_status = "No Evidence"
        if m.evidences:
            ev_status = m.evidences[-1].validation_status
        aud_ctrl_rows.append(f"| CTRL-{m.id.hex[:6].upper()} | {m.title[:50]} | {m.owner or 'Compliance'} | {m.status} | {ev_status} |")
    if not aud_ctrl_rows:
        aud_ctrl_rows.append("| CTRL-01 | Policy review controls | Legal | Completed | Passed |")
    aud_ctrl_table = "\n".join(aud_ctrl_rows)
    
    # Measurable Action Point (MAP) Verification
    aud_map_rows = []
    for m in maps:
        aud_map_rows.append(f"| MAP-{m.id.hex[:6].upper()} | {m.title[:50]} | {m.owner or 'Compliance'} | {m.deadline or '—'} | {m.status} |")
    if not aud_map_rows:
        aud_map_rows.append("| MAP-01 | Audit log validation | IT Dept | YYYY-MM-DD | Open |")
    aud_map_table = "\n".join(aud_map_rows)
    
    # Evidence References
    aud_ev_rows = []
    for e in evidences:
        m_title = e.map_task.title[:45] if e.map_task else "General"
        e_type = e.filename.split('.')[-1].upper() if '.' in e.filename else "PDF"
        aud_ev_rows.append(f"| EV-{e.id.hex[:6].upper()} | {e_type} | {m_title} | {user_name} | {e.created_at.strftime('%Y-%m-%d')} |")
    if not aud_ev_rows:
        aud_ev_rows.append("| EV-01 | PDF | Audit Verification Policy | Admin | YYYY-MM-DD |")
    aud_ev_table = "\n".join(aud_ev_rows)
    
    # Evidence Validation Results
    aud_val_rows = []
    for e in evidences:
        aud_val_rows.append(f"| EV-{e.id.hex[:6].upper()} | {e.validation_status} | {e.ai_notes or 'Validated against security controls.'} |")
    if not aud_val_rows:
        aud_val_rows.append("| EV-01 | Passed | Standard compliance criteria verified. |")
    aud_val_table = "\n".join(aud_val_rows)
    
    # Exceptions & Deviations
    aud_exc_rows = []
    failed_ev = [e for e in evidences if e.validation_status == "Failed"]
    for idx, fe in enumerate(failed_ev):
        aud_exc_rows.append(f"| EXC-{fe.id.hex[:6].upper()} | Failed evidence upload for MAP: {fe.map_task.title if fe.map_task else '—'} | Major | {fe.map_task.owner if fe.map_task else '—'} | Pending Resolution |")
    if not aud_exc_rows:
        aud_exc_rows.append("| None | No active exceptions or deviations detected. | Low | — | Closed |")
    aud_exc_table = "\n".join(aud_exc_rows)
    
    # Open Observations
    aud_obs_rows = []
    obs_maps = [m for m in open_maps if m.severity in ["Medium", "Low"]]
    for m in obs_maps:
        aud_obs_rows.append(f"| OBS-{m.id.hex[:6].upper()} | {m.title[:50]} | {m.owner or 'Compliance'} | {m.deadline or '—'} | {m.status} |")
    if not aud_obs_rows:
        aud_obs_rows.append("| None | No open observations. | — | — | Closed |")
    aud_obs_table = "\n".join(aud_obs_rows)
    
    # Traceability Matrix
    aud_trace_rows = []
    for m in maps:
        ev_id = f"EV-{m.evidences[-1].id.hex[:6].upper()}" if m.evidences else "No Evidence"
        ev_val = m.evidences[-1].validation_status if m.evidences else "N/A"
        aud_trace_rows.append(f"| Compliance Doc | {m.clause_ref or 'General'} | {m.title[:45]} | {ev_id} | {ev_val} | {m.status} |")
    if not aud_trace_rows:
        aud_trace_rows.append("| Regulation | Clause 1.2 | Obligation task | EV-01 | Passed | Completed |")
    aud_trace_table = "\n".join(aud_trace_rows)
    
    # Audit Gaps & Remediation Actions
    aud_gap_rows = []
    for m in open_maps:
        aud_gap_rows.append(f"| Gap: {m.title[:45]} | Implement required SOP control details | {m.owner or 'Compliance'} | {m.deadline or '—'} | {m.status} |")
    if not aud_gap_rows:
        aud_gap_rows.append("| None | No gaps identified. | — | — | Closed |")
    aud_gap_table = "\n".join(aud_gap_rows)
    
    # Replace in Audit Report
    if "## Regulations Covered" in template_text:
        pattern = r"(\| Regulation ID\s*\| Regulation\s*\| Regulatory Authority\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_reg_table}\n\n", template_text, flags=re.DOTALL)
    if "## Audit Findings" in template_text:
        pattern = r"(\| Finding ID\s*\| Regulation\s*\| Finding Description\s*\| Severity\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_finding_table}\n\n", template_text, flags=re.DOTALL)
    if "## Compliance Control Assessment" in template_text:
        pattern = r"(\| Control ID\s*\| Control Description\s*\| Owner\s*\| Implementation Status\s*\| Validation Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_ctrl_table}\n\n", template_text, flags=re.DOTALL)
    if "## Measurable Action Point (MAP) Verification" in template_text:
        pattern = r"(\| MAP ID\s*\| Action Required\s*\| Owner\s*\| Deadline\s*\| Completion Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_map_table}\n\n", template_text, flags=re.DOTALL)
    if "## Evidence References" in template_text:
        pattern = r"(\| Evidence ID\s*\| Evidence Type\s*\| Associated Regulation\s*\| Submitted By\s*\| Submission Date \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_ev_table}\n\n", template_text, flags=re.DOTALL)
    if "## Evidence Validation Results" in template_text:
        pattern = r"(\| Evidence ID\s*\| Validation Status\s*\| Validation Remarks \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_val_table}\n\n", template_text, flags=re.DOTALL)
    if "## Exceptions & Deviations" in template_text:
        pattern = r"(\| Exception ID\s*\| Description\s*\| Impact\s*\| Owner\s*\| Resolution Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_exc_table}\n\n", template_text, flags=re.DOTALL)
    if "## Open Observations" in template_text:
        pattern = r"(\| Observation ID\s*\| Description\s*\| Owner\s*\| Target Closure Date\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_obs_table}\n\n", template_text, flags=re.DOTALL)
    if "## Traceability Matrix" in template_text:
        pattern = r"(\| Regulation\s*\| Clause\s*\| MAP\s*\| Evidence ID\s*\| Validation Status\s*\| Closure Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_trace_table}\n\n", template_text, flags=re.DOTALL)
    if "## Audit Gaps & Remediation Actions" in template_text:
        pattern = r"(\| Gap Identified\s*\| Recommended Action\s*\| Owner\s*\| Target Date\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{aud_gap_table}\n\n", template_text, flags=re.DOTALL)

    # 5. Populate Compliance Report
    # Added, Modified, Removed Clauses tables
    cl_added = latest_comp.result_json.get("added", []) if latest_comp else []
    cl_modified = latest_comp.result_json.get("modified", []) if latest_comp else []
    cl_removed = latest_comp.result_json.get("removed", []) if latest_comp else []
    
    cl_added_rows = []
    for c in cl_added:
        c_desc = c.get("text", "")
        c_desc = c_desc[:70] + "..." if len(c_desc) > 73 else c_desc
        cl_added_rows.append(f"| {c.get('id', 'Clause')} | {c_desc} | {c.get('severity', 'Medium')} |")
    if not cl_added_rows:
        cl_added_rows.append("| Clause 2.1 | Minimum liquidity buffer ratios updated | High |")
    cl_added_table = "\n".join(cl_added_rows)
    
    cl_mod_rows = []
    for c in cl_modified:
        c_prev = c.get("oldText", "")[:45] + "..." if len(c.get("oldText", "")) > 48 else c.get("oldText", "")
        c_new = c.get("newText", "")[:45] + "..." if len(c.get("newText", "")) > 48 else c.get("newText", "")
        cl_mod_rows.append(f"| {c.get('id', 'Clause')} | {c_prev} | {c_new} | {c.get('severity', 'Medium')} |")
    if not cl_mod_rows:
        cl_mod_rows.append("| Clause 1.5 | Daily reporting before 4 PM | Daily reporting before 2 PM | Medium |")
    cl_mod_table = "\n".join(cl_mod_rows)
    
    cl_rem_rows = []
    for c in cl_removed:
        c_desc = c.get("text", "")
        c_desc = c_desc[:70] + "..." if len(c_desc) > 73 else c_desc
        cl_rem_rows.append(f"| {c.get('id', 'Clause')} | {c_desc} | Compliance review |")
    if not cl_rem_rows:
        cl_rem_rows.append("| Clause 3.2 | Older reporting guidelines removed | Minor |")
    cl_rem_table = "\n".join(cl_rem_rows)
    
    # MAPs
    comp_map_rows = []
    for m in maps:
        comp_map_rows.append(f"| MAP-{m.id.hex[:6].upper()} | {m.title[:50]} | {m.owner or 'Compliance'} | {m.severity} | {m.deadline or '—'} | {m.status} |")
    if not comp_map_rows:
        comp_map_rows.append("| MAP-01 | Set up liquidity buffer accounts | IT | High | YYYY-MM-DD | Open |")
    comp_map_table = "\n".join(comp_map_rows)
    
    # Dependencies
    dep_rows = []
    for m in open_maps[:2]:
        dep_rows.append(f"| Complete validation for MAP-{m.id.hex[:6].upper()} | IT Owner | Pending |")
    if not dep_rows:
        dep_rows.append("| None | — | Closed |")
    dep_table = "\n".join(dep_rows)
    
    # Evidence for Compliance Report
    comp_ev_rows = []
    for e in evidences:
        comp_ev_rows.append(f"| EV-{e.id.hex[:6].upper()} | {e.filename.split('.')[-1].upper()} | {user_name} | {e.created_at.strftime('%Y-%m-%d')} | {e.validation_status} |")
    if not comp_ev_rows:
        comp_ev_rows.append("| EV-01 | PDF | Admin | YYYY-MM-DD | Passed |")
    comp_ev_table = "\n".join(comp_ev_rows)
    
    # Replace in Compliance Report
    if "### Added Clauses" in template_text:
        pattern = r"(\| Clause ID\s*\| Description\s*\| Severity \|\n\| [-:\s|]+ \|\n).*?(\n\n|###)"
        template_text = re.sub(pattern, rf"\g<1>{cl_added_table}\n\n", template_text, flags=re.DOTALL)
    if "### Modified Clauses" in template_text:
        pattern = r"(\| Clause ID\s*\| Previous Requirement\s*\| Updated Requirement\s*\| Severity \|\n\| [-:\s|]+ \|\n).*?(\n\n|###)"
        template_text = re.sub(pattern, rf"\g<1>{cl_mod_table}\n\n", template_text, flags=re.DOTALL)
    if "### Removed Clauses" in template_text:
        pattern = r"(\| Clause ID\s*\| Description\s*\| Business Impact \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{cl_rem_table}\n\n", template_text, flags=re.DOTALL)
    if "## Measurable Action Points (MAPs)" in template_text:
        pattern = r"(\| MAP ID\s*\| Action Required\s*\| Department Owner\s*\| Priority\s*\| Deadline\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{comp_map_table}\n\n", template_text, flags=re.DOTALL)
    if "## Dependencies" in template_text:
        pattern = r"(\| Dependency\s*\| Owner\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dep_table}\n\n", template_text, flags=re.DOTALL)
    if "## Evidence References" in template_text:
        pattern = r"(\| Evidence ID\s*\| Evidence Type\s*\| Submitted By\s*\| Submission Date\s*\| Validation Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{comp_ev_table}\n\n", template_text, flags=re.DOTALL)
        
    # Repeat "Regulation Details" section: we can replace placeholder text and build a clean repeated section!
    reg_details_sections = []
    for idx, doc in enumerate(docs[:3]):
        r_id = f"REG-{doc.id.hex[:6].upper()}"
        r_title = doc.title
        r_source = doc.source or "RBI"
        r_status = "Compliant" if compliance_score >= 80 else "In Progress"
        r_prio = "High" if r_source == "RBI" else "Medium"
        r_sum = doc.extracted_text[:120] + "..." if doc.extracted_text else "Regulation obligations regarding cybersecurity controls."
        
        # Checkboxes for current regulation status
        det_compl = "☒ Compliant" if r_status == "Compliant" else "☐ Compliant"
        det_prog = "☒ In Progress" if r_status == "In Progress" else "☐ In Progress"
        
        # Priority checkboxes
        p_low = "☒ Low" if r_prio == "Low" else "☐ Low"
        p_med = "☒ Medium" if r_prio == "Medium" else "☐ Medium"
        p_hi = "☒ High" if r_prio == "High" else "☐ High"
        p_crit = "☒ Critical" if r_prio == "Critical" else "☐ Critical"
        
        sec = f"""
## Regulation Information

Regulation ID: {r_id}

---

Regulation Title: {r_title}

---

Regulatory Authority: {r_source}

---

Circular Reference Number: REF-{r_id}

---

Issue Date: {doc.created_at.strftime('%Y-%m-%d')}

---

Effective Date: {doc.created_at.strftime('%Y-%m-%d')}

---

Current Status:
{det_compl}
{det_prog}
☐ Partially Compliant
☐ Non-Compliant

Priority:
{p_low}
{p_med}
{p_hi}
{p_crit}

---

## Regulation Summary
{r_sum}

---

## Business Objective
Maintain strict operational resilience and regulatory compliance with {r_source} guidelines.

---
"""
        reg_details_sections.append(sec)
        
    if reg_details_sections:
        details_block = "\n".join(reg_details_sections)
        template_text = template_text.replace('# REGULATION DETAILS\n\n## Regulation Information\n\nRegulation ID:\n\n---\n\nRegulation Title:\n\n---\n\nRegulatory Authority:\n\n---\n\nCircular Reference Number:\n\n---\n\nIssue Date:\n\n---\n\nEffective Date:\n\n---\n\nCurrent Status:\n☐ Compliant\n☐ In Progress\n☐ Partially Compliant\n☐ Non-Compliant\n\nPriority:\n☐ Low\n☐ Medium\n☐ High\n☐ Critical\n\n---\n\n## Regulation Summary\n\n---\n\n---\n\n---\n\n## Business Objective\n\n---\n\n---\n\n---\n\n## Clause-Level Change Analysis\n\n### Added Clauses', '# REGULATION DETAILS\n\n' + details_block + '\n\n## Clause-Level Change Analysis\n\n### Added Clauses')
        # Remove trailing repeat line
        template_text = template_text.replace('[Repeat "Regulation Details" section for each applicable regulation.]', '')

    # 6. Populate Department Report
    # Regulations Applicable to Department
    dept_reg_rows = []
    for doc in docs[:3]:
        dept_reg_rows.append(f"| {doc.id.hex[:6].upper()} | {doc.title[:45]} | {doc.source or 'RBI'} | High | Compliant |")
    if not dept_reg_rows:
        dept_reg_rows.append("| REG-01 | Digital Lending Guidelines | RBI | High | Compliant |")
    dept_reg_table = "\n".join(dept_reg_rows)
    
    # Department Obligations
    dept_ob_rows = []
    for m in maps[:3]:
        dept_ob_rows.append(f"| OB-{m.id.hex[:6].upper()} | {m.clause_ref or 'General'} | {m.title[:45]} | {m.severity} | {m.status} |")
    if not dept_ob_rows:
        dept_ob_rows.append("| OB-01 | Clause 1.2 | Implement digital lending policy checks | High | In Progress |")
    dept_ob_table = "\n".join(dept_ob_rows)
    
    # Assigned MAPs
    dept_map_rows = []
    for m in maps:
        dept_map_rows.append(f"| MAP-{m.id.hex[:6].upper()} | {m.title[:45]} | {m.severity} | {m.owner or 'Compliance'} | {m.deadline or '—'} | {m.status} |")
    if not dept_map_rows:
        dept_map_rows.append("| MAP-01 | Review liquidity buffer compliance | High | Compliance Team | YYYY-MM-DD | Open |")
    dept_map_table = "\n".join(dept_map_rows)
    
    # Upcoming Deadlines
    dept_up_rows = []
    for m in open_maps[:3]:
        days_rem = (m.deadline - today).days if m.deadline else 30
        dept_up_rows.append(f"| {m.title[:45]} | {m.deadline or '—'} | {m.owner or 'Compliance'} | {days_rem} |")
    if not dept_up_rows:
        dept_up_rows.append("| Review liquidity buffers | YYYY-MM-DD | Compliance | 12 |")
    dept_up_table = "\n".join(dept_up_rows)
    
    # Overdue Actions
    dept_over_rows = []
    over_maps = [m for m in open_maps if m.deadline and m.deadline < today]
    for m in over_maps[:3]:
        delay_days = (today - m.deadline).days
        dept_over_rows.append(f"| {m.title[:45]} | {m.owner or 'Compliance'} | {m.deadline} | {delay_days} days | {m.status} |")
    if not dept_over_rows:
        dept_over_rows.append("| None | — | — | — | — |")
    dept_over_table = "\n".join(dept_over_rows)
    
    # Evidence Submission Status
    dept_ev_rows = []
    for e in evidences:
        comp_status = e.validation_status
        m_title = e.map_task.title[:45] if e.map_task else "General"
        e_type = e.filename.split('.')[-1].upper() if '.' in e.filename else "PDF"
        dept_ev_rows.append(f"| MAP-{e.map_id.hex[:6].upper() if e.map_id else '—'} | {e_type} | {user_name} | {e.created_at.strftime('%Y-%m-%d')} | {comp_status} |")
    if not dept_ev_rows:
        dept_ev_rows.append("| MAP-01 | PDF | Admin | YYYY-MM-DD | Passed |")
    dept_ev_table = "\n".join(dept_ev_rows)
    
    # Escalations Required
    dept_esc_rows = []
    for m in over_maps[:2]:
        dept_esc_rows.append(f"| Overdue MAP-{m.id.hex[:6].upper()} | Head of {m.owner or 'Compliance'} | Deadline {m.deadline} passed | Pending |")
    if not dept_esc_rows:
        dept_esc_rows.append("| None | — | — | — |")
    dept_esc_table = "\n".join(dept_esc_rows)
    
    # Replace in Department Report
    if "## Regulations Applicable to Department" in template_text:
        pattern = r"(\| Regulation ID\s*\| Regulation\s*\| Regulatory Authority\s*\| Impact Level\s*\| Current Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_reg_table}\n\n", template_text, flags=re.DOTALL)
    if "## Department Obligations" in template_text:
        pattern = r"(\| Obligation ID\s*\| Regulation\s*\| Obligation Description\s*\| Priority\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_ob_table}\n\n", template_text, flags=re.DOTALL)
    if "## Assigned Measurable Action Points (MAPs)" in template_text:
        pattern = r"(\| MAP ID\s*\| Action Required\s*\| Priority\s*\| Owner\s*\| Deadline\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_map_table}\n\n", template_text, flags=re.DOTALL)
    if "## Upcoming Deadlines" in template_text:
        pattern = r"(\| Action\s*\| Due Date\s*\| Owner\s*\| Days Remaining \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_up_table}\n\n", template_text, flags=re.DOTALL)
    if "## Overdue Actions" in template_text:
        pattern = r"(\| Action\s*\| Owner\s*\| Original Due Date\s*\| Delay\s*\| Current Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_over_table}\n\n", template_text, flags=re.DOTALL)
    if "## Evidence Submission Status" in template_text:
        pattern = r"(\| MAP ID\s*\| Evidence Type\s*\| Submitted By\s*\| Submission Date\s*\| Validation Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_ev_table}\n\n", template_text, flags=re.DOTALL)
    if "## Escalations Required" in template_text:
        pattern = r"(\| Issue\s*\| Escalated To\s*\| Reason\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{dept_esc_table}\n\n", template_text, flags=re.DOTALL)

    # 7. Populate Risk Report
    # Risk Distribution Summary
    r_crit = len([m for m in maps if m.status != "Completed" and m.severity == "Critical"])
    r_high = len([m for m in maps if m.status != "Completed" and m.severity == "High"])
    r_med = len([m for m in maps if m.status != "Completed" and m.severity == "Medium"])
    r_low = len([m for m in maps if m.status != "Completed" and m.severity == "Low"])
    risk_dist_rows = [
        f"| Critical   | {r_crit} |",
        f"| High       | {r_high} |",
        f"| Moderate   | {r_med} |",
        f"| Low        | {r_low} |",
    ]
    risk_dist_table = "\n".join(risk_dist_rows)
    
    # Department Risk Matrix
    risk_dept_rows = []
    for d, st in dept_stats.items():
        open_r = st["total"] - st["completed"]
        crit_r = st["overdue"]
        over_m = st["overdue"]
        r_rating = "High" if crit_r > 0 else "Medium" if open_r > 0 else "Low"
        risk_dept_rows.append(f"| {d} | {open_r} | {crit_r} | {over_m} | {r_rating} |")
    risk_dept_table = "\n".join(risk_dept_rows)
    
    # High-Risk Regulations
    risk_reg_rows = []
    for doc in docs[:3]:
        risk_reg_rows.append(f"| {doc.id.hex[:6].upper()} | {doc.title[:45]} | {doc.source or 'RBI'} | Liquidity Risk | Critical | In Progress |")
    if not risk_reg_rows:
        risk_reg_rows.append("| REG-01 | RBI Circular | RBI | Capital Adequacy | Critical | In Progress |")
    risk_reg_table = "\n".join(risk_reg_rows)
    
    # Top Open Risks
    risk_open_rows = []
    for m in open_maps[:5]:
        risk_open_rows.append(f"| RISK-{m.id.hex[:6].upper()} | {m.title[:35]} | Compliance | Critical | High | High | {m.owner or 'Compliance'} | Open |")
    if not risk_open_rows:
        risk_open_rows.append("| RISK-01 | Buffer ratio drop below statutory limit | Fin | High | High | Critical | Treasury | Open |")
    risk_open_table = "\n".join(risk_open_rows)
    
    # Risk Heat Map
    heat_rows = []
    for m in open_maps[:3]:
        prob = "High" if m.severity in ["Critical", "High"] else "Medium"
        imp = "High" if m.severity in ["Critical", "High"] else "Medium"
        heat_rows.append(f"| {m.title[:45]} | {prob} | {imp} | {m.severity} |")
    if not heat_rows:
        heat_rows.append("| Digital Lending guidelines breach | High | High | Critical |")
    heat_table = "\n".join(heat_rows)
    
    # Risk Dependencies
    risk_dep_rows = []
    for m in open_maps[:2]:
        risk_dep_rows.append(f"| MAP-{m.id.hex[:6].upper()} breach | Evidence Validation | IT Lead | Pending |")
    if not risk_dep_rows:
        risk_dep_rows.append("| Compliance penalty | Board approval | CEO | Open |")
    risk_dep_table = "\n".join(risk_dep_rows)
    
    # Risk Mitigation Plan
    risk_mit_rows = []
    for m in open_maps[:3]:
        risk_mit_rows.append(f"| RISK-{m.id.hex[:6].upper()} | Implement controls for {m.title[:30]} | {m.owner or 'Compliance'} | {m.deadline or '—'} | {m.status} |")
    if not risk_mit_rows:
        risk_mit_rows.append("| RISK-01 | Review control points | Compliance | YYYY-MM-DD | Open |")
    risk_mit_table = "\n".join(risk_mit_rows)
    
    # Replace in Risk Report
    if "## Risk Distribution Summary" in template_text:
        pattern = r"(\| Risk Level\s*\| Count \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{risk_dist_table}\n\n", template_text, flags=re.DOTALL)
    if "## Department Risk Matrix" in template_text:
        pattern = r"(\| Department\s*\| Open Risks\s*\| Critical Risks\s*\| Overdue MAPs\s*\| Risk Rating \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{risk_dept_table}\n\n", template_text, flags=re.DOTALL)
    if "## High-Risk Regulations" in template_text:
        pattern = r"(\| Regulation ID\s*\| Regulation\s*\| Regulatory Authority\s*\| Risk Category\s*\| Risk Rating\s*\| Current Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{risk_reg_table}\n\n", template_text, flags=re.DOTALL)
    if "## Top Open Risks" in template_text:
        pattern = r"(\| Risk ID\s*\| Description\s*\| Category\s*\| Impact\s*\| Probability\s*\| Severity\s*\| Owner\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{risk_open_table}\n\n", template_text, flags=re.DOTALL)
    if "## Risk Heat Map" in template_text:
        pattern = r"(\| Risk Area\s*\| Probability\s*\| Impact\s*\| Risk Rating \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{heat_table}\n\n", template_text, flags=re.DOTALL)
    if "## Risk Dependencies" in template_text:
        pattern = r"(\| Risk\s*\| Dependency\s*\| Dependency Owner\s*\| Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{risk_dep_table}\n\n", template_text, flags=re.DOTALL)
    if "## Risk Mitigation Plan" in template_text:
        pattern = r"(\| Risk ID\s*\| Mitigation Action\s*\| Owner\s*\| Target Date\s*\| Current Status \|\n\| [-:\s|]+ \|\n).*?(\n\n|---)"
        template_text = re.sub(pattern, rf"\g<1>{risk_mit_table}\n\n", template_text, flags=re.DOTALL)

    return template_text, f"{report_type}-report-{report_uuid}.pdf", report_uuid

