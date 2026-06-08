import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/States";
import { auditLogs as logs } from "@/mocks";

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
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle="AI analysis trail and regulatory reasoning history" />

      <div className="section-container">
        {sorted.length === 0 ? (
          <EmptyState title="No audit logs" description="No analysis events have been recorded yet." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("source")}>Source<SortIcon col="source" sortKey={sortKey} sortDir={sortDir} /></th>
                <th>Clause</th>
                <th>AI Reasoning</th>
                <th className="cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("timestamp")}>Timestamp<SortIcon col="timestamp" sortKey={sortKey} sortDir={sortDir} /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs font-medium">{l.source}</td>
                  <td className="font-medium">{l.clause}</td>
                  <td className="text-muted-foreground">{l.reasoning}</td>
                  <td className="text-xs text-muted-foreground whitespace-nowrap">{l.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
