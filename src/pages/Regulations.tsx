import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

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

const riskBg = (r: string) =>
  r === "High" ? "hsl(0 72% 51% / 0.08)" : r === "Medium" ? "hsl(38 92% 50% / 0.08)" : "hsl(142 72% 29% / 0.08)";

const statusStyle = (s: string) => {
  if (s === "Active") return "text-[hsl(var(--risk-low))] bg-[hsl(142_72%_29%_/_0.08)]";
  if (s === "Pending") return "text-[hsl(var(--risk-medium))] bg-[hsl(38_92%_50%_/_0.08)]";
  return "text-muted-foreground bg-muted";
};

const riskOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

type SortKey = "title" | "date" | "risk";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-30" />;
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
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Regulations</h1>
        <p className="page-subtitle mt-0.5">Browse and filter regulatory updates</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</label>
          <select className="border px-2.5 py-1.5 text-sm bg-card" value={source} onChange={(e) => setSource(e.target.value)}>
            <option>All</option><option>RBI</option><option>SEBI</option><option>MCA</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk</label>
          <select className="border px-2.5 py-1.5 text-sm bg-card" value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option>All</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="section-container">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No regulations found for selected filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b table-header">
                <th className="text-left px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("title")}>Title<SortIcon col="title" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-left px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("date")}>Date<SortIcon col="date" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("risk")}>Risk<SortIcon col="risk" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 font-medium">{d.title}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d.source}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d.date}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold" style={{ color: riskColor(d.risk), background: riskBg(d.risk) }}>{d.risk}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${statusStyle(d.status)}`}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
