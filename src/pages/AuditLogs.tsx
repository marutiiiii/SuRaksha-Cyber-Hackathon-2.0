import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

const logs = [
  { source: "RBI/2026/MD/KYC/04", clause: "Section 3.2", reasoning: "Frequency change detected: biennial → annual for high-risk CDD. Triggers re-assessment of customer review schedules.", timestamp: "2026-04-08 14:23:01" },
  { source: "SEBI/2026/CIR/IT/07", clause: "Regulation 4(1)", reasoning: "Definition expansion: 'connected person' scope widened. May affect compliance monitoring framework.", timestamp: "2026-04-07 09:45:22" },
  { source: "MCA/2026/AMD/CA/03", clause: "Section 135(5)", reasoning: "CSR spending threshold revised from ₹5Cr to ₹3Cr net profit. Expands applicability to mid-size entities.", timestamp: "2026-04-06 16:12:45" },
  { source: "RBI/2026/CIR/DL/05", clause: "Para 6.3", reasoning: "New mandatory disclosure: FLDG arrangements must be reported. Creates new reporting obligation.", timestamp: "2026-04-05 11:30:18" },
  { source: "SEBI/2026/AMD/LODR/04", clause: "Regulation 30(4)", reasoning: "Materiality threshold for event disclosure lowered. Increases frequency of required disclosures.", timestamp: "2026-04-04 08:55:33" },
];

type SortKey = "source" | "timestamp";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-30" />;
  return sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />;
}

export default function AuditLogs() {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return logs;
    return [...logs].sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey]);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle mt-0.5">AI analysis trail and regulatory reasoning</p>
      </div>

      <div className="section-container">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No audit logs recorded.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b table-header">
                <th className="text-left px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("source")}>Source<SortIcon col="source" sortKey={sortKey} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-2.5">Clause</th>
                <th className="text-left px-4 py-2.5">AI Reasoning</th>
                <th className="text-left px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("timestamp")}>Timestamp<SortIcon col="timestamp" sortKey={sortKey} sortDir={sortDir} /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">{l.source}</td>
                  <td className="px-4 py-2.5 font-medium">{l.clause}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{l.reasoning}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{l.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
