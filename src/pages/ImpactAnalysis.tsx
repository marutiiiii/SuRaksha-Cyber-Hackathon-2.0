const departments = [
  { name: "Compliance", risk: "High", impact: "Direct regulatory obligation — must update KYC procedures within 30 days." },
  { name: "Operations", risk: "Medium", impact: "Process changes required for V-CIP implementation and quarterly reporting." },
  { name: "IT / Technology", risk: "Medium", impact: "System updates needed for digital KYC integration and automated reporting." },
  { name: "Legal", risk: "Low", impact: "Review updated penalty provisions and ensure contractual compliance." },
  { name: "Risk Management", risk: "High", impact: "Re-assess customer risk categorization framework per new annual review requirements." },
];

const riskColor = (r: string) =>
  r === "High" ? "hsl(var(--risk-high))" : r === "Medium" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";

const riskBg = (r: string) =>
  r === "High" ? "hsl(0 72% 51% / 0.08)" : r === "Medium" ? "hsl(38 92% 50% / 0.08)" : "hsl(142 72% 29% / 0.08)";

export default function ImpactAnalysis() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Impact Analysis</h1>
        <p className="page-subtitle mt-0.5">Assess regulatory impact across departments</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="section-container p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Overall Impact Summary</div>
          <p className="text-sm leading-relaxed">
            The revised RBI Master Direction on KYC introduces significant changes to customer due diligence requirements.
            High-risk customer reviews shift from biennial to annual frequency. V-CIP becomes the preferred verification method.
            New quarterly reporting obligations are introduced. Estimated implementation timeline: 60–90 days.
          </p>
        </div>

        <div className="section-container p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Confidence Score</div>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-3xl font-bold text-foreground">87%</span>
            <span className="text-xs text-muted-foreground mb-1">analysis confidence</span>
          </div>
          <div className="w-full bg-muted h-2 relative">
            <div className="h-full bg-primary" style={{ width: "87%" }} />
          </div>
        </div>
      </div>

      <div className="section-container">
        <div className="px-4 py-3 border-b">
          <span className="text-sm font-semibold">Affected Departments</span>
        </div>
        {departments.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No impact data available.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b table-header">
                <th className="text-left px-4 py-2.5">Department</th>
                <th className="text-left px-4 py-2.5">Risk Level</th>
                <th className="text-left px-4 py-2.5">Impact</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 font-medium">{d.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold" style={{ color: riskColor(d.risk), background: riskBg(d.risk) }}>{d.risk}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
