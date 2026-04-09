import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stats = [
  { label: "Total Regulations", value: 1284 },
  { label: "High Risk Alerts", value: 23, color: "hsl(var(--risk-high))" },
  { label: "Pending Actions", value: 47, color: "hsl(var(--risk-medium))" },
  { label: "Reports Generated", value: 156 },
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

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-4 gap-0 border mb-4">
        {stats.map((s) => (
          <div key={s.label} className="border p-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold" style={s.color ? { color: s.color } : undefined}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border p-3">
          <div className="font-semibold text-sm mb-2">Regulations by Month</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(224,76%,33%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border p-3">
          <div className="font-semibold text-sm mb-2">What should I do?</div>
          <ul className="text-sm space-y-1">
            <li>• Review 23 high-risk alerts requiring immediate attention</li>
            <li>• Complete 12 pending impact assessments before deadline</li>
            <li>• Update company profile for Q2 compliance mapping</li>
            <li>• Generate monthly compliance report for management</li>
          </ul>
        </div>
      </div>

      <div className="border">
        <div className="font-semibold text-sm p-2 border-b bg-secondary">Recent Updates</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary">
              <th className="text-left p-2">Title</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Risk</th>
            </tr>
          </thead>
          <tbody>
            {recentUpdates.map((u, i) => (
              <tr key={i} className="border-b hover:bg-accent">
                <td className="p-2">{u.title}</td>
                <td className="p-2">{u.source}</td>
                <td className="p-2">{u.date}</td>
                <td className="p-2">
                  <span className="font-semibold" style={{ color: riskColor(u.risk) }}>{u.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
