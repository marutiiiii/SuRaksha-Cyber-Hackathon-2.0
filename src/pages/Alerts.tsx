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

const riskBg = (r: string) =>
  r === "High" ? "hsl(0 72% 51% / 0.08)" : r === "Medium" ? "hsl(38 92% 50% / 0.08)" : "hsl(142 72% 29% / 0.08)";

const borderLeft = (r: string) =>
  r === "High" ? "hsl(var(--risk-high))" : r === "Medium" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";

export default function Alerts() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle mt-0.5">{alerts.length} regulatory alerts</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="section-container p-12 text-center text-sm text-muted-foreground">No alerts available.</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className="section-container flex items-start justify-between p-4 border-l-4 hover:bg-muted/30 cursor-pointer transition-colors"
              style={{ borderLeftColor: borderLeft(a.risk) }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-relaxed">{a.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{a.time}</div>
              </div>
              <span
                className="text-xs font-semibold ml-4 px-2 py-0.5 flex-shrink-0"
                style={{ color: riskColor(a.risk), background: riskBg(a.risk) }}
              >
                {a.risk}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
