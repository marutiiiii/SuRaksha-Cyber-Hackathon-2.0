import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, BookOpen, KanbanSquare, ShieldCheck, Activity,
  Lightbulb, Clock, ArrowUpRight, ArrowDownRight, TrendingUp,
  Zap, Globe, Target, ChevronRight, ExternalLink
} from "lucide-react";
import { BeginnerHint, SkeletonPage } from "@/components/shared/States";
import { useIsBeginner, useIsExpert } from "@/state/CopilotContext";
import { api } from "@/lib/api";

/* ────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────── */
interface CardMeta {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
  color: string;
  glowColor: string;
  icon: React.ElementType;
  ring?: { current: number; max: number };
}

/* ────────────────────────────────────────────────
   CUSTOM TOOLTIP
──────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(7,13,31,0.96)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
    }}>
      <div style={{ color: "rgba(148,163,184,0.7)", fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#F8FAFC" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ color: "rgba(148,163,184,0.7)" }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.value}{p.name === "score" ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────────
   3D MAGNETIC CARD WRAPPER
──────────────────────────────────────────────── */
function MagneticCard({
  children,
  className = "",
  style = {},
  intensity = 8,
  glowColor = "rgba(59,130,246,0.15)",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  intensity?: number;
  glowColor?: string;
  onClick?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -intensity;
    const ry = ((x - cx) / cx) * intensity;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transform =
          `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px) scale(1.01)`;
        cardRef.current.style.boxShadow =
          `0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.2), 0 0 40px ${glowColor}`;
      }
    });
  }, [intensity, glowColor]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    cancelAnimationFrame(rafRef.current);
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(1200px) rotateX(0) rotateY(0) translateZ(0) scale(1)";
      cardRef.current.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)";
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className={`glass-card ${className}`}
      style={{
        cursor: onClick ? "pointer" : "default",
        willChange: "transform",
        transition: "transform 0.1s ease, box-shadow 0.3s ease",
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Inner glow effect */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background: hovered ? `radial-gradient(circle at 50% 0%, ${glowColor} 0%, transparent 60%)` : "transparent",
        transition: "background 0.4s ease",
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────
   SCORE RING
──────────────────────────────────────────────── */
function ScoreRing({
  value,
  max = 100,
  size = 72,
  strokeWidth = 5,
  color = "#3B82F6",
  trackColor = "rgba(255,255,255,0.06)",
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = animated / max;
  const offset = circumference * (1 - progress);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.23,1,0.32,1)", filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: size < 80 ? 14 : 20, fontWeight: 800, color: "#F8FAFC"
      }}>
        {Math.round(animated)}%
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   KPI CARD
──────────────────────────────────────────────── */
function KpiCard({ card, delay = 0 }: { card: CardMeta; delay?: number }) {
  const [count, setCount] = useState(0);
  const numericValue = typeof card.value === "number" ? card.value : parseFloat(card.value as string) || 0;
  const displayValue = card.value;
  const isUp = (card.delta ?? 0) >= 0;

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const stepValue = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + stepValue, numericValue);
      setCount(Math.round(current));
      if (current >= numericValue) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [numericValue]);

  return (
    <MagneticCard
      glowColor={card.glowColor}
      style={{ padding: "1.25rem", animationDelay: `${delay}ms` }}
      className="animate-fade-in-up"
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${card.color}22 0%, ${card.color}11 100%)`,
          border: `1px solid ${card.color}33`,
        }}>
          <card.icon style={{ width: 16, height: 16, color: card.color }} />
        </div>
        {card.delta !== undefined && (
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            fontSize: 11, fontWeight: 700,
            color: isUp ? "#34D399" : "#FB7185",
            background: isUp ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
            border: `1px solid ${isUp ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}`,
            padding: "2px 8px", borderRadius: 9999,
          }}>
            {isUp ? <ArrowUpRight style={{ width: 10, height: 10 }} /> : <ArrowDownRight style={{ width: 10, height: 10 }} />}
            {Math.abs(card.delta)}{card.deltaLabel ?? ""}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.6)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
          {card.label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{
            fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em",
            background: `linear-gradient(135deg, ${card.color} 0%, ${card.glowColor.replace(/rgba?\([^)]+\)/, card.color)} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            color: card.color,
          }}>
            {typeof card.value === "string" ? displayValue : count}
          </span>
        </div>
        {card.subtitle && (
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 2 }}>
            {card.subtitle}
          </div>
        )}
      </div>

      {card.ring && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10, color: "rgba(148,163,184,0.5)" }}>
            <span>Progress</span>
            <span style={{ color: card.color }}>{card.ring.current}/{card.ring.max}</span>
          </div>
          <div style={{ height: 3, borderRadius: 9999, background: "rgba(255,255,255,0.06)" }}>
            <div style={{
              height: "100%",
              width: `${(card.ring.current / card.ring.max) * 100}%`,
              borderRadius: 9999,
              background: `linear-gradient(90deg, ${card.color}, ${card.color}88)`,
              boxShadow: `0 0 8px ${card.color}55`,
              transition: "width 1.2s cubic-bezier(0.23,1,0.32,1) 0.5s"
            }} />
          </div>
        </div>
      )}
    </MagneticCard>
  );
}

/* ────────────────────────────────────────────────
   RISK BADGE
──────────────────────────────────────────────── */
function RiskBadge({ risk }: { risk: string }) {
  const cfg: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    High: { bg: "rgba(244,63,94,0.1)", color: "#FB7185", border: "rgba(244,63,94,0.25)", dot: "#F43F5E" },
    Medium: { bg: "rgba(245,158,11,0.1)", color: "#FCD34D", border: "rgba(245,158,11,0.25)", dot: "#F59E0B" },
    Low: { bg: "rgba(16,185,129,0.1)", color: "#34D399", border: "rgba(16,185,129,0.25)", dot: "#10B981" },
    Critical: { bg: "rgba(239,68,68,0.12)", color: "#F87171", border: "rgba(239,68,68,0.3)", dot: "#EF4444" },
  };
  const c = cfg[risk] ?? cfg["Medium"];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
      borderRadius: 9999, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, boxShadow: `0 0 4px ${c.dot}` }} />
      {risk}
    </div>
  );
}

/* ────────────────────────────────────────────────
   INSIGHT CARD
──────────────────────────────────────────────── */
function InsightRow({ title, desc, severity, trend }: {
  title: string; desc: string; severity: string; trend?: { value: number; suffix?: string };
}) {
  const sev: Record<string, { color: string; bg: string; border: string }> = {
    High: { color: "#FB7185", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.2)" },
    Medium: { color: "#FCD34D", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
    Low: { color: "#34D399", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
  };
  const s = sev[severity] ?? sev["Low"];
  const isUp = (trend?.value ?? 0) >= 0;

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10, marginBottom: 8,
      background: s.bg, border: `1px solid ${s.border}`,
      transition: "all 0.2s ease",
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: s.color, lineHeight: 1.4, flex: 1 }}>{title}</div>
        {trend && (
          <div style={{
            fontSize: 11, fontWeight: 700, color: isUp ? "#34D399" : "#FB7185",
            display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginLeft: 8
          }}>
            {isUp ? "↑" : "↓"} {Math.abs(trend.value)}{trend.suffix ?? ""}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   MAIN DASHBOARD
──────────────────────────────────────────────── */
import { useOrgProfile } from "@/state/OrgProfileContext";

export default function Dashboard() {
  const nav = useNavigate();
  const isBeginner = useIsBeginner();
  const isExpert = useIsExpert();
  const { orgProfile } = useOrgProfile();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeRegsCount, setActiveRegsCount] = useState(8);
  const [highRiskCount, setHighRiskCount] = useState(3);
  const [regs, setRegs] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);

  // Cursor proximity tracking for ambient glow
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.auditReadiness(),
      api.regulationsLatest(),
      api.listMaps().catch(() => [])
    ]).then(([res, regRes, mapsRes]) => {
      if (!active) return;
      setData(res);
      
      const regList = regRes || [];
      const filteredRegList = regList.filter((r: any) => 
        orgProfile.enabledSources.length === 0 || orgProfile.enabledSources.includes(r.source)
      );
      setRegs(filteredRegList);
      if (filteredRegList.length > 0) {
        setActiveRegsCount(filteredRegList.length);
        const highRisk = filteredRegList.filter((r: any) => r.risk === "High" || r.risk_level === "High").length;
        setHighRiskCount(highRisk);
      } else {
        setActiveRegsCount(0);
        setHighRiskCount(0);
      }

      const mappedMaps = (mapsRes || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        owner: m.owner || "Compliance Team",
        ownerInitials: m.owner ? m.owner.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "CT",
        department: m.owner ? m.owner.replace(" Team", "") : "Compliance",
        dueDate: m.deadline || new Date().toISOString().slice(0, 10),
        severity: m.severity,
        status: m.status,
        regulationId: m.clause_ref || "Circular"
      }));

      const mockMapsData = [
        { id: "MAP-001", title: "Update KYC Verification Workflow", department: "Compliance", severity: "High", status: "In Progress", dueDate: "2026-06-15" },
        { id: "MAP-002", title: "Re-paper FLDG contracts", department: "Legal", severity: "High", status: "Assigned", dueDate: "2026-06-30" },
        { id: "MAP-003", title: "Stand up DLA quarterly reporting", department: "IT", severity: "Medium", status: "Pending", dueDate: "2026-07-10" },
        { id: "MAP-004", title: "Patch Java middleware CVE-2026-3344", department: "Cybersecurity", severity: "Critical", status: "In Progress", dueDate: "2026-05-27" },
        { id: "MAP-005", title: "Update materiality policy", department: "Compliance", severity: "Medium", status: "Review", dueDate: "2026-06-05" },
        { id: "MAP-006", title: "UPI velocity rules rollout", department: "IT", severity: "Medium", status: "Pending", dueDate: "2026-06-20" },
        { id: "MAP-007", title: "Train insider trading designated persons", department: "HR", severity: "Low", status: "Completed", dueDate: "2026-05-30" },
        { id: "MAP-008", title: "Refresh vendor risk templates", department: "Procurement", severity: "Low", status: "Assigned", dueDate: "2026-06-12" },
        { id: "MAP-009", title: "Configure V-CIP as default", department: "Operations", severity: "High", status: "Pending", dueDate: "2026-06-25" },
      ];

      let baseList = mappedMaps.length > 0 ? mappedMaps : mockMapsData;
      const personalizedTasks: any[] = [];
      if (orgProfile.services.includes("UPI")) {
        personalizedTasks.push({ id: "MAP-UPI-01", department: "IT", status: "Pending", severity: "High", dueDate: "2026-07-15" });
      }
      if (orgProfile.services.includes("KYC Services")) {
        personalizedTasks.push({ id: "MAP-KYC-01", department: "Operations", status: "In Progress", severity: "Critical", dueDate: "2026-06-30" });
      }
      if (orgProfile.services.includes("Loans")) {
        personalizedTasks.push({ id: "MAP-LOAN-01", department: "Risk Management", status: "Assigned", severity: "High", dueDate: "2026-07-20" });
      }
      if (orgProfile.services.includes("Credit Cards")) {
        personalizedTasks.push({ id: "MAP-CARD-01", department: "Compliance", status: "Pending", severity: "Medium", dueDate: "2026-08-05" });
      }

      setMaps([...baseList, ...personalizedTasks]);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setData({
        score: 84,
        total: 9,
        completed: 1,
        overdue: 1,
        departments: [
          { department: "Compliance", readinessScore: 88, openFindings: 3, criticalFindings: 1, closedFindings: 18, missingEvidence: 2, risk: "Low" },
          { department: "Legal", readinessScore: 85, openFindings: 4, criticalFindings: 0, closedFindings: 11, missingEvidence: 1, risk: "Low" },
          { department: "Operations", readinessScore: 76, openFindings: 7, criticalFindings: 2, closedFindings: 22, missingEvidence: 3, risk: "Medium" },
          { department: "IT", readinessScore: 82, openFindings: 5, criticalFindings: 1, closedFindings: 19, missingEvidence: 3, risk: "Medium" },
          { department: "Cybersecurity", readinessScore: 71, openFindings: 9, criticalFindings: 3, closedFindings: 14, missingEvidence: 3, risk: "High" },
          { department: "Audit", readinessScore: 91, openFindings: 1, criticalFindings: 0, closedFindings: 24, missingEvidence: 3, risk: "Low" },
          { department: "Risk Management", readinessScore: 80, openFindings: 2, criticalFindings: 0, closedFindings: 15, missingEvidence: 1, risk: "Low" }
        ],
        recentActivity: [
          { id: "RBI-2026-001", title: "Digital Lending Master Direction", source: "RBI", changeType: "Modified", risk: "High", status: "Active", time: "2h ago" },
          { id: "CERT-2026-006", title: "Critical Java Middleware CVE", source: "CERT-In", changeType: "New", risk: "High", status: "Active", time: "4h ago" },
          { id: "NPCI-2026-005", title: "UPI Velocity & Risk Controls", source: "NPCI", changeType: "Updated", risk: "Medium", status: "Active", time: "1d ago" },
          { id: "SEBI-2026-012", title: "Algorithmic Trading Framework", source: "SEBI", changeType: "New", risk: "High", status: "Draft", time: "2d ago" },
          { id: "MCA-2026-003", title: "Corporate Governance Revision", source: "MCA", changeType: "Modified", risk: "Low", status: "Active", time: "3d ago" },
        ],
        complianceTrend: [
          { month: "Dec", score: 78 }, { month: "Jan", score: 80 }, { month: "Feb", score: 82 },
          { month: "Mar", score: 81 }, { month: "Apr", score: 85 }, { month: "May", score: 84 },
        ],
        mapProgress: [
          { week: "W1", completed: 4, inProgress: 6, pending: 5 },
          { week: "W2", completed: 6, inProgress: 5, pending: 4 },
          { week: "W3", completed: 9, inProgress: 4, pending: 3 },
          { week: "W4", completed: 1, inProgress: 8, pending: 2 },
        ],
      });
      
      const mockMapsData = [
        { id: "MAP-001", title: "Update KYC Verification Workflow", department: "Compliance", severity: "High", status: "In Progress", dueDate: "2026-06-15" },
        { id: "MAP-002", title: "Re-paper FLDG contracts", department: "Legal", severity: "High", status: "Assigned", dueDate: "2026-06-30" },
        { id: "MAP-003", title: "Stand up DLA quarterly reporting", department: "IT", severity: "Medium", status: "Pending", dueDate: "2026-07-10" },
        { id: "MAP-004", title: "Patch Java middleware CVE-2026-3344", department: "Cybersecurity", severity: "Critical", status: "In Progress", dueDate: "2026-05-27" },
        { id: "MAP-005", title: "Update materiality policy", department: "Compliance", severity: "Medium", status: "Review", dueDate: "2026-06-05" },
        { id: "MAP-006", title: "UPI velocity rules rollout", department: "IT", severity: "Medium", status: "Pending", dueDate: "2026-06-20" },
        { id: "MAP-007", title: "Train insider trading designated persons", department: "HR", severity: "Low", status: "Completed", dueDate: "2026-05-30" },
        { id: "MAP-008", title: "Refresh vendor risk templates", department: "Procurement", severity: "Low", status: "Assigned", dueDate: "2026-06-12" },
        { id: "MAP-009", title: "Configure V-CIP as default", department: "Operations", severity: "High", status: "Pending", dueDate: "2026-06-25" },
      ];
      const personalizedTasks: any[] = [];
      if (orgProfile.services.includes("UPI")) {
        personalizedTasks.push({ id: "MAP-UPI-01", department: "IT", status: "Pending", severity: "High", dueDate: "2026-07-15" });
      }
      if (orgProfile.services.includes("KYC Services")) {
        personalizedTasks.push({ id: "MAP-KYC-01", department: "Operations", status: "In Progress", severity: "Critical", dueDate: "2026-06-30" });
      }
      if (orgProfile.services.includes("Loans")) {
        personalizedTasks.push({ id: "MAP-LOAN-01", department: "Risk Management", status: "Assigned", severity: "High", dueDate: "2026-07-20" });
      }
      if (orgProfile.services.includes("Credit Cards")) {
        personalizedTasks.push({ id: "MAP-CARD-01", department: "Compliance", status: "Pending", severity: "Medium", dueDate: "2026-08-05" });
      }
      setMaps([...mockMapsData, ...personalizedTasks]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [orgProfile.services]);

  const filteredDepartments = useMemo(() => {
    if (!data?.departments) return [];
    const selected = orgProfile.departments || [];
    if (selected.length === 0) return data.departments;
    return data.departments.filter((d: any) => selected.includes(d.department));
  }, [data?.departments, orgProfile.departments]);

  const openFindings = useMemo(() => {
    return filteredDepartments.reduce((sum: number, d: any) => sum + d.openFindings, 0);
  }, [filteredDepartments]);

  const missingEvidence = useMemo(() => {
    return filteredDepartments.reduce((sum: number, d: any) => sum + d.missingEvidence, 0);
  }, [filteredDepartments]);

  const personalizedScore = useMemo(() => {
    if (filteredDepartments.length === 0) return data?.score || 84;
    const sum = filteredDepartments.reduce((acc: number, d: any) => acc + d.readinessScore, 0);
    return Math.round(sum / filteredDepartments.length);
  }, [filteredDepartments, data?.score]);

  const filteredMaps = useMemo(() => {
    const selectedDepts = orgProfile.departments || [];
    if (selectedDepts.length === 0) return maps;
    return maps.filter((m: any) => selectedDepts.includes(m.department));
  }, [maps, orgProfile.departments]);

  const totalMaps = filteredMaps.length;
  const completedMaps = filteredMaps.filter((m: any) => m.status === "Completed").length;
  const pendingMaps = totalMaps - completedMaps;
  const overdueMaps = filteredMaps.filter((m: any) => m.status !== "Completed" && new Date(m.dueDate) < new Date()).length;

  const filteredRecentActivity = useMemo(() => {
    const list = data?.recentActivity || [];
    const enabled = orgProfile.enabledSources || [];
    if (enabled.length === 0) return list;
    return list.filter((r: any) => enabled.includes(r.source));
  }, [data?.recentActivity, orgProfile.enabledSources]);

  const riskDist = useMemo(() => {
    return [
      { name: "High", value: regs.filter((r) => r.risk === "High" || r.risk_level === "High").length || 3 },
      { name: "Medium", value: regs.filter((r) => r.risk === "Medium" || r.risk_level === "Medium").length || 3 },
      { name: "Low", value: regs.filter((r) => r.risk === "Low" || r.risk_level === "Low").length || 2 },
    ];
  }, [regs]);

  const RISK_COLORS: Record<string, string> = {
    High: "#F43F5E",
    Medium: "#F59E0B",
    Low: "#10B981",
  };

  const personalizedInsights = useMemo(() => {
    const list = [];
    
    // Insight 1: Industry-specific urgent warning
    if (orgProfile.industryType === "Banking") {
      list.push({
        title: "Urgent: RBI & CERT-In alignment required",
        description: `For ${orgProfile.orgName || "your bank"}, RBI's new IT Governance directions require alignment with CERT-In incident reporting SLAs. Check IT and Cybersecurity workflows.`,
        severity: "High",
        trend: { value: 14, suffix: "%" }
      });
    } else {
      list.push({
        title: "Urgent: FinTech FLDG & KYC Compliance",
        description: "New RBI guidelines require FinTechs offering digital lending to audit First Loss Default Guarantee agreements and enforce V-CIP journeys.",
        severity: "High",
        trend: { value: 18, suffix: "%" }
      });
    }

    // Insight 2: Size-specific recommendation
    if (orgProfile.orgSize === "Enterprise") {
      list.push({
        title: "Enterprise Audit Readiness Recommendation",
        description: `With ${filteredDepartments.length} departments active, enforce quarterly internal cross-audits to clear ${openFindings} open findings before final regulatory submission.`,
        severity: "Medium",
        trend: { value: 8, suffix: "%" }
      });
    } else if (orgProfile.orgSize === "Startup" || orgProfile.orgSize === "Small") {
      list.push({
        title: "Lean Startup Compliance Recommendation",
        description: "Focus resources on core IT & Cybersecurity patch compliance (7-day CERT-In SLA) to avoid penalties. Delegate minor compliance tasks.",
        severity: "Medium",
        trend: { value: 12, suffix: "%" }
      });
    } else {
      list.push({
        title: "Compliance Readiness Recommendation",
        description: `Ensure the ${filteredDepartments.map(d => d.department).join(", ") || "selected"} departments review recent circular updates.`,
        severity: "Medium",
        trend: { value: 5, suffix: "%" }
      });
    }

    // Insight 3: Operations & Findings
    const criticalDepts = filteredDepartments.filter((d: any) => d.risk === "High");
    if (criticalDepts.length > 0) {
      list.push({
        title: "High Risk Exposure in Core Units",
        description: `Critical findings detected in ${criticalDepts.map(d => d.department).join(", ")}. Prioritize MAP task assignments immediately.`,
        severity: "High",
        trend: { value: -5, suffix: "%" }
      });
    } else {
      list.push({
        title: "Operational Compliance Health",
        description: `Overall compliance health is stable. ${missingEvidence} pieces of evidence are missing across active units.`,
        severity: "Low",
        trend: { value: 4, suffix: "%" }
      });
    }

    return list;
  }, [orgProfile, filteredDepartments, openFindings, missingEvidence]);

  const kpiCards: CardMeta[] = [
    {
      label: "Compliance Health",
      value: `${personalizedScore}%`,
      delta: 6,
      deltaLabel: "%",
      subtitle: "Target: 95% · On track",
      color: "#3B82F6",
      glowColor: "rgba(59,130,246,0.15)",
      icon: Activity,
      ring: { current: personalizedScore, max: 100 },
    },
    {
      label: "Audit Readiness",
      value: `${personalizedScore}%`,
      delta: 4,
      deltaLabel: "%",
      subtitle: `${openFindings} open findings · ${missingEvidence} missing`,
      color: "#06B6D4",
      glowColor: "rgba(6,182,212,0.15)",
      icon: ShieldCheck,
    },
    {
      label: "Active Regulations",
      value: regs.length || activeRegsCount,
      delta: 3,
      deltaLabel: " new",
      subtitle: `${regs.filter(r => r.risk === "High" || r.risk_level === "High").length} high risk this week`,
      color: "#8B5CF6",
      glowColor: "rgba(139,92,246,0.15)",
      icon: BookOpen,
    },
    {
      label: "Pending MAPs",
      value: pendingMaps,
      delta: -2,
      deltaLabel: " vs last wk",
      subtitle: `${overdueMaps} overdue · ${completedMaps} completed`,
      color: "#F59E0B",
      glowColor: "rgba(245,158,11,0.15)",
      icon: KanbanSquare,
      ring: { current: completedMaps, max: totalMaps || 1 },
    },
  ];

  const chartTooltipStyle = {
    background: "rgba(7,13,31,0.96)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    fontSize: 12,
    color: "#F8FAFC",
  };

  return (
    <div ref={mainRef} className="space-y-5 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)"
            }}>
              <LayoutDashboardIcon />
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{
              background: "linear-gradient(135deg, #F8FAFC 30%, rgba(248,250,252,0.6) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
            }}>
              Executive Dashboard
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", marginLeft: 44 }}>
            Real-time compliance posture · Regulations, MAPs & Audit readiness
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)"
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981", animation: "pulse-slow 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#34D399" }}>Systems Operational</span>
          </div>
          <button
            onClick={() => nav("/reports")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
              color: "#60A5FA", cursor: "pointer", transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.18)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.1)"; }}
          >
            <TrendingUp style={{ width: 13, height: 13 }} /> Export Report
          </button>
        </div>
      </div>

      {isBeginner && (
        <BeginnerHint>
          This is the executive overview. Each card below shows a key compliance metric. Click any card to drill into details. Switch to Expert mode in the top bar for a denser layout.
        </BeginnerHint>
      )}

      {/* ── KPI Cards ── */}
      <div className={`grid gap-4 ${isExpert ? "grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
        {kpiCards.map((card, i) => (
          <KpiCard key={card.label} card={card} delay={i * 75} />
        ))}
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Compliance Trend */}
        <MagneticCard className="lg:col-span-2 animate-fade-in-up delay-300" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", marginBottom: 2 }}>Compliance Trend</div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>6-month rolling · Score vs target</div>
            </div>
            <div style={{ display: "flex", items: "center", gap: 6 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                fontSize: 11, fontWeight: 700, color: "#34D399"
              }}>
                <ArrowUpRight style={{ width: 11, height: 11 }} /> +6% vs last month
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.complianceTrend} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "rgba(148,163,184,0.5)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: "rgba(148,163,184,0.5)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" name="score" stroke="#3B82F6" strokeWidth={2.5}
                fill="url(#scoreGrad)" dot={{ fill: "#3B82F6", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#60A5FA", boxShadow: "0 0 10px #3B82F6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </MagneticCard>

        {/* Risk Distribution */}
        <MagneticCard className="animate-fade-in-up delay-375" style={{ padding: "1.25rem" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", marginBottom: 2 }}>Risk Distribution</div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>By regulation severity</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68}
                strokeWidth={0} paddingAngle={3}>
                {riskDist.map((d) => (
                  <Cell key={d.name} fill={RISK_COLORS[d.name] || "#64748B"}
                    style={{ filter: `drop-shadow(0 0 6px ${RISK_COLORS[d.name] || "#64748B"}88)` }} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {riskDist.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: RISK_COLORS[d.name], boxShadow: `0 0 6px ${RISK_COLORS[d.name]}` }} />
                  <span style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: RISK_COLORS[d.name] }}>{d.value}</span>
              </div>
            ))}
          </div>
        </MagneticCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* MAP Progress */}
        <MagneticCard className="lg:col-span-2 animate-fade-in-up delay-400" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", marginBottom: 2 }}>MAP Progress</div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>Last 4 weeks · Completion velocity</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {[{ label: "Completed", color: "#10B981" }, { label: "In Progress", color: "#3B82F6" }, { label: "Pending", color: "#F59E0B" }]
                .map(({ label, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>{label}</span>
                  </div>
                ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.mapProgress} margin={{ top: 5, right: 5, bottom: 0, left: -15 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "rgba(148,163,184,0.5)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(148,163,184,0.5)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="completed" name="Completed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]}
                style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.4))" }} />
              <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#3B82F6"
                style={{ filter: "drop-shadow(0 0 4px rgba(59,130,246,0.4))" }} />
              <Bar dataKey="pending" name="Pending" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]}
                style={{ filter: "drop-shadow(0 0 4px rgba(245,158,11,0.4))" }} />
            </BarChart>
          </ResponsiveContainer>
        </MagneticCard>

        {/* Executive Insights */}
        <MagneticCard className="animate-fade-in-up delay-475" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <Lightbulb style={{ width: 13, height: 13, color: "#A78BFA" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>AI Insights</div>
              <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)" }}>Powered by ACRIS Copilot</div>
            </div>
          </div>
          <div>
            {personalizedInsights.map((i: any) => (
              <InsightRow key={i.title} title={i.title} desc={i.description} severity={i.severity} trend={i.trend} />
            ))}
          </div>
        </MagneticCard>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Recent Regulation Activity */}
        <MagneticCard className="lg:col-span-2 animate-fade-in-up delay-500" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", marginBottom: 1 }}>
                Recent Regulation Activity
              </div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>Live regulatory intelligence feed</div>
            </div>
            <button
              onClick={() => nav("/regulations")}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#60A5FA",
                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.15)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.08)"; }}
            >
              View all <ExternalLink style={{ width: 10, height: 10 }} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Regulation</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecentActivity.map((r: any, idx: number) => (
                  <tr key={idx} onClick={() => nav("/regulations")} style={{ cursor: "pointer" }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#F8FAFC", marginBottom: 1 }}>{r.title}</div>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{r.id}</div>
                    </td>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                        background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)",
                        color: "#60A5FA"
                      }}>{r.source}</span>
                    </td>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(148,163,184,0.7)"
                      }}>{r.changeType}</span>
                    </td>
                    <td><RiskBadge risk={r.risk} /></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: r.status === "Active" ? "#10B981" : "#F59E0B",
                          boxShadow: r.status === "Active" ? "0 0 4px #10B981" : "0 0 4px #F59E0B"
                        }} />
                        <span style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>{r.status}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MagneticCard>

        {/* Department Readiness */}
        <MagneticCard className="animate-fade-in-up delay-575" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}>
              <Globe style={{ width: 13, height: 13, color: "#06B6D4" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>Dept. Readiness</div>
              <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)" }}>By compliance score</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredDepartments.map((dept: any, i: number) => {
              const score = dept.readinessScore;
              const scoreColor = score >= 85 ? "#10B981" : score >= 75 ? "#F59E0B" : "#F43F5E";
              return (
                <div key={dept.department}
                  style={{
                    animationDelay: `${600 + i * 80}ms`,
                    transition: "transform 0.2s ease",
                  }}
                  className="animate-fade-in-up"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(0)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(248,250,252,0.85)" }}>{dept.department}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor }}>{score}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                    <div style={{
                      height: "100%",
                      width: `${score}%`,
                      borderRadius: 9999,
                      background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)`,
                      boxShadow: `0 0 6px ${scoreColor}55`,
                      transition: `width 1.4s cubic-bezier(0.23,1,0.32,1) ${0.4 + i * 0.08}s`
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{dept.openFindings} open</span>
                    <RiskBadge risk={dept.risk} />
                  </div>
                </div>
              );
            })}
          </div>
        </MagneticCard>
      </div>
    </div>
  );
}

/* small inline icon to avoid import issue */
function LayoutDashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}
