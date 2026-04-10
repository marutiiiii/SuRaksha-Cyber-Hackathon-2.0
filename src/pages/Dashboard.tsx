import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, TrendingUp, Clock, FileBarChart } from "lucide-react";

const stats = [
  { label: "Total Regulations", value: "1,284", icon: TrendingUp },
  { label: "High Risk Alerts", value: "23", icon: AlertTriangle, accent: true },
  { label: "Pending Actions", value: "47", icon: Clock, warning: true },
  { label: "Reports Generated", value: "156", icon: FileBarChart },
];

const chartData = [
  { month: "Jan", count: 42 },
  { month: "Feb", count: 38 },
  { month: "Mar", count: 55 },
  { month: "Apr", count: 47 },
  { month: "May", count: 62 },
  { month: "Jun", count: 51 },
];

const recentUpdates = [
  { title: "RBI Master Direction on KYC", source: "RBI", date: "2026-04-08", risk: "High" },
  { title: "SEBI Circular on Insider Trading", source: "SEBI", date: "2026-04-07", risk: "Medium" },
  { title: "MCA Amendment to Companies Act", source: "MCA", date: "2026-04-06", risk: "Low" },
  { title: "RBI Guidelines on Digital Lending", source: "RBI", date: "2026-04-05", risk: "High" },
  { title: "SEBI LODR Amendment", source: "SEBI", date: "2026-04-04", risk: "Medium" },
];

const riskColor = (r: string) =>
  r === "High" ? "hsl(var(--risk-high))" : r === "Medium" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";

const riskBg = (r: string) =>
  r === "High" ? "hsl(0 72% 51% / 0.08)" : r === "Medium" ? "hsl(38 92% 50% / 0.08)" : "hsl(142 72% 29% / 0.08)";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle mt-0.5">Compliance overview and recent activity</p>
      </div>

      {/* High Priority Action */}
      <div className="section-container border-l-4" style={{ borderLeftColor: "hsl(var(--risk-high))" }}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" style={{ color: "hsl(var(--risk-high))" }} />
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--risk-high))" }}>High Priority Action Required</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground font-medium">Regulation</span>
            <span>RBI Master Direction on KYC — Annual review now mandatory for high-risk customers</span>
            <span className="text-muted-foreground font-medium">Impact</span>
            <span><span className="font-semibold" style={{ color: "hsl(var(--risk-high))" }}>HIGH</span> — Affects Compliance, Operations, Risk Management</span>
            <span className="text-muted-foreground font-medium">Action</span>
            <span>Update onboarding verification rules and KYC review schedule immediately. <span className="text-muted-foreground">Deadline: 2026-05-15</span></span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="section-container p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className={`text-2xl font-bold ${s.accent ? 'text-destructive' : s.warning ? 'text-[hsl(var(--risk-medium))]' : 'text-foreground'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Advisory */}
      <div className="grid grid-cols-2 gap-4">
        <div className="section-container p-4">
          <div className="text-sm font-semibold mb-3">Regulations by Month</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  border: "1px solid hsl(220 13% 91%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  fontSize: 12,
                  borderRadius: 0,
                }}
              />
              <Bar dataKey="count" fill="hsl(224,76%,33%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="section-container p-4">
          <div className="text-sm font-semibold mb-3">Recommended Actions</div>
          <div className="space-y-2.5">
            {[
              "Review 23 high-risk alerts requiring immediate attention",
              "Complete 12 pending impact assessments before deadline",
              "Update company profile for Q2 compliance mapping",
              "Generate monthly compliance report for management",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="section-container">
        <div className="px-4 py-3 border-b">
          <span className="text-sm font-semibold">Recent Updates</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b table-header">
              <th className="text-left px-4 py-2.5">Title</th>
              <th className="text-left px-4 py-2.5">Source</th>
              <th className="text-left px-4 py-2.5">Date</th>
              <th className="text-left px-4 py-2.5">Risk</th>
            </tr>
          </thead>
          <tbody>
            {recentUpdates.map((u, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate("/regulations")}>
                <td className="px-4 py-2.5 font-medium">{u.title}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.source}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.date}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold" style={{ color: riskColor(u.risk), background: riskBg(u.risk) }}>
                    {u.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
