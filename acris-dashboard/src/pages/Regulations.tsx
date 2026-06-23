import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, AlertCircle, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { EmptyState, BeginnerHint, SkeletonPage } from "@/components/shared/States";
import Drawer from "@/components/shared/Drawer";
import { useIsBeginner } from "@/state/CopilotContext";
import { api } from "@/lib/api";
import { useSearchParams } from "react-router-dom";
import { useOrgProfile } from "@/state/OrgProfileContext";
import { toast } from "@/hooks/use-toast";

const sourcesMetadata = [
  { key: "RBI", name: "Reserve Bank of India", risk: "High" as const },
  { key: "SEBI", name: "Securities & Exchange Board", risk: "Medium" as const },
  { key: "NPCI", name: "NPCI Circulars", risk: "Medium" as const },
  { key: "CERT-In", name: "CERT-In Advisories", risk: "High" as const },
  { key: "Internal", name: "Internal Policies", risk: "Low" as const },
];

function RiskBadge({ risk }: { risk: string }) {
  let badgeClass = "badge-medium";
  if (risk === "High" || risk === "Critical") badgeClass = "badge-high";
  if (risk === "Low") badgeClass = "badge-low";
  return (
    <span className={`badge ${badgeClass} text-[10px]`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {risk}
    </span>
  );
}

export default function Regulations() {
  const isBeginner = useIsBeginner();
  const { orgProfile } = useOrgProfile();
  const [source, setSource] = useState("All");
  const [risk, setRisk] = useState("All");
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const setQuery = (val: string) => {
    if (val) {
      setSearchParams({ q: val });
    } else {
      const params = new URLSearchParams(searchParams);
      params.delete("q");
      setSearchParams(params);
    }
  };
  
  const [open, setOpen] = useState<any | null>(null);
  const [live, setLive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRegulations = () => {
    setLoading(true);
    api.regulationsLatest()
      .then((r) => {
        setLive(r || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load regulations", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRegulations();
  }, []);

  const handleScrape = async () => {
    setScraping(true);
    toast({
      title: "Scraper Triggered",
      description: "Auto-scraper is fetching the latest circulars from the RBI notifications portal...",
    });
    try {
      const res = await api.triggerScrape();
      toast({
        title: "Scraping Complete",
        description: res.message || "Successfully fetched and analyzed new regulations.",
      });
      fetchRegulations();
    } catch (err: any) {
      console.error("Scraping failed", err);
      toast({
        title: "Scraping Failed",
        description: err.message || "An error occurred during regulation scraping.",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  const combinedRegulations = useMemo(() => {
    const base = live;
    const baseFiltered = base.filter((r: any) => 
      orgProfile.enabledSources.length === 0 || orgProfile.enabledSources.includes(r.source)
    );
    
    return baseFiltered.filter(
      (r: any) =>
        (source === "All" || r.source === source) &&
        (risk === "All" || r.risk === risk || r.risk_level === risk) &&
        (query === "" || 
         r.title.toLowerCase().includes(query.toLowerCase()) || 
         (r.id && r.id.toLowerCase().includes(query.toLowerCase())) ||
         (r.summary && r.summary.toLowerCase().includes(query.toLowerCase()))
        )
    );
  }, [source, risk, query, live, orgProfile.enabledSources]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [source, risk, query]);

  const rowsPerPage = 10;
  const totalPages = Math.ceil(combinedRegulations.length / rowsPerPage);
  const paginatedRegulations = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return combinedRegulations.slice(startIndex, startIndex + rowsPerPage);
  }, [combinedRegulations, currentPage]);

  const enabledRegSources = useMemo(() => {
    return sourcesMetadata.filter(s => 
      orgProfile.enabledSources.length === 0 || orgProfile.enabledSources.includes(s.key)
    );
  }, [orgProfile.enabledSources]);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Regulatory Intelligence Center</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Live feed of circulars across regulatory sources with risk-scored prioritization
          </p>
        </div>
        <div>
          {isBeginner && (
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scraping ? "animate-spin" : ""}`} />
              {scraping ? "Scraping..." : "Scrape Latest Regulations"}
            </button>
          )}
        </div>
      </div>

      {isBeginner && (
        <BeginnerHint>
          Select a regulator card to isolate issues, or click any circular in the table below to trigger a compliance analysis drawer.
        </BeginnerHint>
      )}

      {/* Regulators Bento List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {enabledRegSources.map((s) => {
          const count = live.filter(r => r.source === s.key).length;
          const status = count === 0 ? "Healthy" : count > 2 ? "Critical" : "Attention";
          return (
            <div 
              key={s.key} 
              onClick={() => setSource(s.key)}
              className={`glass-card p-4 flex flex-col justify-between cursor-pointer border hover:border-primary/40 transition-all ${
                source === s.key ? "border-primary bg-primary/5 shadow-sm shadow-primary/5" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground">{s.key}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  status === "Healthy" ? "text-emerald-500" : status === "Attention" ? "text-amber-500" : "text-rose-500"
                }`}>
                  {status}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-1 mb-3">{s.name}</div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xl font-extrabold text-foreground">{count}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Active Items</div>
                </div>
                <RiskBadge risk={s.risk} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table Grid */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSource("All")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                source === "All" 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              All Sources
            </button>
            {enabledRegSources.map((s) => (
              <button
                key={s.key}
                onClick={() => setSource(s.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  source === s.key 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
              >
                {s.key}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="premium-select text-xs h-9 min-w-[130px] py-1 border border-border rounded-lg bg-background text-foreground focus:outline-none"
            >
              <option value="All">All Risk Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search circulars…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="premium-input text-xs pl-9 pr-3 h-9 w-[220px] focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        {combinedRegulations.length === 0 ? (
          <EmptyState title="No regulations match filters" />
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Circular ID</th>
                    <th>Title</th>
                    <th>Source</th>
                    <th>Published</th>
                    <th>Risk Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRegulations.map((r: any) => (
                    <tr key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setOpen(r)}>
                      <td className="font-mono text-xs font-bold text-primary">{r.id || "Circular"}</td>
                      <td className="font-semibold text-foreground max-w-[420px] truncate">{r.title}</td>
                      <td>
                        <span className="badge badge-info bg-primary/5 border-primary/20 text-primary text-[10px] uppercase font-bold tracking-wider">
                          {r.source}
                        </span>
                      </td>
                      <td className="text-muted-foreground text-xs font-semibold">{r.publishedDate || r.date || "—"}</td>
                      <td><RiskBadge risk={r.risk || r.risk_level || "Medium"} /></td>
                      <td>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          r.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          r.status === "Under Review" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                          "bg-muted text-muted-foreground border-border"
                        }`}>
                          {r.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
                <span>
                  Showing <span className="text-foreground">{Math.min(combinedRegulations.length, (currentPage - 1) * rowsPerPage + 1)}</span> to{" "}
                  <span className="text-foreground">{Math.min(combinedRegulations.length, currentPage * rowsPerPage)}</span> of{" "}
                  <span className="text-foreground">{combinedRegulations.length}</span> entries
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <span className="text-muted-foreground">
                    Page <span className="text-foreground font-bold">{currentPage}</span> of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open && (
          <div className="space-y-6 text-sm py-2">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="font-mono text-xs font-bold text-primary">{open.id || "Circular"}</span>
              <RiskBadge risk={open.risk || open.risk_level || "Medium"} />
              <span className="badge badge-info uppercase tracking-wider text-[10px]">{open.source}</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Executive Summary</h4>
              <p className="leading-relaxed text-foreground bg-muted/20 p-3.5 border border-border rounded-lg font-medium">{open.summary || "No summary provided."}</p>
            </div>
            
            {open.obligations && open.obligations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Key Obligations</h4>
                <ul className="list-disc ml-5 space-y-1.5 text-muted-foreground font-medium">
                  {open.obligations.map((o: string) => <li key={o} className="leading-relaxed">{o}</li>)}
                </ul>
              </div>
            )}
            
            {open.suggestedActions && open.suggestedActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Suggested SOP Actions</h4>
                <ul className="list-disc ml-5 space-y-1.5 text-muted-foreground font-medium">
                  {open.suggestedActions.map((s: string) => <li key={s} className="leading-relaxed">{s}</li>)}
                </ul>
              </div>
            )}
            
            {open.link && (
              <div className="pt-2">
                <a href={open.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                  View Official circular publication ↗
                </a>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
