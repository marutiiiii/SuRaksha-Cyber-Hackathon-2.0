const alerts = [
  { message: "RBI KYC Master Direction amended — annual review now required for high-risk customers", time: "2 hours ago", risk: "High" },
  { message: "SEBI Insider Trading circular updated — new compliance window definitions", time: "5 hours ago", risk: "Medium" },
  { message: "MCA Companies Act Section 135 CSR threshold revised", time: "1 day ago", risk: "Low" },
  { message: "RBI Digital Lending guidelines — new disclosure requirements effective immediately", time: "1 day ago", risk: "High" },
  { message: "SEBI LODR Regulation 30 — materiality threshold updated", time: "2 days ago", risk: "Medium" },
  { message: "RBI NPA classification norms revised for restructured accounts", time: "3 days ago", risk: "High" },
  { message: "MCA Annual Return filing deadline extended by 30 days", time: "4 days ago", risk: "Low" },
];

const riskColor = (r: string) =>
  r === "High" ? "hsl(var(--risk-high))" : r === "Medium" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";

export default function Alerts() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Alerts</h1>
      <div className="border">
        {alerts.map((a, i) => (
          <div key={i} className="flex items-start justify-between p-3 border-b hover:bg-accent">
            <div className="flex-1">
              <div className="text-sm">{a.message}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
            </div>
            <span className="text-xs font-semibold ml-3 px-2 py-0.5 border" style={{ color: riskColor(a.risk) }}>
              {a.risk}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
