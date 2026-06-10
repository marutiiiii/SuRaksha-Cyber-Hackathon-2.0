import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { RiskBadge, StatusBadge } from "@/components/shared/Badges";
import { EmptyState, BeginnerHint } from "@/components/shared/States";
import Drawer from "@/components/shared/Drawer";
import { useIsBeginner, useIsExpert } from "@/state/CopilotContext";
import { regulations, regSources, Regulation } from "@/mocks";
import { api } from "@/lib/api";

export default function Regulations() {
  const isBeginner = useIsBeginner();
  const isExpert = useIsExpert();
  const [source, setSource] = useState("All");
  const [risk, setRisk] = useState("All");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Regulation | null>(null);
  const [live, setLive] = useState<any[]>([]);
  useEffect(() => { api.regulationsLatest().then((r) => setLive(r.regulations ?? [])).catch(() => {}); }, []);

  const filtered = useMemo(
    () =>
      regulations.filter(
        (r) =>
          (source === "All" || r.source === source) &&
          (risk === "All" || r.risk === risk) &&
          (query === "" || r.title.toLowerCase().includes(query.toLowerCase()) || r.id.toLowerCase().includes(query.toLowerCase()))
      ),
    [source, risk, query]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Regulatory Intelligence Center" subtitle="Live feed of regulations across sources with risk-scored prioritization" />

      {live.length > 0 && (
        <div className="section-container">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            <span>Live regulatory feed</span>
            <span className="text-[11px] font-normal text-muted-foreground">{live.length} circulars · RBI / SEBI / NPCI / CERT-In</span>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Source</th><th>Title</th><th>Date</th><th>Summary</th></tr>
            </thead>
            <tbody>
              {live.slice(0, 8).map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.source}</td>
                  <td className="font-medium">{r.title}</td>
                  <td className="text-muted-foreground">{r.date}</td>
                  <td className="text-muted-foreground text-xs">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isBeginner && (
        <BeginnerHint>
          Each card below is a regulatory source. Click a row in the table to see a regulation's executive
          summary, obligations, and suggested actions.
        </BeginnerHint>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {regSources.map((s) => (
          <div key={s.key} className="section-container p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{s.key}</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="text-xs text-muted-foreground mb-2 line-clamp-1">{s.name}</div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold">{s.activeCount}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</div>
              </div>
              <RiskBadge risk={s.risk} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">Updated {s.latestUpdate}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-border rounded-md px-3 h-9">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-0 text-sm focus:outline-none w-64"
          />
        </div>
        <select className="border border-border rounded-md px-2.5 h-9 text-sm bg-card" value={source} onChange={(e) => setSource(e.target.value)}>
          <option>All</option><option>RBI</option><option>SEBI</option><option>NPCI</option><option>CERT-In</option><option>Internal</option>
        </select>
        <select className="border border-border rounded-md px-2.5 h-9 text-sm bg-card" value={risk} onChange={(e) => setRisk(e.target.value)}>
          <option>All</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="section-container">
        {filtered.length === 0 ? (
          <EmptyState title="No regulations found" description="Try clearing filters or adjusting your search." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Source</th>
                <th>Published</th>
                <th>Risk Score</th>
                <th>Status</th>
                {isExpert && <th>Departments</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                  <td className="font-mono text-xs">{r.id}</td>
                  <td className="font-medium">{r.title}</td>
                  <td className="text-muted-foreground">{r.source}</td>
                  <td className="text-muted-foreground">{r.publishedDate}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold w-8">{r.riskScore}</span>
                      <RiskBadge risk={r.risk} />
                    </div>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  {isExpert && (
                    <td className="text-xs text-muted-foreground">{r.impactedDepartments.join(", ")}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.title} width="max-w-2xl">
        {open && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{open.id}</span>
              <RiskBadge risk={open.risk} />
              <StatusBadge status={open.status} />
              <span className="ml-auto text-xs text-muted-foreground">Published {open.publishedDate}</span>
            </div>
            <Section title="Executive Summary"><p>{open.summary}</p></Section>
            <Section title="Key Obligations">
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                {open.obligations.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </Section>
            <Section title="Risk Assessment">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-semibold">{open.riskScore}</div>
                <div className="flex-1 h-2 bg-muted rounded">
                  <div className="h-full rounded" style={{ width: `${open.riskScore}%`, background: "hsl(var(--primary))" }} />
                </div>
                <RiskBadge risk={open.risk} />
              </div>
            </Section>
            <Section title="Affected Departments">
              <div className="flex flex-wrap gap-1.5">
                {open.impactedDepartments.map((d) => (
                  <span key={d} className="text-xs border border-border rounded px-2 py-0.5">{d}</span>
                ))}
              </div>
            </Section>
            <Section title="Suggested Actions">
              <ul className="list-decimal ml-5 space-y-1 text-muted-foreground">
                {open.suggestedActions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </Section>
            {open.related.length > 0 && (
              <Section title="Related">
                <div className="flex flex-wrap gap-1.5">
                  {open.related.map((r) => <span key={r} className="text-xs font-mono border border-border rounded px-2 py-0.5">{r}</span>)}
                </div>
              </Section>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</div>
      {children}
    </div>
  );
}
