import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, KanbanSquare, ShieldCheck, Activity, Lightbulb } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import KpiCard from "@/components/shared/KpiCard";
import { RiskBadge } from "@/components/shared/Badges";
import { BeginnerHint } from "@/components/shared/States";
import { useIsBeginner, useIsExpert } from "@/state/CopilotContext";
import { regulations, maps, audits, insights, complianceTrend, mapProgress } from "@/mocks";

const riskDist = [
  { name: "High", value: regulations.filter((r) => r.risk === "High").length, color: "hsl(var(--risk-high))" },
  { name: "Medium", value: regulations.filter((r) => r.risk === "Medium").length, color: "hsl(var(--risk-medium))" },
  { name: "Low", value: regulations.filter((r) => r.risk === "Low").length, color: "hsl(var(--risk-low))" },
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  fontSize: 12,
};

export default function Dashboard() {
  const nav = useNavigate();
  const isBeginner = useIsBeginner();
  const isExpert = useIsExpert();
  const healthScore = Math.round(audits.reduce((a, d) => a + d.readinessScore, 0) / audits.length);
  const highRiskAlerts = regulations.filter((r) => r.risk === "High").length;
  const pendingMaps = maps.filter((m) => m.status !== "Completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Compliance posture across regulations, action points, and audit readiness"
      />

      {isBeginner && (
        <BeginnerHint>
          This is the executive overview. Each card below shows a key compliance metric. Click any card
          to drill into details. Switch to Expert mode in the top bar for a denser layout.
        </BeginnerHint>
      )}

      <div className="section-container border-l-4 p-4" style={{ borderLeftColor: "hsl(var(--destructive))" }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 text-destructive" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-destructive">High Priority Action Required</div>
            <div className="text-sm mt-1">
              CERT-In CVE-2026-3344 patch window closes in 4 days. 12 nodes still unpatched.
            </div>
          </div>
          <button onClick={() => nav("/maps")} className="bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium rounded hover:opacity-90">
            View MAPs
          </button>
        </div>
      </div>

      <div className={`grid gap-3 ${isExpert ? "grid-cols-3 lg:grid-cols-6" : "grid-cols-2 lg:grid-cols-3"}`}>
        <KpiCard label="Compliance Health" value={`${healthScore}%`} tone="success" icon={<Activity className="h-4 w-4" />} delta="+6 vs. last month" />
        <KpiCard label="Active Regulations" value={regulations.length} icon={<BookOpen className="h-4 w-4" />} delta="3 new this week" />
        <KpiCard label="Pending MAPs" value={pendingMaps} tone="warning" icon={<KanbanSquare className="h-4 w-4" />} />
        <KpiCard label="High-Risk Alerts" value={highRiskAlerts} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <KpiCard label="Audit Readiness" value={`${healthScore}%`} tone="info" icon={<ShieldCheck className="h-4 w-4" />} />
        <KpiCard label="Department Exposure" value={audits.filter((a) => a.risk !== "Low").length} tone="warning" delta="2 high-risk" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="section-container p-4 lg:col-span-2">
          <div className="text-sm font-semibold mb-3">Compliance trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={complianceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="section-container p-4">
          <div className="text-sm font-semibold mb-3">Risk distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                {riskDist.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="section-container p-4 lg:col-span-2">
          <div className="text-sm font-semibold mb-3">MAP progress (last 4 weeks)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mapProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="completed" stackId="a" fill="hsl(var(--success))" />
              <Bar dataKey="inProgress" stackId="a" fill="hsl(var(--info))" />
              <Bar dataKey="pending" stackId="a" fill="hsl(var(--warning))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="section-container p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Lightbulb className="h-4 w-4 text-primary" /> Executive insights
          </div>
          <div className="space-y-3">
            {insights.map((i) => (
              <div key={i.title} className="border-l-2 pl-3" style={{ borderLeftColor: i.severity === "High" ? "hsl(var(--destructive))" : i.severity === "Medium" ? "hsl(var(--warning))" : "hsl(var(--success))" }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium">{i.title}</span>
                  <RiskBadge risk={i.severity} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{i.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-container">
        <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
          Recent regulations
          <button onClick={() => nav("/regulations")} className="text-xs text-primary hover:underline">View all</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Source</th>
              <th>Published</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {regulations.slice(0, 5).map((r) => (
              <tr key={r.id} className="cursor-pointer" onClick={() => nav("/regulations")}>
                <td className="font-mono text-xs">{r.id}</td>
                <td className="font-medium">{r.title}</td>
                <td className="text-muted-foreground">{r.source}</td>
                <td className="text-muted-foreground">{r.publishedDate}</td>
                <td><RiskBadge risk={r.risk} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
