import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { RiskBadge, StatusBadge } from "@/components/shared/Badges";
import { EmptyState, BeginnerHint, SkeletonPage } from "@/components/shared/States";
import Drawer from "@/components/shared/Drawer";
import { useIsBeginner, useIsExpert } from "@/state/CopilotContext";
import { regulations as mockRegulations, regSources, Regulation } from "@/mocks";
import { api } from "@/lib/api";
import { useSearchParams } from "react-router-dom";
import { useOrgProfile } from "@/state/OrgProfileContext";

export default function Regulations() {
  const isBeginner = useIsBeginner();
  const isExpert = useIsExpert();
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

  useEffect(() => {
    api.regulationsLatest()
      .then((r) => {
        setLive(r || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load regulations", err);
        setLoading(false);
      });
  }, []);

  const combinedRegulations = useMemo(() => {
    // If we have live regulations in DB, use them.
    // If not, use mockRegulations as a demo fallback.
    const base = live.length > 0 ? live : mockRegulations;
    
    // Filter base by enabled sources
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

  const enabledRegSources = useMemo(() => {
    return regSources.filter(s => 
      orgProfile.enabledSources.length === 0 || orgProfile.enabledSources.includes(s.key)
    );
  }, [orgProfile.enabledSources]);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader title="Regulatory Intelligence Center" subtitle="Live feed of regulations across sources with risk-scored prioritization" />

      {isBeginner && (
        <BeginnerHint>
          Each card below is a regulatory source. Click a row in the table to see a regulation's executive
          summary, obligations, and suggested actions.
        </BeginnerHint>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {enabledRegSources.map((s) => (
          <div key={s.key} className="section-container p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{s.key}</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="text-xs text-muted-foreground mb-2 line-clamp-1">{s.name}</div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold">
                  {source === s.key || source === "All" 
                    ? combinedRegulations.filter(r => r.source === s.key).length 
                    : s.activeCount
                  }
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</div>
              </div>
              <RiskBadge risk={s.risk} />
            </div>
          </div>
        ))}
      </div>

      <div className="section-container">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSource("All")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${source === "All" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-muted"}`}
            >
              All sources
            </button>
            {enabledRegSources.map((s) => (
              <button
                key={s.key}
                onClick={() => setSource(s.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${source === s.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-muted"}`}
              >
                {s.key}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="border border-border rounded-md px-2 h-9 text-xs bg-background min-w-[120px]"
            >
              <option value="All">All Risks</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search circulars…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 pr-3 h-9 text-xs border border-border rounded-md w-[200px] bg-background"
              />
            </div>
          </div>
        </div>

        {combinedRegulations.length === 0 ? (
          <EmptyState title="No regulations match filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Circular ID</th>
                  <th>Title</th>
                  <th>Source</th>
                  <th>Published</th>
                  <th>Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {combinedRegulations.map((r: any) => (
                  <tr key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                    <td className="font-mono text-xs font-semibold">{r.id || "Circular"}</td>
                    <td className="font-medium max-w-[400px] truncate">{r.title}</td>
                    <td className="text-muted-foreground">{r.source}</td>
                    <td className="text-muted-foreground">{r.publishedDate || r.date || "—"}</td>
                    <td><RiskBadge risk={r.risk || r.risk_level || "Medium"} /></td>
                    <td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" :
                        r.status === "Under Review" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {r.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold">{open.id || "Circular"}</span>
              <RiskBadge risk={open.risk || open.risk_level || "Medium"} />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{open.source}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Summary</div>
              <p className="leading-relaxed">{open.summary || "No summary provided."}</p>
            </div>
            {open.obligations && open.obligations.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Key Obligations</div>
                <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                  {open.obligations.map((o: string) => <li key={o}>{o}</li>)}
                </ul>
              </div>
            )}
            {open.suggestedActions && open.suggestedActions.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Suggested SOP Actions</div>
                <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                  {open.suggestedActions.map((s: string) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
            {open.link && (
              <div>
                <a href={open.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                  View official circular ↗
                </a>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
