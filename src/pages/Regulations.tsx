import { useState } from "react";

const data = [
  { title: "Master Direction on KYC", source: "RBI", date: "2026-04-08", risk: "High", status: "Active" },
  { title: "Circular on Insider Trading", source: "SEBI", date: "2026-04-07", risk: "Medium", status: "Under Review" },
  { title: "Amendment to Companies Act", source: "MCA", date: "2026-04-06", risk: "Low", status: "Active" },
  { title: "Digital Lending Guidelines", source: "RBI", date: "2026-04-05", risk: "High", status: "Pending" },
  { title: "LODR Amendment", source: "SEBI", date: "2026-04-04", risk: "Medium", status: "Active" },
  { title: "CSR Spending Rules", source: "MCA", date: "2026-04-03", risk: "Low", status: "Active" },
  { title: "NPA Classification Norms", source: "RBI", date: "2026-04-02", risk: "High", status: "Under Review" },
  { title: "Mutual Fund Regulations", source: "SEBI", date: "2026-04-01", risk: "Low", status: "Active" },
];

const riskColor = (r: string) =>
  r === "High" ? "hsl(var(--risk-high))" : r === "Medium" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";

export default function Regulations() {
  const [source, setSource] = useState("All");
  const [risk, setRisk] = useState("All");

  const filtered = data.filter(
    (d) => (source === "All" || d.source === source) && (risk === "All" || d.risk === risk)
  );

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Regulations</h1>
      <div className="flex gap-4 mb-4">
        <select className="border px-2 py-1 text-sm bg-background" value={source} onChange={(e) => setSource(e.target.value)}>
          <option>All</option>
          <option>RBI</option>
          <option>SEBI</option>
          <option>MCA</option>
        </select>
        <select className="border px-2 py-1 text-sm bg-background" value={risk} onChange={(e) => setRisk(e.target.value)}>
          <option>All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>
      <div className="border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary">
              <th className="text-left p-2">Title</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} className="border-b hover:bg-accent">
                <td className="p-2">{d.title}</td>
                <td className="p-2">{d.source}</td>
                <td className="p-2">{d.date}</td>
                <td className="p-2"><span className="font-semibold" style={{ color: riskColor(d.risk) }}>{d.risk}</span></td>
                <td className="p-2">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
