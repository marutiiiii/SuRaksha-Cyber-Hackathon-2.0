import { AnyObject } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { EmptyState, SkeletonPage } from "@/components/shared/States";

import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type SortKey = "source" | "timestamp";
type SortDir = "asc" | "desc";

interface DisplayLog {
  source: string;
  clause: string;
  reasoning: string;
  timestamp: string;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="inline h-3.5 w-3.5 ml-1 opacity-40" />;
  return sortDir === "asc" ? <ArrowUp className="inline h-3.5 w-3.5 ml-1 text-primary animate-fade-in" /> : <ArrowDown className="inline h-3.5 w-3.5 ml-1 text-primary animate-fade-in" />;
}

export default function AuditLogs() {
  const { user } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [liveLogs, setLiveLogs] = useState<DisplayLog[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const userRole = user?.user_metadata?.role ?? "Compliance Officer";
  const isAdmin = userRole.toLowerCase().includes("admin") || userRole.toLowerCase().includes("officer");

  const loadLogs = (query?: string) => {
    api.listAuditLogs(query)
      .then((res) => {
        const mapped = (res || []).map((l: AnyObject) => ({
          source: l.entity_type,
          clause: l.action,
          reasoning: l.description || "—",
          timestamp: new Date(l.created_at).toLocaleString()
        }));
        setLiveLogs(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load audit logs", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLogs(searchTerm || undefined);
    setCurrentPage(1); // Reset page to 1 on search
  }, [searchTerm]);

  const displayLogs = useMemo(() => {
    return liveLogs;
  }, [liveLogs]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return displayLogs;
    return [...displayLogs].sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey]);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [displayLogs, sortKey, sortDir]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, currentPage]);

  const handleExport = () => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: `Exporting audit logs requires Administrator privileges. Current role: ${userRole}.`,
        variant: "destructive",
      });
      return;
    }

    const headers = ["Source", "Clause", "Reasoning", "Timestamp"];
    const rows = displayLogs.map((l) => [l.source, l.clause, l.reasoning, l.timestamp]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reguflow_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${displayLogs.length} audit logs to CSV.`,
    });
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <PageHeader 
        title="Audit Logs" 
        subtitle="AI analysis trail and regulatory reasoning history" 
        actions={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 border border-transparent rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        }
      />

      <div className="flex items-center gap-2 relative w-full sm:w-80">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
        <input
          type="text"
          placeholder="Search audit trail..."
          className="premium-input pl-9 h-10 w-full focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden">
        {paginatedLogs.length === 0 ? (
          <EmptyState
            title={searchTerm ? "No search results" : "No audit logs"}
            description={searchTerm ? "Try searching for a different term." : "No analysis events have been recorded yet."}
          />
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="cursor-pointer select-none hover:text-foreground transition-colors w-[150px]" onClick={() => toggleSort("source")}>
                      <span className="flex items-center">
                        Source
                        <SortIcon col="source" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="w-[200px]">Clause</th>
                    <th>AI Reasoning</th>
                    <th className="cursor-pointer select-none hover:text-foreground transition-colors w-[220px]" onClick={() => toggleSort("timestamp")}>
                      <span className="flex items-center">
                        Timestamp
                        <SortIcon col="timestamp" sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((l, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs font-bold text-primary">{l.source}</td>
                      <td className="font-semibold text-foreground">{l.clause}</td>
                      <td className="text-muted-foreground text-xs font-medium leading-relaxed">{l.reasoning}</td>
                      <td className="text-xs text-muted-foreground whitespace-nowrap font-medium">{l.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between gap-4 text-xs font-semibold text-muted-foreground bg-muted/10">
                <span>
                  Showing <span className="text-foreground">{(currentPage - 1) * rowsPerPage + 1}</span> to{" "}
                  <span className="text-foreground">{Math.min(sorted.length, currentPage * rowsPerPage)}</span> of{" "}
                  <span className="text-foreground">{sorted.length}</span> entries
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <span className="text-muted-foreground">
                    Page <span className="text-foreground font-bold">{currentPage}</span> of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
