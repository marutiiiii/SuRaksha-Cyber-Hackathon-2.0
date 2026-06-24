export type Risk = "High" | "Medium" | "Low";
export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface Regulation {
  id: string;
  title: string;
  source: "RBI" | "SEBI" | "NPCI" | "CERT-In" | "Internal";
  publishedDate: string;
  riskScore: number;
  risk: Risk;
  status: "Active" | "Under Review" | "Pending" | "Archived";
  impactedDepartments: string[];
  summary: string;
  obligations: string[];
  suggestedActions: string[];
  related: string[];
}

export const regulations: Regulation[] = [
  {
    id: "RBI-2026-001",
    title: "Master Direction on Digital Lending Guidelines",
    source: "RBI",
    publishedDate: "2026-05-15",
    riskScore: 88,
    risk: "High",
    status: "Active",
    impactedDepartments: ["Compliance", "IT", "Operations", "Legal"],
    summary:
      "Sets out mandatory disclosure norms for Digital Lending Apps (DLAs), First Loss Default Guarantee (FLDG) caps, and customer grievance mechanisms.",
    obligations: [
      "Disclose APR, fees and recovery practices upfront",
      "Cap FLDG arrangements at 5% of loan portfolio",
      "Onboard a Grievance Redressal Officer",
      "Quarterly reporting to RBI on DLA performance",
    ],
    suggestedActions: [
      "Update loan onboarding UX to surface APR",
      "Re-paper FLDG contracts with partner LSPs",
      "Stand up DLA quarterly reporting pipeline",
    ],
    related: ["RBI-2026-007", "RBI-2026-012"],
  },
  {
    id: "RBI-2026-002",
    title: "Master Direction on KYC (Amendment 2026)",
    source: "RBI",
    publishedDate: "2026-04-08",
    riskScore: 92,
    risk: "High",
    status: "Active",
    impactedDepartments: ["Compliance", "Risk Management", "Operations"],
    summary:
      "Shifts high-risk customer CDD from biennial to annual cadence; elevates V-CIP from permissive to preferred.",
    obligations: [
      "Annual KYC refresh for high-risk customers",
      "Document risk re-categorization at each touchpoint",
      "Quarterly KYC compliance reporting to RBI",
    ],
    suggestedActions: [
      "Reschedule CDD review cycles in core banking",
      "Configure V-CIP as default flow for remote onboarding",
    ],
    related: ["RBI-2026-001"],
  },
  {
    id: "SEBI-2026-003",
    title: "LODR Amendment — Materiality Threshold",
    source: "SEBI",
    publishedDate: "2026-04-04",
    riskScore: 64,
    risk: "Medium",
    status: "Under Review",
    impactedDepartments: ["Compliance", "Legal", "Investor Relations"],
    summary:
      "Lowers materiality threshold for event disclosures under Regulation 30, increasing the frequency of mandatory disclosures.",
    obligations: [
      "Disclose all material events within 12 hours",
      "Maintain a documented materiality policy",
    ],
    suggestedActions: ["Refresh materiality policy", "Train IR team on new thresholds"],
    related: ["SEBI-2026-006"],
  },
  {
    id: "SEBI-2026-004",
    title: "Circular on Insider Trading Compliance Windows",
    source: "SEBI",
    publishedDate: "2026-04-07",
    riskScore: 71,
    risk: "Medium",
    status: "Active",
    impactedDepartments: ["Compliance", "Legal", "HR"],
    summary: "Expands definition of 'connected person' and tightens trading window restrictions.",
    obligations: ["Update trading window calendar", "Re-train designated persons"],
    suggestedActions: ["Roll out updated insider trading policy"],
    related: [],
  },
  {
    id: "NPCI-2026-005",
    title: "UPI Transaction Limit & Risk Controls",
    source: "NPCI",
    publishedDate: "2026-05-02",
    riskScore: 58,
    risk: "Medium",
    status: "Active",
    impactedDepartments: ["IT", "Operations", "Risk Management"],
    summary: "Introduces velocity checks and per-merchant caps for UPI Lite and UPI 123Pay.",
    obligations: ["Enforce velocity limits", "Capture merchant MCC for risk scoring"],
    suggestedActions: ["Update payments switch rules", "Add merchant analytics dashboards"],
    related: [],
  },
  {
    id: "CERT-2026-006",
    title: "CERT-In Advisory: Critical Banking Sector Vulnerabilities",
    source: "CERT-In",
    publishedDate: "2026-05-20",
    riskScore: 95,
    risk: "High",
    status: "Active",
    impactedDepartments: ["Cybersecurity", "IT"],
    summary: "Zero-day disclosed in widely-used Java middleware affecting core banking integrations.",
    obligations: ["Patch within 7 days", "File incident report if exploited"],
    suggestedActions: ["Run emergency patch cycle", "Notify CISO and audit"],
    related: [],
  },
  {
    id: "INT-2026-007",
    title: "Internal Policy: Third-Party Risk Management",
    source: "Internal",
    publishedDate: "2026-03-21",
    riskScore: 42,
    risk: "Low",
    status: "Active",
    impactedDepartments: ["Procurement", "Compliance", "Risk Management"],
    summary: "Refreshed vendor onboarding checklist and SOC 2 expectations.",
    obligations: ["Annual vendor risk review", "SOC 2 evidence on file"],
    suggestedActions: ["Update vendor portal templates"],
    related: [],
  },
  {
    id: "MCA-2026-008",
    title: "Companies Act — CSR Threshold Revision",
    source: "Internal",
    publishedDate: "2026-04-06",
    riskScore: 38,
    risk: "Low",
    status: "Active",
    impactedDepartments: ["Legal", "Finance"],
    summary: "CSR spending threshold revised from ₹5Cr to ₹3Cr net profit.",
    obligations: ["Re-evaluate CSR applicability"],
    suggestedActions: ["Update CSR policy doc"],
    related: [],
  },
];

export interface RegSource {
  key: Regulation["source"];
  name: string;
  latestUpdate: string;
  risk: Risk;
  activeCount: number;
  status: "Healthy" | "Attention" | "Critical";
}

export const regSources: RegSource[] = [
  { key: "RBI", name: "Reserve Bank of India", latestUpdate: "2026-05-15", risk: "High", activeCount: 42, status: "Critical" },
  { key: "SEBI", name: "Securities & Exchange Board", latestUpdate: "2026-05-12", risk: "Medium", activeCount: 31, status: "Attention" },
  { key: "NPCI", name: "NPCI Circulars", latestUpdate: "2026-05-02", risk: "Medium", activeCount: 14, status: "Attention" },
  { key: "CERT-In", name: "CERT-In Advisories", latestUpdate: "2026-05-20", risk: "High", activeCount: 9, status: "Critical" },
  { key: "Internal", name: "Internal Policies", latestUpdate: "2026-04-28", risk: "Low", activeCount: 27, status: "Healthy" },
];

export type MapStatus = "Pending" | "Assigned" | "In Progress" | "Review" | "Awaiting Validation" | "Completed";

export interface MAP {
  id: string;
  title: string;
  description: string;
  owner: string;
  ownerInitials: string;
  department: string;
  dueDate: string;
  severity: Severity;
  status: MapStatus;
  regulationId: string;
  evidenceRequired: string[];
  impact: string;
}

export const maps: MAP[] = [
  { id: "MAP-001", title: "Update KYC Verification Workflow", description: "Reconfigure CBS to trigger annual KYC review for high-risk segment.", owner: "Aarav Mehta", ownerInitials: "AM", department: "Compliance", dueDate: "2026-06-15", severity: "High", status: "In Progress", regulationId: "RBI-2026-002", evidenceRequired: ["CBS change ticket", "QA sign-off"], impact: "Affects 1.2M high-risk customers." },
  { id: "MAP-002", title: "Re-paper FLDG contracts", description: "Amend FLDG schedules with all LSP partners to cap at 5%.", owner: "Priya Shah", ownerInitials: "PS", department: "Legal", dueDate: "2026-06-30", severity: "High", status: "Assigned", regulationId: "RBI-2026-001", evidenceRequired: ["Signed amendments"], impact: "12 active LSP contracts." },
  { id: "MAP-003", title: "Stand up DLA quarterly reporting", description: "Build pipeline to RBI portal for DLA metrics.", owner: "Rohit Kumar", ownerInitials: "RK", department: "IT", dueDate: "2026-07-10", severity: "Medium", status: "Pending", regulationId: "RBI-2026-001", evidenceRequired: ["Pipeline runbook", "First report submission"], impact: "Operational reporting." },
  { id: "MAP-004", title: "Patch Java middleware CVE-2026-3344", description: "Roll emergency patch across core banking nodes.", owner: "Sneha Iyer", ownerInitials: "SI", department: "Cybersecurity", dueDate: "2026-05-27", severity: "Critical", status: "In Progress", regulationId: "CERT-2026-006", evidenceRequired: ["Patch report", "Vulnerability re-scan"], impact: "Prevents potential breach." },
  { id: "MAP-005", title: "Update materiality policy", description: "Refresh disclosure thresholds per SEBI LODR amendment.", owner: "Karan Nair", ownerInitials: "KN", department: "Compliance", dueDate: "2026-06-05", severity: "Medium", status: "Review", regulationId: "SEBI-2026-003", evidenceRequired: ["Board approval"], impact: "Investor disclosures." },
  { id: "MAP-006", title: "UPI velocity rules rollout", description: "Deploy new velocity rules in payments switch.", owner: "Devika Rao", ownerInitials: "DR", department: "IT", dueDate: "2026-06-20", severity: "Medium", status: "Pending", regulationId: "NPCI-2026-005", evidenceRequired: ["Change record"], impact: "Reduces fraud exposure." },
  { id: "MAP-007", title: "Train insider trading designated persons", description: "Conduct mandatory training on updated windows.", owner: "Ishaan Verma", ownerInitials: "IV", department: "HR", dueDate: "2026-05-30", severity: "Low", status: "Completed", regulationId: "SEBI-2026-004", evidenceRequired: ["Attendance log"], impact: "118 designated persons." },
  { id: "MAP-008", title: "Refresh vendor risk templates", description: "Push new vendor onboarding templates live.", owner: "Meera Joshi", ownerInitials: "MJ", department: "Procurement", dueDate: "2026-06-12", severity: "Low", status: "Assigned", regulationId: "INT-2026-007", evidenceRequired: ["Template version log"], impact: "All net-new vendors." },
  { id: "MAP-009", title: "Configure V-CIP as default", description: "Set V-CIP as preferred onboarding journey.", owner: "Aarav Mehta", ownerInitials: "AM", department: "Operations", dueDate: "2026-06-25", severity: "High", status: "Pending", regulationId: "RBI-2026-002", evidenceRequired: ["Journey screenshots"], impact: "All remote onboarding." },
];

export interface DeptAudit {
  department: string;
  readinessScore: number;
  openFindings: number;
  criticalFindings: number;
  closedFindings: number;
  missingEvidence: number;
  risk: Risk;
}

export const audits: DeptAudit[] = [
  { department: "Compliance", readinessScore: 92, openFindings: 3, criticalFindings: 1, closedFindings: 18, missingEvidence: 2, risk: "Low" },
  { department: "Legal", readinessScore: 88, openFindings: 4, criticalFindings: 0, closedFindings: 11, missingEvidence: 1, risk: "Low" },
  { department: "Operations", readinessScore: 76, openFindings: 7, criticalFindings: 2, closedFindings: 22, missingEvidence: 5, risk: "Medium" },
  { department: "IT", readinessScore: 81, openFindings: 5, criticalFindings: 1, closedFindings: 19, missingEvidence: 3, risk: "Medium" },
  { department: "Cybersecurity", readinessScore: 69, openFindings: 9, criticalFindings: 3, closedFindings: 14, missingEvidence: 6, risk: "High" },
  { department: "Audit", readinessScore: 95, openFindings: 1, criticalFindings: 0, closedFindings: 24, missingEvidence: 0, risk: "Low" },
];

export interface ClauseChange {
  id: string;
  type: "added" | "removed" | "modified";
  severity: Severity;
  department: string;
  summary: string;
  confidence: number;
  oldText?: string;
  newText?: string;
}

export const clauseChanges: ClauseChange[] = [
  { id: "CL-3.2", type: "modified", severity: "High", department: "Compliance", summary: "KYC refresh cadence shortened from biennial to annual for high-risk customers.", confidence: 96, oldText: "Periodic updates of KYC shall be done every 2 years for high-risk customers.", newText: "Periodic updates of KYC shall be done annually for high-risk customers and every 2 years for medium-risk customers." },
  { id: "CL-4.1", type: "modified", severity: "Medium", department: "Operations", summary: "V-CIP elevated from permissive to preferred verification method.", confidence: 91, oldText: "Digital KYC (V-CIP) may be used as an alternative to in-person verification.", newText: "Digital KYC (V-CIP) shall be the preferred method for customer verification." },
  { id: "CL-5.2", type: "added", severity: "High", department: "Compliance", summary: "New quarterly KYC reporting obligation to RBI.", confidence: 98, newText: "Regulated entities must report KYC compliance status quarterly to RBI." },
  { id: "CL-7.4", type: "removed", severity: "Low", department: "Legal", summary: "Removed legacy paper-based archival requirement.", confidence: 87, oldText: "Records shall additionally be archived in physical form for 7 years." },
  { id: "CL-9.1", type: "added", severity: "Critical", department: "Cybersecurity", summary: "Mandatory zero-day patch SLA introduced (7 days).", confidence: 99, newText: "Critical vulnerabilities flagged by CERT-In shall be remediated within 7 days." },
];

export interface Alert {
  id: string;
  message: string;
  time: string;
  risk: Risk;
  regulationId?: string;
}

export const alerts: Alert[] = [
  { id: "A1", message: "RBI KYC Master Direction amended — annual review now required for high-risk customers", time: "2 hours ago", risk: "High", regulationId: "RBI-2026-002" },
  { id: "A2", message: "CERT-In zero-day advisory — patch within 7 days", time: "4 hours ago", risk: "High", regulationId: "CERT-2026-006" },
  { id: "A3", message: "SEBI Insider Trading circular updated — new compliance window definitions", time: "5 hours ago", risk: "Medium", regulationId: "SEBI-2026-004" },
  { id: "A4", message: "NPCI UPI velocity rules effective 2026-06-01", time: "1 day ago", risk: "Medium", regulationId: "NPCI-2026-005" },
  { id: "A5", message: "MCA CSR threshold revised", time: "2 days ago", risk: "Low" },
];

export interface AuditLog {
  source: string;
  clause: string;
  reasoning: string;
  timestamp: string;
}

export const auditLogs: AuditLog[] = [
  { source: "RBI/2026/MD/KYC/04", clause: "Section 3.2", reasoning: "Frequency change detected: biennial → annual for high-risk CDD.", timestamp: "2026-04-08 14:23:01" },
  { source: "SEBI/2026/CIR/IT/07", clause: "Regulation 4(1)", reasoning: "Definition expansion: 'connected person' scope widened.", timestamp: "2026-04-07 09:45:22" },
  { source: "MCA/2026/AMD/CA/03", clause: "Section 135(5)", reasoning: "CSR spending threshold revised from ₹5Cr to ₹3Cr net profit.", timestamp: "2026-04-06 16:12:45" },
  { source: "RBI/2026/CIR/DL/05", clause: "Para 6.3", reasoning: "New mandatory disclosure: FLDG arrangements must be reported.", timestamp: "2026-04-05 11:30:18" },
  { source: "CERT-IN/2026/ADV/09", clause: "Advisory 2026-09", reasoning: "Zero-day Java middleware CVE-2026-3344 disclosed.", timestamp: "2026-05-20 08:01:14" },
];

export interface Insight {
  title: string;
  description: string;
  severity: Risk;
}

export const insights: Insight[] = [
  { title: "KYC backlog risk", severity: "High", description: "Projected 6,400 customers will miss annual KYC SLA at current throughput. Add 2 reviewers or automate V-CIP." },
  { title: "Cyber patch window", severity: "High", description: "12 of 38 nodes still unpatched against CVE-2026-3344. Owner: Sneha Iyer." },
  { title: "Disclosure cadence", severity: "Medium", description: "Materiality threshold change will likely add ~18 disclosures/quarter." },
];

export const complianceTrend = [
  { month: "Dec", score: 78 }, { month: "Jan", score: 80 }, { month: "Feb", score: 82 },
  { month: "Mar", score: 81 }, { month: "Apr", score: 85 }, { month: "May", score: 87 },
];

export const mapProgress = [
  { week: "W1", completed: 4, inProgress: 6, pending: 5 },
  { week: "W2", completed: 6, inProgress: 5, pending: 4 },
  { week: "W3", completed: 9, inProgress: 4, pending: 3 },
  { week: "W4", completed: 12, inProgress: 5, pending: 2 },
];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { clause: string; regulation: string; confidence: number }[];
}

export const presetAnswers: Record<string, ChatMessage> = {
  default: {
    role: "assistant",
    content:
      "I can help summarize regulations, explain clauses in simple or technical language, generate MAPs (Measurable Action Points), and draft audit-ready reports. Try one of the suggested actions.",
  },
  simple: {
    role: "assistant",
    content:
      "In plain terms: banks must now check high-risk customers' KYC every year (instead of every 2 years). Video KYC is preferred over in-person. Reports go to RBI every quarter.",
    citations: [{ clause: "Section 3.2", regulation: "RBI-2026-002", confidence: 96 }],
  },
  technical: {
    role: "assistant",
    content:
      "The amendment modifies the CDD review periodicity under the risk-based approach: high-risk customers move from biennial to annual cadence. V-CIP per RBI Circular DOR.AML.REC.78 is elevated from permissive to preferred. A new quarterly reporting obligation is created under §12 PMLA derivative authority.",
    citations: [
      { clause: "Section 3.2", regulation: "RBI-2026-002", confidence: 96 },
      { clause: "Section 4.1", regulation: "RBI-2026-002", confidence: 91 },
    ],
  },
  maps: {
    role: "assistant",
    content:
      "Generated 3 MAPs:\n• MAP-001 Update KYC Verification Workflow (Compliance, due 2026-06-15)\n• MAP-009 Configure V-CIP as default (Operations, due 2026-06-25)\n• MAP-003 Stand up DLA quarterly reporting (IT, due 2026-07-10)",
  },
  summary: {
    role: "assistant",
    content:
      "Q1–Q2 2026 saw 23 high-risk, 14 medium-risk, and 9 low-risk changes across RBI, SEBI, NPCI, and CERT-In. Most exposure sits with Compliance and Cybersecurity.",
  },
  impact: {
    role: "assistant",
    content:
      "Impact concentrates in Compliance (High), Cybersecurity (High), Operations (Medium). Estimated remediation cost: ₹12.5L. Audit readiness uplift expected: +6 points within 60 days.",
  },
  report: {
    role: "assistant",
    content: "Executive audit report drafted — open the Reports center to preview, print, or export.",
  },
};

export const currentUser = {
  name: "Aarav Mehta",
  initials: "AM",
  role: "Compliance Officer",
  department: "Compliance",
  expertiseScore: 78,
};

// ============== Polish-pass additions ==============

import type { JourneyStep } from "@/components/shared/JourneyTracker";

export const journeySteps: JourneyStep[] = [
  { label: "Regulation Detected", count: 12, progress: 100, status: "complete" },
  { label: "Clause Changes Found", count: 47, progress: 100, status: "complete" },
  { label: "Impact Assessed", count: "8 depts", progress: 100, status: "complete" },
  { label: "MAPs Generated", count: 9, progress: 78, status: "active" },
  { label: "Departments Assigned", count: 6, progress: 60, status: "active" },
  { label: "Audit Ready", count: "84%", progress: 84, status: "pending" },
];

export const focusToday = {
  title: "RBI Digital Lending Circular — KYC Workflow Update",
  regulationId: "RBI-2026-001",
  risk: "High" as const,
  modifiedClauses: 4,
  departments: ["Compliance", "IT", "Operations"],
  recommendation: "Update KYC verification workflow and re-paper FLDG contracts before deadline.",
  deadline: "2026-06-15",
};

export const kpiDetails = {
  health: {
    current: 87,
    previous: 81,
    target: 95,
    delta: 6,
  },
  auditReadiness: {
    score: 84,
    openFindings: 29,
    missingEvidence: 17,
    controlsVerified: 142,
  },
  activeRegulations: {
    total: 8,
    newThisWeek: 3,
    highRisk: 3,
  },
  pendingMaps: {
    pending: 3,
    overdue: 1,
    assigned: 2,
    completed: 1,
  },
};

export interface RecentActivity {
  id: string;
  title: string;
  source: string;
  changeType: "New" | "Modified" | "Updated" | "Archived";
  risk: Risk;
  status: string;
  time: string;
}

export const recentActivity: RecentActivity[] = [
  { id: "RBI-2026-001", title: "Digital Lending Master Direction", source: "RBI", changeType: "Modified", risk: "High", status: "Active", time: "2h ago" },
  { id: "CERT-2026-006", title: "Critical Java Middleware CVE", source: "CERT-In", changeType: "New", risk: "High", status: "Active", time: "4h ago" },
  { id: "NPCI-2026-005", title: "UPI Velocity & Risk Controls", source: "NPCI", changeType: "Updated", risk: "Medium", status: "Active", time: "1d ago" },
  { id: "SEBI-2026-003", title: "LODR Materiality Threshold", source: "SEBI", changeType: "Modified", risk: "Medium", status: "Under Review", time: "2d ago" },
  { id: "MCA-2026-008", title: "CSR Threshold Revision", source: "Internal", changeType: "Updated", risk: "Low", status: "Active", time: "3d ago" },
];

export const complianceTimeline: JourneyStep[] = [
  { label: "Regulation detected — RBI Digital Lending update", count: "2026-05-15", status: "complete" },
  { label: "Impact analyzed across 4 departments", count: "2026-05-17", status: "complete" },
  { label: "9 MAPs generated and assigned", count: "2026-05-18", status: "complete" },
  { label: "Evidence uploaded — 14 of 17 items", count: "in progress", status: "active" },
  { label: "Audit-ready package finalized", count: "pending", status: "pending" },
];

export interface ExecInsight {
  title: string;
  description: string;
  severity: Risk;
  trend?: { value: number; suffix?: string; inverse?: boolean };
}

export const executiveInsights: ExecInsight[] = [
  { title: "3 regulations require attention this week", description: "RBI, CERT-In and NPCI changes overlap on KYC and payments. Prioritize Compliance & IT.", severity: "High", trend: { value: 12, suffix: "%" } },
  { title: "Compliance readiness improved by 6%", description: "Driven by faster MAP closure in Legal and Compliance over the last 30 days.", severity: "Low", trend: { value: 6, suffix: "%" } },
  { title: "Operations has highest risk exposure", description: "7 open findings, 2 critical. Recommend reallocating 2 reviewers to clear backlog.", severity: "Medium", trend: { value: -3, suffix: "%", inverse: true } },
  { title: "Average MAP closure dropped to 4.2 days", description: "Down from 6.1 days last quarter — strongest indicator of operational maturity.", severity: "Low", trend: { value: -31, suffix: "%", inverse: true } },
];

export const findingsHeatmap = [
  { department: "Compliance", critical: 1, high: 2, medium: 0, low: 0 },
  { department: "Legal", critical: 0, high: 1, medium: 3, low: 0 },
  { department: "Operations", critical: 2, high: 3, medium: 2, low: 0 },
  { department: "IT", critical: 1, high: 2, medium: 2, low: 0 },
  { department: "Cybersecurity", critical: 3, high: 4, medium: 2, low: 0 },
  { department: "Audit", critical: 0, high: 0, medium: 1, low: 0 },
];