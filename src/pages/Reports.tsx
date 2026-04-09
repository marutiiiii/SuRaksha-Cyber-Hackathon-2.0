export default function Reports() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Report Viewer</h1>

      <div className="border mb-4 p-3" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <div className="font-semibold text-sm mb-1">Summary</div>
        <p className="text-sm">
          This report covers the regulatory changes detected in Q1 2026 affecting banking and financial services.
          23 high-risk changes identified across RBI, SEBI, and MCA circulars. 47 action items generated with an
          average implementation deadline of 45 days.
        </p>
      </div>

      <div className="border mb-4 p-3" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <div className="font-semibold text-sm mb-1">Impact</div>
        <p className="text-sm">
          Compliance, Operations, and Risk Management departments are most affected. Estimated cost of implementation:
          ₹12.5L across technology upgrades and process re-engineering. 3 existing SOPs require revision.
        </p>
      </div>

      <div className="border mb-4 p-3" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <div className="font-semibold text-sm mb-1">Actions Required</div>
        <ul className="text-sm list-disc ml-4 space-y-1">
          <li>Update KYC periodic review schedule for high-risk customers</li>
          <li>Implement V-CIP as preferred verification method</li>
          <li>Set up quarterly KYC compliance reporting to RBI</li>
          <li>Revise customer risk categorization framework</li>
          <li>Train operations staff on new CDD procedures</li>
        </ul>
      </div>

      <div className="border mb-4 p-3" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <div className="font-semibold text-sm mb-1">Deadlines</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary">
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Deadline</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-accent cursor-pointer"><td className="p-2">KYC schedule update</td><td className="p-2">2026-05-15</td><td className="p-2">Pending</td></tr>
            <tr className="border-b hover:bg-accent cursor-pointer"><td className="p-2">V-CIP implementation</td><td className="p-2">2026-06-30</td><td className="p-2">In Progress</td></tr>
            <tr className="border-b hover:bg-accent cursor-pointer"><td className="p-2">Quarterly reporting setup</td><td className="p-2">2026-07-01</td><td className="p-2">Not Started</td></tr>
            <tr className="border-b hover:bg-accent cursor-pointer"><td className="p-2">Staff training</td><td className="p-2">2026-06-15</td><td className="p-2">Not Started</td></tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="border px-3 py-1 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">Download PDF</button>
        <button className="border px-3 py-1 text-sm font-semibold bg-background hover:bg-accent" onClick={() => window.print()}>Print</button>
      </div>
    </div>
  );
}
