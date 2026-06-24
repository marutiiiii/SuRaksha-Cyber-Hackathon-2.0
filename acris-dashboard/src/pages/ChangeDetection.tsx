import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { BeginnerHint, EmptyState } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { Search, AlertTriangle, Loader2, GitCompare, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/state/AuthContext";
import ViewOnlyBanner from "@/components/shared/ViewOnlyBanner";

const defaultOld = [
  { type: "unchanged", text: "Section 3.1: All regulated entities must maintain KYC records for a minimum period of 5 years.", severity: "Low", department: "Compliance" },
  { type: "removed", text: "Section 3.2: Periodic updates of KYC shall be done every 2 years for high-risk customers.", severity: "High", department: "Operations" },
  { type: "unchanged", text: "Section 3.3: Customer identification procedures must comply with PMLA guidelines.", severity: "Low", department: "Compliance" },
  { type: "modified", text: "Section 4.1: Digital KYC (V-CIP) may be used as an alternative to in-person verification.", severity: "Medium", department: "IT" },
  { type: "unchanged", text: "Section 5.1: Non-compliance shall attract penalties as prescribed under Section 13 of PMLA.", severity: "Low", department: "Legal" },
];

const defaultNew = [
  { type: "unchanged", text: "Section 3.1: All regulated entities must maintain KYC records for a minimum period of 5 years.", severity: "Low", department: "Compliance" },
  { type: "added", text: "Section 3.2: Periodic updates of KYC shall be done annually for high-risk customers and every 2 years for medium-risk customers.", severity: "High", department: "Operations" },
  { type: "unchanged", text: "Section 3.3: Customer identification procedures must comply with PMLA guidelines.", severity: "Low", department: "Compliance" },
  { type: "modified", text: "Section 4.1: Digital KYC (V-CIP) shall be the preferred method for customer verification, replacing in-person verification where feasible.", severity: "Medium", department: "IT" },
  { type: "unchanged", text: "Section 5.1: Non-compliance shall attract penalties as prescribed under Section 13 of PMLA.", severity: "Low", department: "Legal" },
  { type: "added", text: "Section 5.2: Regulated entities must report KYC compliance status quarterly to RBI.", severity: "Medium", department: "Compliance" },
];

function RiskBadge({ risk }: { risk: string }) {
  let badgeClass = "badge-medium";
  if (risk === "High" || risk === "Critical") badgeClass = "badge-high";
  if (risk === "Low") badgeClass = "badge-low";
  return (
    <span className={`badge ${badgeClass} text-[9px] font-bold`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {risk}
    </span>
  );
}

export default function ChangeDetection() {
  const isBeginner = useIsBeginner();
  const { user } = useAuth();
  const userType = user?.user_type || user?.user_metadata?.user_type || "admin";
  const userDepartment = user?.department || user?.user_metadata?.department || "";

  const [severity, setSeverity] = useState("All");
  const [dept, setDept] = useState(() => {
    return userDepartment ? userDepartment.toLowerCase() : "All";
  });
  const [query, setQuery] = useState("");
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [oldText, setOldText] = useState<any[]>(defaultOld);
  const [newText, setNewText] = useState<any[]>(defaultNew);
  const [meta, setMeta] = useState({
    title: "KYC Directives",
    oldTitle: "RBI/2024/MD/KYC",
    newTitle: "RBI/2026/MD/KYC",
    totalChanges: 3,
    highRisk: 1,
    impactedDepts: 3,
    exposure: "Medium"
  });

  useEffect(() => {
    if (userDepartment) {
      setDept(userDepartment.toLowerCase());
    }
  }, [userDepartment]);

  useEffect(() => {
    api.listComparisons()
      .then((res) => {
        setComparisons(res || []);
        const lastId = localStorage.getItem("acris.last_comparison_id");
        if (lastId) {
          setSelectedCompId(lastId);
        } else if (res && res.length > 0) {
          setSelectedCompId(res[0].comparisonId);
        }
      })
      .catch((err) => console.error("Failed to load comparisons list", err));
  }, []);

  useEffect(() => {
    if (!selectedCompId) {
      setOldText(defaultOld);
      setNewText(defaultNew);
      setMeta({
        title: "KYC Directives",
        oldTitle: "RBI/2024/MD/KYC",
        newTitle: "RBI/2026/MD/KYC",
        totalChanges: 3,
        highRisk: 1,
        impactedDepts: 3,
        exposure: "Medium"
      });
      setLoading(false);
      return;
    }
    localStorage.setItem("acris.last_comparison_id", selectedCompId);
    setLoading(true);
    api.getComparison(selectedCompId)
      .then((res) => {
        setOldText(res.oldAligned || []);
        setNewText(res.newAligned || []);
        const total = (res.added?.length || 0) + (res.modified?.length || 0) + (res.removed?.length || 0);
        const high = [...(res.added || []), ...(res.modified || []), ...(res.removed || [])].filter((c: any) => c.severity === "High" || c.severity === "Critical").length;
        const depts = new Set([...(res.added || []), ...(res.modified || []), ...(res.removed || [])].map((c: any) => c.category).filter(Boolean));
        setMeta({
          title: "Circular Comparison",
          oldTitle: res.oldDocumentTitle || "Old Document",
          newTitle: res.newDocumentTitle || "New Document",
          totalChanges: total,
          highRisk: high,
          impactedDepts: depts.size || 1,
          exposure: high > 0 ? "High" : total > 5 ? "Medium" : "Low"
        });
        setLoading(false);
      })
      .catch((err) => {
        if (userType === "department_officer" && (err.message?.includes("not found") || err.message?.includes("NotFound"))) {
          toast({
            title: "View-Only Access",
            description: "No comparison has been generated yet. Please ask an AI Compliance Officer to upload and compare documents first.",
            variant: "default"
          });
        } else {
          toast({ title: "Failed to load comparison", description: err.message, variant: "destructive" });
        }
        setLoading(false);
      });
  }, [selectedCompId]);

  const filterLine = (line: { type: string; text: string; severity?: string; department?: string }) => {
    if (query && !line.text.toLowerCase().includes(query.toLowerCase())) return false;
    if (severity !== "All") {
      const lineSev = line.severity || "Low";
      if (lineSev.toLowerCase() !== severity.toLowerCase()) return false;
    }
    if (dept !== "All") {
      const lineDept = line.department || "Compliance";
      if (lineDept.replace(" Team", "").toLowerCase() !== dept.toLowerCase()) return false;
    }
    return true;
  };

  const oldFiltered = useMemo(() => oldText.filter(filterLine), [oldText, query, severity, dept]);
  const newFiltered = useMemo(() => newText.filter(filterLine), [newText, query, severity, dept]);

  const totalChanges = meta.totalChanges;
  const highRisk = meta.highRisk;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Clause Change Detection</h1>
            <p className="text-xs text-muted-foreground mt-1">Side-by-side comparison of old vs. new regulatory text with risk-tagged diffs</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Comparing document revisions...</span>
        </div>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <PageHeader title="Clause Change Detection" subtitle="Side-by-side comparison of old vs. new regulatory text with risk-tagged diffs" />
        <ViewOnlyBanner />
        {isBeginner && (
          <BeginnerHint>
            Review the comparison below to identify added, modified, and removed clauses between the chosen circular versions.
          </BeginnerHint>
        )}
        <EmptyState 
          title="No comparisons available" 
          description={userType === "department_officer" 
            ? "No active comparisons have been generated by your AI Compliance Officer yet." 
            : "Please upload and execute a document comparison in the Document Analysis Workspace."} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Clause Change Detection</h1>
          <p className="text-xs text-muted-foreground mt-1">Side-by-side comparison of old vs. new regulatory text with risk-tagged diffs</p>
        </div>
      </div>

      <ViewOnlyBanner />

      {isBeginner && (
        <BeginnerHint>
          The left pane is the preceding regulation, the right pane is the target version. Highlights: green (added), red (removed), amber (modified).
        </BeginnerHint>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Comparing document revisions...</span>
        </div>
      ) : (
        <>
          {/* Executive Overview Banner */}
          <div className="glass-card border-l-4 border-l-destructive p-4 flex items-start gap-3 bg-red-500/5">
            <AlertTriangle className="h-5 w-5 mt-0.5 text-rose-500" />
            <div className="flex-1">
              <div className="text-xs font-extrabold uppercase tracking-wider text-rose-500 mb-0.5">Executive Summary</div>
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                {totalChanges} clause changes detected between versions —
                <span className="text-rose-500 font-bold"> {highRisk} high risk</span>,
                impacting <span className="font-bold">{meta.impactedDepts} departments</span>.
                Audit exposure rated as <span className="text-amber-500 font-bold">{meta.exposure}</span>.
              </p>
            </div>
          </div>

          {/* Bento Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total Changes" value={totalChanges} />
            <KPI label="High Risk Changes" value={highRisk} tone="text-rose-500" />
            <KPI label="Impacted Departments" value={meta.impactedDepts} />
            <KPI label="Audit Exposure" value={meta.exposure} tone="text-amber-500" />
          </div>

          {/* Filters Area */}
          <div className="glass-card p-4 flex flex-wrap items-center gap-3">
            {comparisons.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">Active Circular:</span>
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                  className="premium-select text-xs h-9 min-w-[180px] bg-background focus:outline-none"
                >
                  <option value="">Static Default Demo</option>
                  {comparisons.map((c) => (
                    <option key={c.comparisonId} value={c.comparisonId}>
                      {c.newDocumentTitle.substring(0, 16)}... vs {c.oldDocumentTitle.substring(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clauses..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="premium-input text-xs pl-9 pr-3 h-9 w-[180px] focus:outline-none"
              />
            </div>

            <select 
              className="premium-select text-xs h-9 min-w-[120px] bg-background focus:outline-none"
              value={severity} 
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select 
              className="premium-select text-xs h-9 min-w-[150px] bg-background focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
              value={dept} 
              onChange={(e) => setDept(e.target.value)}
              disabled={!!userDepartment}
            >
              <option value="All">All Departments</option>
              <option value="compliance">Compliance</option>
              <option value="legal">Legal</option>
              <option value="it">IT</option>
              <option value="cybersecurity">Cybersecurity</option>
              <option value="operations">Operations</option>
              <option value="audit">Audit</option>
              <option value="risk management">Risk Management</option>
            </select>

            <div className="flex gap-2 ml-auto text-[10px] font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> Added
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> Removed
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> Modified
              </span>
            </div>
          </div>

          {/* Double Pane Aligned Comparisons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 glass-card overflow-hidden bg-card">
            <Pane title={`Old Version (${meta.oldTitle})`} lines={oldFiltered} divider />
            <Pane title={`New Version (${meta.newTitle})`} lines={newFiltered} />
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, tone = "text-foreground" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

function Pane({ title, lines, divider }: { title: string; lines: any[]; divider?: boolean }) {
  const getLineClasses = (type: string) => {
    if (type === "added") return "bg-emerald-500/5 border-l-4 border-l-emerald-500";
    if (type === "removed") return "bg-rose-500/5 border-l-4 border-l-rose-500";
    if (type === "modified") return "bg-amber-500/5 border-l-4 border-l-amber-500";
    return "border-l-4 border-l-transparent";
  };

  return (
    <div className={divider ? "lg:border-r border-border" : ""}>
      <div className="px-4 py-3 border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="divide-y divide-border">
        {lines.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-semibold">No clauses match active filters.</div>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={`px-4 py-3.5 text-xs leading-relaxed flex items-start gap-3 transition-colors ${getLineClasses(line.type)}`}
            >
              {line.type !== "unchanged" && (
                <span className="mt-0.5">
                  <RiskBadge risk={line.severity || (line.type === "removed" ? "High" : line.type === "modified" ? "Medium" : "Low")} />
                </span>
              )}
              <div className="flex-1 font-semibold">
                <span className="font-mono text-[10px] block text-primary font-bold mb-0.5">{line.clauseId}</span>
                <span className="text-foreground">{line.text}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
