const departments = [
  { name: "Compliance", risk: "High", impact: "Direct regulatory obligation — must update KYC procedures within 30 days." },
  { name: "Operations", risk: "Medium", impact: "Process changes required for V-CIP implementation and quarterly reporting." },
  { name: "IT / Technology", risk: "Medium", impact: "System updates needed for digital KYC integration and automated reporting." },
  { name: "Legal", risk: "Low", impact: "Review updated penalty provisions and ensure contractual compliance." },
  { name: "Risk Management", risk: "High", impact: "Re-assess customer risk categorization framework per new annual review requirements." },
];

const riskColor = (r: string) =>
  r === "High" ? "hsl(var(--risk-high))" : r === "Medium" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";

export default function ImpactAnalysis() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Impact Analysis</h1>
      <div className="border mb-4 p-3">
        <div className="font-semibold text-sm mb-1">Overall Impact Summary</div>
        <p className="text-sm">
          The revised RBI Master Direction on KYC introduces significant changes to customer due diligence requirements.
          High-risk customer reviews shift from biennial to annual frequency. V-CIP becomes the preferred verification method.
          New quarterly reporting obligations are introduced. Estimated implementation timeline: 60–90 days.
        </p>
      </div>
      <div className="border mb-4 p-3">
        <div className="font-semibold text-sm mb-1">Confidence Score</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-secondary border h-5 relative">
            <div className="h-full" style={{ width: "87%", background: "hsl(var(--primary))" }} />
          </div>
          <span className="text-sm font-semibold">87%</span>
        </div>
      </div>
      <div className="border">
        <div className="p-2 bg-secondary border-b font-semibold text-sm">Affected Departments</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary">
              <th className="text-left p-2">Department</th>
              <th className="text-left p-2">Risk Level</th>
              <th className="text-left p-2">Impact</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d, i) => (
              <tr key={i} className="border-b hover:bg-accent">
                <td className="p-2 font-semibold">{d.name}</td>
                <td className="p-2"><span className="font-semibold" style={{ color: riskColor(d.risk) }}>{d.risk}</span></td>
                <td className="p-2">{d.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
