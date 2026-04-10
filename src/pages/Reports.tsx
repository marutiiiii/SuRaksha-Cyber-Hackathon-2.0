import { Download, Printer } from "lucide-react";

const statusStyle = (s: string) => {
  if (s === "In Progress") return "text-[hsl(var(--risk-medium))] bg-[hsl(38_92%_50%_/_0.08)]";
  if (s === "Pending") return "text-[hsl(var(--risk-high))] bg-[hsl(0_72%_51%_/_0.08)]";
  return "text-muted-foreground bg-muted";
};

export default function Reports() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Report Viewer</h1>
          <p className="page-subtitle mt-0.5">Q1 2026 Compliance Report</p>
        </div>
        <div className="flex gap-2">
          <button className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Download className="h-4 w-4" />Download PDF
          </button>
          <button className="border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />Print
          </button>
        </div>
      </div>

      <div className="section-container p-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Summary</div>
        <p className="text-sm leading-relaxed">
          This report covers the regulatory changes detected in Q1 2026 affecting banking and financial services.
          23 high-risk changes identified across RBI, SEBI, and MCA circulars. 47 action items generated with an
          average implementation deadline of 45 days.
        </p>
      </div>

      <div className="section-container p-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Impact</div>
        <p className="text-sm leading-relaxed">
          Compliance, Operations, and Risk Management departments are most affected. Estimated cost of implementation:
          ₹12.5L across technology upgrades and process re-engineering. 3 existing SOPs require revision.
        </p>
      </div>

      <div className="section-container p-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Actions Required</div>
        <ul className="text-sm leading-relaxed space-y-1.5 ml-4 list-disc text-muted-foreground">
          <li>Update KYC periodic review schedule for high-risk customers</li>
          <li>Implement V-CIP as preferred verification method</li>
          <li>Set up quarterly KYC compliance reporting to RBI</li>
          <li>Revise customer risk categorization framework</li>
          <li>Train operations staff on new CDD procedures</li>
        </ul>
      </div>

      <div className="section-container">
        <div className="px-4 py-3 border-b">
          <span className="text-sm font-semibold">Deadlines</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b table-header">
              <th className="text-left px-4 py-2.5">Action</th>
              <th className="text-left px-4 py-2.5">Deadline</th>
              <th className="text-left px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { action: "KYC schedule update", deadline: "2026-05-15", status: "Pending" },
              { action: "V-CIP implementation", deadline: "2026-06-30", status: "In Progress" },
              { action: "Quarterly reporting setup", deadline: "2026-07-01", status: "Not Started" },
              { action: "Staff training", deadline: "2026-06-15", status: "Not Started" },
            ].map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                <td className="px-4 py-2.5 font-medium">{row.action}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.deadline}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${statusStyle(row.status)}`}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
