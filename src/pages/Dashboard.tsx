import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, KanbanSquare, ShieldCheck, Activity, Lightbulb, Clock } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import KpiCard from "@/components/shared/KpiCard";
import EnhancedKpiCard from "@/components/shared/EnhancedKpiCard";
import JourneyTracker from "@/components/shared/JourneyTracker";
import FocusTodayCard from "@/components/shared/FocusTodayCard";
import InsightCard from "@/components/shared/InsightCard";
import TrendIndicator from "@/components/shared/TrendIndicator";
import { RiskBadge } from "@/components/shared/Badges";
import { BeginnerHint } from "@/components/shared/States";
import { useIsBeginner, useIsExpert } from "@/state/CopilotContext";
import {
  regulations,
  maps,
  audits,
  complianceTrend,
  mapProgress,
  journeySteps,
  focusToday,
  kpiDetails,
  recentActivity,
  complianceTimeline,
  executiveInsights,
} from "@/mocks";

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

      <JourneyTracker steps={journeySteps} />

      <FocusTodayCard {...focusToday} />

      <div className={`grid gap-3 ${isExpert ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
        <EnhancedKpiCard
          label="Compliance Health"
          value={`${kpiDetails.health.current}%`}
          tone="success"
          icon={<Activity className="h-4 w-4" />}
          trend={{ value: kpiDetails.health.delta, suffix: "%", label: "vs last mo." }}
          progress={{ current: kpiDetails.health.current, target: kpiDetails.health.target, label: `Target ${kpiDetails.health.target}%` }}
          subMetrics={[
            { label: "Previous", value: `${kpiDetails.health.previous}%` },
            { label: "Target", value: `${kpiDetails.health.target}%` },
          ]}
        />
        <EnhancedKpiCard
          label="Audit Readiness"
          value={`${kpiDetails.auditReadiness.score}%`}
          tone="info"
          icon={<ShieldCheck className="h-4 w-4" />}
          trend={{ value: 4, suffix: "%" }}
          subMetrics={[
            { label: "Open findings", value: kpiDetails.auditReadiness.openFindings, tone: "warning" },
            { label: "Missing evidence", value: kpiDetails.auditReadiness.missingEvidence, tone: "danger" },
            { label: "Controls verified", value: kpiDetails.auditReadiness.controlsVerified, tone: "success" },
            { label: "Departments", value: audits.length },
          ]}
        />
        <EnhancedKpiCard
          label="Active Regulations"
          value={kpiDetails.activeRegulations.total}
          icon={<BookOpen className="h-4 w-4" />}
          trend={{ value: kpiDetails.activeRegulations.newThisWeek, suffix: " new" }}
          subMetrics={[
            { label: "New this week", value: kpiDetails.activeRegulations.newThisWeek, tone: "info" },
            { label: "High risk", value: kpiDetails.activeRegulations.highRisk, tone: "danger" },
          ]}
        />
        <EnhancedKpiCard
          label="Pending MAPs"
          value={kpiDetails.pendingMaps.pending + kpiDetails.pendingMaps.assigned}
          tone="warning"
          icon={<KanbanSquare className="h-4 w-4" />}
          trend={{ value: -2, suffix: "", inverse: true, label: "vs last wk" }}
          subMetrics={[
            { label: "Pending", value: kpiDetails.pendingMaps.pending, tone: "warning" },
            { label: "Overdue", value: kpiDetails.pendingMaps.overdue, tone: "danger" },
            { label: "Assigned", value: kpiDetails.pendingMaps.assigned, tone: "info" },
            { label: "Completed", value: kpiDetails.pendingMaps.completed, tone: "success" },
          ]}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="section-container p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Compliance trend</div>
            <TrendIndicator value={6} label="vs last mo." />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={complianceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Score"]} />
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
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">MAP progress (last 4 weeks)</div>
            <TrendIndicator value={31} label="completion" />
          </div>
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
          <div className="space-y-2">
            {executiveInsights.map((i) => (
              <InsightCard key={i.title} title={i.title} description={i.description} severity={i.severity} trend={i.trend} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="section-container lg:col-span-2">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            Recent regulation activity
            <button onClick={() => nav("/regulations")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Regulation</th>
                  <th>Source</th>
                  <th>Change Type</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((r) => (
                  <tr key={r.id} className="cursor-pointer" onClick={() => nav("/regulations")}>
                    <td>
                      <div className="font-medium">{r.title}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{r.id}</div>
                    </td>
                    <td className="text-muted-foreground">{r.source}</td>
                    <td><span className="text-xs px-2 py-0.5 border border-border rounded bg-muted/40">{r.changeType}</span></td>
                    <td><RiskBadge risk={r.risk} /></td>
                    <td className="text-muted-foreground text-xs">{r.status}</td>
                    <td className="text-muted-foreground text-xs">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-container p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Clock className="h-4 w-4 text-primary" /> Compliance timeline
          </div>
          <JourneyTracker variant="compact" steps={complianceTimeline} />
        </div>
      </div>

    </div>
  );
}
