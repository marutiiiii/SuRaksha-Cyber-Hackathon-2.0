import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

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

const riskOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

type SortKey = "title" | "date" | "risk";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return null;
  return sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />;
}

export default function Regulations() {
  const [source, setSource] = useState("All");
  const [risk, setRisk] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let result = data.filter(
      (d) => (source === "All" || d.source === source) && (risk === "All" || d.risk === risk)
    );
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "title") cmp = a.title.localeCompare(b.title);
        else if (sortKey === "date") cmp = a.date.localeCompare(b.date);
        else if (sortKey === "risk") cmp = riskOrder[a.risk] - riskOrder[b.risk];
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [source, risk, sortKey, sortDir]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Regulations</h1>
      <div className="flex gap-4 mb-4">
        <select className="border px-2 py-1 text-sm bg-background" value={source} onChange={(e) => setSource(e.target.value)}>
          <option>All</option><option>RBI</option><option>SEBI</option><option>MCA</option>
        </select>
        <select className="border px-2 py-1 text-sm bg-background" value={risk} onChange={(e) => setRisk(e.target.value)}>
          <option>All</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
      </div>
      <div className="border" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No regulations found for selected filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary">
                <th className="text-left p-2 cursor-pointer select-none" onClick={() => toggleSort("title")}>Title<SortIcon col="title" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className="text-left p-2">Source</th>
                <th className="text-left p-2 cursor-pointer select-none" onClick={() => toggleSort("date")}>Date<SortIcon col="date" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className="text-left p-2 cursor-pointer select-none" onClick={() => toggleSort("risk")}>Risk<SortIcon col="risk" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={i} className="border-b hover:bg-accent cursor-pointer">
                  <td className="p-2">{d.title}</td>
                  <td className="p-2">{d.source}</td>
                  <td className="p-2">{d.date}</td>
                  <td className="p-2"><span className="font-semibold" style={{ color: riskColor(d.risk) }}>{d.risk}</span></td>
                  <td className="p-2">{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
