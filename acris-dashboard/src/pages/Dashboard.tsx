import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, BookOpen, KanbanSquare, ShieldCheck, Activity,
  Lightbulb, ArrowUpRight, ArrowDownRight, TrendingUp,
  Globe, ExternalLink, ShieldAlert
} from "lucide-react";
import { BeginnerHint, SkeletonPage } from "@/components/shared/States";
import { useIsBeginner, useIsExpert } from "@/state/CopilotContext";
import { api } from "@/lib/api";
import { useOrgProfile } from "@/state/OrgProfileContext";

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
    <div className="bg-popover border border-border rounded-lg p-3 shadow-md">
      <div className="text-[11px] text-muted-foreground font-semibold mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs text-foreground">
          <div className="width-2 h-2 rounded-full" style={{ width: 8, height: 8, background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">{p.value}{p.name === "score" ? "%" : ""}</span>
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
  intensity = 6,
  glowColor = "rgba(59,130,246,0.1)",
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
        cardRef.current.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      }
    });
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    cancelAnimationFrame(rafRef.current);
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateY(0)";
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className={`glass-card p-5 ${className}`}
      style={{
        cursor: onClick ? "pointer" : "default",
        willChange: "transform",
        transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease",
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background: hovered ? `radial-gradient(circle at 50% 0%, ${glowColor} 0%, transparent 60%)` : "transparent",
        transition: "background 0.3s ease",
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────
   RISK BADGE
   ──────────────────────────────────────────────── */
function RiskBadge({ risk }: { risk: string }) {
  let badgeClass = "badge-medium";
  if (risk === "High" || risk === "Critical") badgeClass = "badge-high";
  if (risk === "Low") badgeClass = "badge-low";
  
  return (
    <span className={`badge ${badgeClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {risk}
    </span>
  );
}

/* ────────────────────────────────────────────────
   AI INSIGHT BRIEFING ROW
   ──────────────────────────────────────────────── */
function InsightRow({ title, desc, severity, trend }: {
  title: string; desc: string; severity: string; trend?: { value: number; suffix?: string };
}) {
  let borderStyle = "border-l-4 border-l-success";
  let titleColor = "text-emerald-600 dark:text-emerald-400";
  if (severity === "High" || severity === "Critical") {
    borderStyle = "border-l-4 border-l-destructive";
    titleColor = "text-rose-600 dark:text-rose-400";
  } else if (severity === "Medium") {
    borderStyle = "border-l-4 border-l-warning";
    titleColor = "text-amber-600 dark:text-amber-400";
  }

  const isUp = (trend?.value ?? 0) >= 0;

  return (
    <div className={`p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-all ${borderStyle} flex flex-col gap-1`}>
      <div className="flex justify-between items-start gap-4">
        <h4 className={`text-xs font-bold ${titleColor} leading-snug flex-1`}>{title}</h4>
        {trend && (
          <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
            {isUp ? "↑" : "↓"}{Math.abs(trend.value)}{trend.suffix ?? ""}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   MAIN DASHBOARD
   ──────────────────────────────────────────────── */
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

      setMaps(mappedMaps);
      setLoading(false);
    }).catch((err) => {
      console.error("Dashboard data load failed", err);
      if (!active) return;
      setData({
        score: 0,
        total: 0,
        completed: 0,
        overdue: 0,
        departments: [],
        recentActivity: [],
        insights: [],
        complianceTrend: [],
        mapProgress: []
      });
      setMaps([]);
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
    const high = filteredMaps.filter((m) => m.severity === "High" || m.severity === "Critical").length;
    const medium = filteredMaps.filter((m) => m.severity === "Medium").length;
    const low = filteredMaps.filter((m) => m.severity === "Low").length;
    return [
      { name: "High", value: high },
      { name: "Medium", value: medium },
      { name: "Low", value: low },
    ];
  }, [filteredMaps]);

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

  const RISK_COLORS: Record<string, string> = {
    High: "#EF4444",
    Medium: "#F59E0B",
    Low: "#10B981",
  };

  const kpiCards: CardMeta[] = [
    {
      label: "Compliance Score",
      value: `${personalizedScore}%`,
      subtitle: "Target: 95% · Active monitor",
      color: "#3B82F6",
      glowColor: "rgba(59,130,246,0.1)",
      icon: Activity,
      ring: { current: personalizedScore, max: 100 },
    },
    {
      label: "Audit Readiness",
      value: `${personalizedScore}%`,
      subtitle: `${openFindings} open findings · ${missingEvidence} missing`,
      color: "#06B6D4",
      glowColor: "rgba(6,182,212,0.1)",
      icon: ShieldCheck,
    },
    {
      label: "Active Regulations",
      value: regs.length,
      subtitle: `${highRiskCount} critical priority updates`,
      color: "#8B5CF6",
      glowColor: "rgba(139,92,246,0.1)",
      icon: BookOpen,
    },
    {
      label: "Pending MAPs",
      value: pendingMaps,
      subtitle: `${overdueMaps} overdue · ${completedMaps} done`,
      color: "#F59E0B",
      glowColor: "rgba(245,158,11,0.1)",
      icon: KanbanSquare,
      ring: { current: completedMaps, max: totalMaps || 1 },
    },
    {
      label: "Risk Exposure",
      value: `${highRiskCount + overdueMaps}`,
      subtitle: "High priority flags detected",
      color: "#EF4444",
      glowColor: "rgba(239,68,68,0.1)",
      icon: ShieldAlert,
    }
  ];

  if (loading || !data) {
    return <SkeletonPage />;
  }

  const hasData = isExpert
    ? (maps.length > 0 || (data?.total ?? 0) > 0)
    : (maps.length > 0 || regs.length > 0);

  if (!hasData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Executive Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">Real-time compliance posture overview</p>
          </div>
        </div>

        <div className="glass-card flex flex-col items-center justify-center p-16 text-center border rounded-xl" style={{ minHeight: "380px" }}>
          <ShieldCheck className="h-16 w-16 text-primary animate-pulse mb-6" />
          <h2 className="text-lg font-bold mb-2">Initialize Compliance Workspace</h2>
          <p className="text-xs text-muted-foreground max-w-md mb-8 leading-relaxed">
            No active compliance circulars or MAP tasks were found. Choose your mode to start:
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => nav("/regulations")}
              className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg text-xs hover:opacity-90 transition-opacity uppercase tracking-wider"
            >
              Browse Regulations
            </button>
            <button
              onClick={() => nav("/document-analysis")}
              className="border border-border bg-card font-semibold px-5 py-2.5 rounded-lg text-xs hover:bg-muted/50 transition-colors uppercase tracking-wider text-foreground"
            >
              Upload Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Executive Overview</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time compliance posture · Regulations, MAPs & Audit readiness
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/reports")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wider"
          >
            <TrendingUp style={{ width: 14, height: 14 }} /> Export Report
          </button>
        </div>
      </div>

      {isBeginner && (
        <BeginnerHint>
          This is the compliance dashboard. Each Bento Grid panel represents a key executive monitor. Click any card to drill down or switch layout density using the "Expert Mode" toggle in the header.
        </BeginnerHint>
      )}

      {/* ── Row 1: Executive KPI Bento Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card, i) => (
          <MagneticCard
            key={card.label}
            glowColor={card.glowColor}
            className="flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center border"
                style={{ 
                  background: `${card.color}12`, 
                  borderColor: `${card.color}25` 
                }}
              >
                <card.icon style={{ width: 16, height: 16, color: card.color }} />
              </div>
              {card.ring && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {card.ring.current}%
                </span>
              )}
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {card.label}
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-foreground mb-1.5">
                {card.value}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium leading-tight">
                {card.subtitle}
              </div>
            </div>

            {card.ring && (
              <div className="mt-4">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${(card.ring.current / card.ring.max) * 100}%`,
                      background: `linear-gradient(90deg, ${card.color}, ${card.color}b0)`
                    }}
                  />
                </div>
              </div>
            )}
          </MagneticCard>
        ))}
      </div>

      {/* ── Row 2: Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Trend Chart */}
        <MagneticCard className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-foreground">Compliance Trend</h3>
              <p className="text-[11px] text-muted-foreground">6-month rolling posture score against target</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+6.2% vs Q1</span>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.complianceTrend} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis domain={[70, 100]} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  name="score" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fill="url(#scoreGrad)" 
                  dot={{ fill: "#3B82F6", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#3B82F6", stroke: "white", strokeWidth: 1.5 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MagneticCard>

        {/* Risk Distribution Donut Chart */}
        <MagneticCard className="flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">Risk Distribution</h3>
            <p className="text-[11px] text-muted-foreground">Regulation count by severity mapping</p>
          </div>

          <div className="h-[140px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={riskDist} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={45} 
                  outerRadius={60}
                  strokeWidth={0} 
                  paddingAngle={4}
                >
                  {riskDist.map((d) => (
                    <Cell key={d.name} fill={RISK_COLORS[d.name] || "#64748B"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ 
                  background: "var(--glass-bg)", 
                  border: "1px solid var(--glass-border)",
                  borderRadius: "8px", 
                  color: "var(--foreground)" 
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4 pt-2 border-t border-border">
            {riskDist.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLORS[d.name] }} />
                  <span className="text-muted-foreground font-semibold">{d.name} Severity</span>
                </div>
                <span className="font-bold" style={{ color: RISK_COLORS[d.name] }}>{d.value}</span>
              </div>
            ))}
          </div>
        </MagneticCard>
      </div>

      {/* ── Row 3: Insights & Department Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Insights briefing */}
        <MagneticCard className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">AI Intelligence Briefing</h3>
              <p className="text-[11px] text-muted-foreground">Automated compliance triggers & actions</p>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {personalizedInsights.slice(0, 3).map((insight: any, i: number) => (
              <InsightRow 
                key={insight.title || i} 
                title={insight.title} 
                desc={insight.description} 
                severity={insight.severity} 
                trend={insight.trend} 
              />
            ))}
            {personalizedInsights.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">All systems nominal. No urgent insights detected.</p>
            )}
          </div>
        </MagneticCard>

        {/* Department Readiness scorecard */}
        <MagneticCard className="flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Departmental Status</h3>
              <p className="text-[11px] text-muted-foreground">Individual audit compliance scorecards</p>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px]">
            {filteredDepartments.map((dept: any) => {
              const score = dept.readinessScore;
              const scoreColor = score >= 85 ? "text-emerald-500" : score >= 75 ? "text-amber-500" : "text-rose-500";
              const progressBg = score >= 85 ? "bg-emerald-500" : score >= 75 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={dept.department} className="space-y-1 bg-muted/10 p-2.5 rounded-lg border border-border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">{dept.department}</span>
                    <span className={`font-extrabold ${scoreColor}`}>{score}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progressBg}`} style={{ width: `${score}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>{dept.openFindings} findings pending</span>
                    <span className="font-semibold uppercase tracking-wider">{dept.risk} Risk</span>
                  </div>
                </div>
              );
            })}
          </div>
        </MagneticCard>
      </div>

      {/* ── Row 4: Recent Activities ── */}
      <div className="grid grid-cols-1 gap-4">
        <MagneticCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isExpert ? "Active Compliance Actions (MAP)" : "Recent Regulation Activity"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isExpert ? "Milestone Action Plan status and accountability tracker" : "Live updates parsed from regulatory authorities"}
              </p>
            </div>
            <button
              onClick={() => nav(isExpert ? "/maps" : "/regulations")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-transparent rounded-lg transition-colors"
            >
              View All <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            {isExpert ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action Item</th>
                    <th>Owner</th>
                    <th>Clause Ref</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaps.slice(0, 5).map((m: any, idx: number) => (
                    <tr key={idx} onClick={() => nav("/maps")} className="cursor-pointer">
                      <td>
                        <div className="font-bold text-foreground">{m.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{m.id}</div>
                      </td>
                      <td>
                        <span className="badge badge-info bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                          {m.owner}
                        </span>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted border border-border text-muted-foreground">
                          {m.regulationId}
                        </span>
                      </td>
                      <td><RiskBadge risk={m.severity} /></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            m.status === "Completed" ? "bg-emerald-500" : m.status === "In Progress" ? "bg-primary" : "bg-amber-500"
                          }`} />
                          <span className="text-xs text-muted-foreground font-semibold">{m.status}</span>
                        </div>
                      </td>
                      <td className="text-xs text-muted-foreground font-medium">{m.dueDate}</td>
                    </tr>
                  ))}
                  {filteredMaps.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8 text-xs font-medium">
                        No MAP tasks generated. Upload documents to synthesize compliance actions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
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
                  {filteredRecentActivity.slice(0, 5).map((r: any, idx: number) => (
                    <tr key={idx} onClick={() => nav("/regulations")} className="cursor-pointer">
                      <td>
                        <div className="font-bold text-foreground">{r.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{r.id}</div>
                      </td>
                      <td>
                        <span className="badge badge-info bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                          {r.source}
                        </span>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted border border-border text-muted-foreground">
                          {r.changeType}
                        </span>
                      </td>
                      <td><RiskBadge risk={r.risk} /></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${r.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span className="text-xs text-muted-foreground font-semibold">{r.status}</span>
                        </div>
                      </td>
                      <td className="text-xs text-muted-foreground font-medium">{r.time}</td>
                    </tr>
                  ))}
                  {filteredRecentActivity.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8 text-xs font-medium">
                        No recent activity parsed for active filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </MagneticCard>
      </div>
    </div>
  );
}
