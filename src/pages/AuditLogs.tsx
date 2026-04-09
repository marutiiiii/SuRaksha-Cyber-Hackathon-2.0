const logs = [
  { source: "RBI/2026/MD/KYC/04", clause: "Section 3.2", reasoning: "Frequency change detected: biennial → annual for high-risk CDD. Triggers re-assessment of customer review schedules.", timestamp: "2026-04-08 14:23:01" },
  { source: "SEBI/2026/CIR/IT/07", clause: "Regulation 4(1)", reasoning: "Definition expansion: 'connected person' scope widened. May affect compliance monitoring framework.", timestamp: "2026-04-07 09:45:22" },
  { source: "MCA/2026/AMD/CA/03", clause: "Section 135(5)", reasoning: "CSR spending threshold revised from ₹5Cr to ₹3Cr net profit. Expands applicability to mid-size entities.", timestamp: "2026-04-06 16:12:45" },
  { source: "RBI/2026/CIR/DL/05", clause: "Para 6.3", reasoning: "New mandatory disclosure: FLDG arrangements must be reported. Creates new reporting obligation.", timestamp: "2026-04-05 11:30:18" },
  { source: "SEBI/2026/AMD/LODR/04", clause: "Regulation 30(4)", reasoning: "Materiality threshold for event disclosure lowered. Increases frequency of required disclosures.", timestamp: "2026-04-04 08:55:33" },
];

export default function AuditLogs() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Audit Logs</h1>
      <div className="border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary">
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">Clause</th>
              <th className="text-left p-2">AI Reasoning</th>
              <th className="text-left p-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-b hover:bg-accent">
                <td className="p-2 font-mono text-xs">{l.source}</td>
                <td className="p-2">{l.clause}</td>
                <td className="p-2">{l.reasoning}</td>
                <td className="p-2 text-xs whitespace-nowrap">{l.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
