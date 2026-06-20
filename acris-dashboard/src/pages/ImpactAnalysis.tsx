import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import KpiCard from "@/components/shared/KpiCard";
import { RiskBadge } from "@/components/shared/Badges";
import { BeginnerHint } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { useOrgProfile } from "@/state/OrgProfileContext";

const BASE_MATRIX = [
  { department: "Compliance", impact: 92, risk: "High", priority: "P1", action: "Update KYC procedures within 30 days" },
  { department: "Legal", impact: 58, risk: "Medium", priority: "P2", action: "Re-paper FLDG contracts with LSPs" },
  { department: "Operations", impact: 71, risk: "Medium", priority: "P2", action: "Roll out V-CIP as preferred onboarding" },
  { department: "IT", impact: 65, risk: "Medium", priority: "P2", action: "Build DLA quarterly reporting pipeline" },
  { department: "Cybersecurity", impact: 88, risk: "High", priority: "P1", action: "Patch CVE-2026-3344 across CBS nodes" },
  { department: "Audit", impact: 34, risk: "Low", priority: "P3", action: "Refresh audit evidence repository" },
  { department: "Risk Management", impact: 50, risk: "Medium", priority: "P2", action: "Align risk thresholds with new guidelines" }
];

const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 };

export default function ImpactAnalysis() {
  const isBeginner = useIsBeginner();
  const { orgProfile } = useOrgProfile();
  const selectedDepts = orgProfile.departments || [];

  const filteredMatrix = useMemo(() => {
    if (selectedDepts.length === 0) return BASE_MATRIX;
    return BASE_MATRIX.filter(item => selectedDepts.includes(item.department));
  }, [selectedDepts]);

  const filteredRiskDist = useMemo(() => {
    return [
      { name: "Low", value: filteredMatrix.filter((m) => m.risk === "Low").length, color: "hsl(var(--success))" },
      { name: "Medium", value: filteredMatrix.filter((m) => m.risk === "Medium").length, color: "hsl(var(--warning))" },
      { name: "High", value: filteredMatrix.filter((m) => m.risk === "High").length, color: "hsl(var(--destructive))" },
    ];
  }, [filteredMatrix]);

  const p1Count = useMemo(() => {
    return filteredMatrix.filter(m => m.priority === "P1").length;
  }, [filteredMatrix]);

  const maxRisk = useMemo(() => {
    if (filteredMatrix.some(m => m.risk === "High")) return { val: "High", tone: "danger" as const };
    if (filteredMatrix.some(m => m.risk === "Medium")) return { val: "Medium", tone: "warning" as const };
    return { val: "Low", tone: "success" as const };
  }, [filteredMatrix]);

  return (
    <div className="space-y-6">
      <PageHeader title="Impact Analysis Center" subtitle="Cross-departmental impact assessment with risk-weighted prioritization" />

      {isBeginner && (
        <BeginnerHint>
          The matrix below shows how new regulations affect each department. Higher impact scores mean
          more work is needed; P1 items should be addressed first.
        </BeginnerHint>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Operational Impact" value={maxRisk.val} tone={maxRisk.tone} />
        <KpiCard label="Financial Exposure" value="₹12.5L" tone="warning" delta="estimated remediation" />
        <KpiCard label="Regulatory Risk" value={`${p1Count} P1`} tone={p1Count > 0 ? "danger" : "info"} />
        <KpiCard label="Audit Readiness" value="83%" tone="info" delta="+5 vs. last cycle" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="section-container p-4 lg:col-span-2">
          <div className="text-sm font-semibold mb-3">Department impact scores</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={filteredMatrix} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={100} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                {filteredMatrix.map((m, i) => (
                  <Cell key={i} fill={m.risk === "High" ? "hsl(var(--destructive))" : m.risk === "Medium" ? "hsl(var(--warning))" : "hsl(var(--success))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="section-container p-4">
          <div className="text-sm font-semibold mb-3">Risk distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={filteredRiskDist} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75} label={{ fontSize: 11 }}>
                {filteredRiskDist.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section-container">
        <div className="px-4 py-3 border-b text-sm font-semibold">Department impact matrix</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Impact Score</th>
              <th>Risk</th>
              <th>Priority</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatrix.map((m) => (
              <tr key={m.department}>
                <td className="font-medium">{m.department}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full" style={{ width: `${m.impact}%`, background: m.risk === "High" ? "hsl(var(--destructive))" : m.risk === "Medium" ? "hsl(var(--warning))" : "hsl(var(--success))" }} />
                    </div>
                    <span className="text-xs tabular-nums">{m.impact}</span>
                  </div>
                </td>
                <td><RiskBadge risk={m.risk} /></td>
                <td><span className="font-mono text-xs font-semibold">{m.priority}</span></td>
                <td className="text-muted-foreground">{m.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
