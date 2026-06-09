import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { RiskBadge } from "@/components/shared/Badges";
import { BeginnerHint } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { Search, AlertTriangle } from "lucide-react";

const oldText = [
  { type: "unchanged", text: "Section 3.1: All regulated entities must maintain KYC records for a minimum period of 5 years." },
  { type: "removed", text: "Section 3.2: Periodic updates of KYC shall be done every 2 years for high-risk customers." },
  { type: "unchanged", text: "Section 3.3: Customer identification procedures must comply with PMLA guidelines." },
  { type: "modified", text: "Section 4.1: Digital KYC (V-CIP) may be used as an alternative to in-person verification." },
  { type: "unchanged", text: "Section 5.1: Non-compliance shall attract penalties as prescribed under Section 13 of PMLA." },
];

const newText = [
  { type: "unchanged", text: "Section 3.1: All regulated entities must maintain KYC records for a minimum period of 5 years." },
  { type: "added", text: "Section 3.2: Periodic updates of KYC shall be done annually for high-risk customers and every 2 years for medium-risk customers." },
  { type: "unchanged", text: "Section 3.3: Customer identification procedures must comply with PMLA guidelines." },
  { type: "modified", text: "Section 4.1: Digital KYC (V-CIP) shall be the preferred method for customer verification, replacing in-person verification where feasible." },
  { type: "unchanged", text: "Section 5.1: Non-compliance shall attract penalties as prescribed under Section 13 of PMLA." },
  { type: "added", text: "Section 5.2: Regulated entities must report KYC compliance status quarterly to RBI." },
];

const bgColor = (type: string) => {
  if (type === "added") return "hsl(var(--success) / 0.10)";
  if (type === "removed") return "hsl(var(--destructive) / 0.10)";
  if (type === "modified") return "hsl(var(--warning) / 0.10)";
  return "transparent";
};

const borderColor = (type: string) => {
  if (type === "added") return "hsl(var(--success))";
  if (type === "removed") return "hsl(var(--destructive))";
  if (type === "modified") return "hsl(var(--warning))";
  return "transparent";
};

export default function ChangeDetection() {
  const isBeginner = useIsBeginner();
  const [severity, setSeverity] = useState("All");
  const [dept, setDept] = useState("All");
  const [query, setQuery] = useState("");

  const filterLine = (line: { type: string; text: string }) => {
    if (query && !line.text.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  };

  const oldFiltered = useMemo(() => oldText.filter(filterLine), [query]);
  const newFiltered = useMemo(() => newText.filter(filterLine), [query]);

  const totalChanges = oldText.filter((t) => t.type !== "unchanged").length + newText.filter((t) => t.type === "added").length;
  const highRisk = 2;

  return (
    <div className="space-y-6">
      <PageHeader title="Clause Change Detection" subtitle="Side-by-side comparison of old vs. new regulatory text with risk-tagged diffs" />

      {isBeginner && (
        <BeginnerHint>
          The left pane is the previous regulation, the right pane is the latest version. Highlighted
          rows show changes — green is added, red is removed, amber is modified.
        </BeginnerHint>
      )}

      <div className="section-container border-l-4 p-4 flex items-start gap-3" style={{ borderLeftColor: "hsl(var(--destructive))" }}>
        <AlertTriangle className="h-5 w-5 mt-0.5 text-[hsl(var(--destructive))]" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Executive summary</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">{totalChanges} clause changes detected</span> across this regulation update —
            <span className="text-[hsl(var(--destructive))] font-semibold"> {highRisk} high risk</span>,
            impacting <span className="font-semibold text-foreground">4 departments</span>.
            Audit exposure: <span className="text-[hsl(var(--warning))] font-semibold">Medium</span>.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Changes" value={totalChanges} />
        <KPI label="High Risk Changes" value={highRisk} tone="text-destructive" />
        <KPI label="Impacted Departments" value={4} />
        <KPI label="Audit Exposure" value="Medium" tone="text-[hsl(var(--warning))]" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-border rounded-md px-3 h-9">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clauses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-0 text-sm focus:outline-none w-56"
          />
        </div>
        <select className="border border-border rounded-md px-2.5 h-9 text-sm bg-card" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        <select className="border border-border rounded-md px-2.5 h-9 text-sm bg-card" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option>All</option><option>Compliance</option><option>Operations</option><option>IT</option><option>Cybersecurity</option><option>Legal</option>
        </select>
        <div className="flex gap-2 ml-auto text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-border rounded">
            <span className="w-2 h-2 rounded" style={{ background: "hsl(var(--success))" }} /> Added
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-border rounded">
            <span className="w-2 h-2 rounded" style={{ background: "hsl(var(--destructive))" }} /> Removed
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-border rounded">
            <span className="w-2 h-2 rounded" style={{ background: "hsl(var(--warning))" }} /> Modified
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 section-container overflow-hidden">
        <Pane title="Old Version (RBI/2024/MD/KYC)" lines={oldFiltered} bgColor={bgColor} borderColor={borderColor} divider />
        <Pane title="New Version (RBI/2026/MD/KYC)" lines={newFiltered} bgColor={bgColor} borderColor={borderColor} />
      </div>
    </div>
  );
}

function KPI({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="kpi-card">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function Pane({ title, lines, bgColor, borderColor, divider }: { title: string; lines: { type: string; text: string }[]; bgColor: (t: string) => string; borderColor: (t: string) => string; divider?: boolean }) {
  return (
    <div className={divider ? "lg:border-r border-border" : ""}>
      <div className="px-4 py-2.5 border-b table-header bg-muted">{title}</div>
      {lines.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No matches.</div>
      ) : (
        lines.map((line, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b last:border-0 text-sm leading-relaxed flex items-start gap-3"
            style={{
              background: bgColor(line.type),
              borderLeft: line.type !== "unchanged" ? `3px solid ${borderColor(line.type)}` : "3px solid transparent",
            }}
          >
            {line.type !== "unchanged" && (
              <span className="mt-0.5"><RiskBadge risk={line.type === "removed" ? "High" : line.type === "modified" ? "Medium" : "Low"} /></span>
            )}
            <span className="flex-1">{line.text}</span>
          </div>
        ))
      )}
    </div>
  );
}
