import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import { BeginnerHint, EmptyState } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { useOrgProfile } from "@/state/OrgProfileContext";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert, Award } from "lucide-react";

const BASE_MATRIX = [
  { department: "Compliance", impact: 92, risk: "High", priority: "P1", action: "Update KYC procedures within 30 days" },
  { department: "Legal", impact: 58, risk: "Medium", priority: "P2", action: "Re-paper FLDG contracts with LSPs" },
  { department: "IT", impact: 65, risk: "Medium", priority: "P2", action: "Build DLA quarterly reporting pipeline" },
  { department: "Cybersecurity", impact: 88, risk: "High", priority: "P1", action: "Patch CVE-2026-3344 across CBS nodes" },
  { department: "Operations", impact: 71, risk: "Medium", priority: "P2", action: "Roll out V-CIP as preferred onboarding" },
  { department: "Audit", impact: 34, risk: "Low", priority: "P3", action: "Refresh audit evidence repository" },
  { department: "Risk Management", impact: 50, risk: "Medium", priority: "P2", action: "Align risk thresholds with new guidelines" }
];

function RiskBadge({ risk }: { risk: string }) {
  let badgeClass = "badge-medium";
  if (risk === "High" || risk === "Critical") badgeClass = "badge-high";
  if (risk === "Low") badgeClass = "badge-low";
  return (
    <span className={`badge ${badgeClass} text-[9px] font-bold`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {risk}
    </span>
  );
}

export default function ImpactAnalysis() {
  const isBeginner = useIsBeginner();
  const { orgProfile } = useOrgProfile();
  const selectedDepts = orgProfile.departments || [];

  const [matrix, setMatrix] = useState<any[]>(BASE_MATRIX);
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [impactHistory, setImpactHistory] = useState<any[]>([]);

  const loadImpactHistory = () => {
    api.listImpactHistory()
      .then((res) => {
        setImpactHistory(res || []);
      })
      .catch((err) => console.error("Failed to load impact history", err));
  };

  useEffect(() => {
    api.listComparisons()
      .then((res) => {
        setComparisons(res || []);
        const lastId = localStorage.getItem("acris.last_comparison_id");
        if (lastId) {
          setSelectedCompId(lastId);
        } else if (res && res.length > 0) {
          setSelectedCompId(res[0].comparisonId);
        }
      })
      .catch((err) => console.error("Failed to load comparisons list", err));
    loadImpactHistory();
  }, []);

  useEffect(() => {
    if (!selectedCompId) {
      setMatrix(BASE_MATRIX);
      return;
    }
    localStorage.setItem("acris.last_comparison_id", selectedCompId);
    setLoading(true);
    api.impact(selectedCompId)
      .then((res) => {
        setMatrix(res.matrix || BASE_MATRIX);
        setLoading(false);
        loadImpactHistory();
      })
      .catch((err) => {
        toast({ title: "Failed to load impact analysis", description: err.message, variant: "destructive" });
        setMatrix(BASE_MATRIX);
        setLoading(false);
      });
  }, [selectedCompId]);

  const filteredMatrix = useMemo(() => {
    if (selectedDepts.length === 0) return matrix;
    return matrix.filter(item => selectedDepts.includes(item.department));
  }, [matrix, selectedDepts]);

  const filteredRiskDist = useMemo(() => {
    return [
      { name: "Low", value: filteredMatrix.filter((m) => m.risk === "Low").length, color: "#10B981" },
      { name: "Medium", value: filteredMatrix.filter((m) => m.risk === "Medium").length, color: "#F59E0B" },
      { name: "High", value: filteredMatrix.filter((m) => m.risk === "High").length, color: "#EF4444" },
    ];
  }, [filteredMatrix]);

  const p1Count = useMemo(() => {
    return filteredMatrix.filter(m => m.priority === "P1").length;
  }, [filteredMatrix]);

  const maxRisk = useMemo(() => {
    if (filteredMatrix.some(m => m.risk === "High")) return { val: "High", color: "text-rose-500", icon: ShieldAlert };
    if (filteredMatrix.some(m => m.risk === "Medium")) return { val: "Medium", color: "text-amber-500", icon: AlertTriangle };
    return { val: "Low", color: "text-emerald-500", icon: ShieldCheck };
  }, [filteredMatrix]);

  const totalExposureVal = useMemo(() => {
    const sumImpact = filteredMatrix.reduce((acc, m) => acc + m.impact, 0);
    if (sumImpact === 0) return "₹0";
    const lakhs = (sumImpact * 15000) / 100000;
    return `₹${lakhs.toFixed(1)}L`;
  }, [filteredMatrix]);

  const avgReadiness = useMemo(() => {
    const sumImpact = filteredMatrix.reduce((acc, m) => acc + m.impact, 0);
    if (filteredMatrix.length === 0) return "100%";
    const score = Math.max(10, Math.min(100, 100 - Math.round((sumImpact / filteredMatrix.length) * 0.3)));
    return `${score}%`;
  }, [filteredMatrix]);

  if (comparisons.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <PageHeader title="Impact Analysis Center" subtitle="Cross-departmental impact assessment with risk-weighted prioritization" />
        {isBeginner && (
          <BeginnerHint>
            Analyze departmental impact matrix mappings representing operational, legal, or IT priorities.
          </BeginnerHint>
        )}
        <EmptyState 
          title="No impact data available" 
          description="Please upload and execute a document comparison in the Document Analysis Workspace." 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Decision Intelligence & Impact</h1>
          <p className="text-xs text-muted-foreground mt-1">Cross-departmental impact assessment with risk-weighted prioritization</p>
        </div>
      </div>

      {isBeginner && (
        <BeginnerHint>
          Higher impact scores signify heavy organizational changes. Focus heavily on P1 priority actions first.
        </BeginnerHint>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Running decision matrix logic...</span>
        </div>
      ) : (
        <>
          {/* Bento Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 flex flex-col justify-between">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Operational Impact</div>
              <div className="flex items-center gap-2">
                <maxRisk.icon className={`h-5 w-5 ${maxRisk.color}`} />
                <span className={`text-xl font-extrabold ${maxRisk.color}`}>{maxRisk.val}</span>
              </div>
            </div>
            
            <div className="glass-card p-4 flex flex-col justify-between">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Financial Exposure</div>
              <div className="text-xl font-extrabold text-amber-500">{totalExposureVal}</div>
              <span className="text-[9px] text-muted-foreground font-medium mt-1">Estimated remediation cost</span>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Regulatory Risk</div>
              <div className="text-xl font-extrabold text-rose-500">{p1Count} P1 Issues</div>
              <span className="text-[9px] text-muted-foreground font-medium mt-1">Immediate action required</span>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Audit Readiness</div>
              <div className="text-xl font-extrabold text-emerald-500">{avgReadiness}</div>
              <span className="text-[9px] text-emerald-500 font-medium mt-1">+5 vs last cycle</span>
            </div>
          </div>

          {/* Selector bar */}
          <div className="glass-card p-4 flex flex-wrap items-center gap-3">
            {comparisons.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">Active Circular:</span>
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                  className="premium-select text-xs h-9 min-w-[200px] bg-background focus:outline-none"
                >
                  <option value="">Static Default Demo</option>
                  {comparisons.map((c) => (
                    <option key={c.comparisonId} value={c.comparisonId}>
                      {c.newDocumentTitle.substring(0, 16)}... vs {c.oldDocumentTitle.substring(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Impact score bar chart */}
            <div className="glass-card p-5 lg:col-span-2 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Departmental Impact Scores</h3>
                <p className="text-[10px] text-muted-foreground">Comparative scoring of change severity by segment</p>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredMatrix} layout="vertical" margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip contentStyle={{ 
                      background: "var(--glass-bg)", 
                      border: "1px solid var(--glass-border)",
                      borderRadius: "8px", 
                      color: "var(--foreground)" 
                    }} />
                    <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                      {filteredMatrix.map((m, i) => (
                        <Cell key={i} fill={m.risk === "High" ? "#EF4444" : m.risk === "Medium" ? "#F59E0B" : "#10B981"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Distribution Chart */}
            <div className="glass-card p-5 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Severity Split</h3>
                <p className="text-[10px] text-muted-foreground">Distribution of risk grades</p>
              </div>
              <div className="h-[180px] flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={filteredRiskDist} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} label={{ fontSize: 10 }}>
                      {filteredRiskDist.map((d) => <Cell key={d.name} fill={d.color} />)}
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
              <div className="space-y-1.5 mt-2 pt-2 border-t border-border/60">
                {filteredRiskDist.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name} Risk</span>
                    </div>
                    <span style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved runs history */}
            <div className="glass-card p-5 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Saved Assessments</h3>
                <p className="text-[10px] text-muted-foreground">Recent historical evaluations</p>
              </div>
              {impactHistory.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg p-6 bg-muted/10 text-center">
                  <span className="text-xs text-muted-foreground italic font-semibold">No history generated yet</span>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[220px]">
                  {impactHistory.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => {
                        setSelectedCompId(h.comparisonId);
                        setMatrix(h.matrix);
                      }}
                      className={`p-2.5 border rounded-lg cursor-pointer transition-all hover:bg-muted/40 ${
                        selectedCompId === h.comparisonId ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground truncate" title={`${h.newDocumentTitle} vs ${h.oldDocumentTitle}`}>
                        {h.newDocumentTitle} vs {h.oldDocumentTitle}
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1.5 font-bold">
                        <span>{new Date(h.created_at).toLocaleDateString()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                          h.riskLevel === "High" ? "bg-rose-500/10 text-rose-500" 
                          : h.riskLevel === "Medium" ? "bg-amber-500/10 text-amber-500" 
                          : "bg-emerald-500/10 text-emerald-500"
                        }`}>
                          {h.riskLevel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Department Impact Matrix Table */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border text-xs font-bold text-foreground uppercase tracking-wider bg-muted/10">
              Department Impact Matrix
            </div>
            <div className="overflow-x-auto w-full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Impact Score</th>
                    <th>Risk Grade</th>
                    <th>Priority</th>
                    <th>Recommended SOP Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrix.map((m) => (
                    <tr key={m.department}>
                      <td className="font-bold text-foreground">{m.department}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${m.impact}%`, 
                                background: m.risk === "High" ? "#EF4444" : m.risk === "Medium" ? "#F59E0B" : "#10B981" 
                              }} 
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-foreground">{m.impact}</span>
                        </div>
                      </td>
                      <td><RiskBadge risk={m.risk} /></td>
                      <td>
                        <span className="font-mono text-xs font-extrabold text-foreground px-2 py-0.5 rounded bg-muted border border-border">
                          {m.priority}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground font-semibold">{m.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
