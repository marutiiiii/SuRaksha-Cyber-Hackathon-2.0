import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { BeginnerHint, EmptyState } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { Search, AlertTriangle, Loader2, GitCompare, ArrowRight, Layers, FileText, CheckSquare, Sparkles, Calendar, User } from "lucide-react";
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
  if (risk === "High" || risk === "Critical" || risk === "CRITICAL" || risk === "HIGH") badgeClass = "badge-high";
  if (risk === "Low" || risk === "LOW") badgeClass = "badge-low";
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

  const [activeTab, setActiveTab] = useState<"stacked" | "sideBySide" | "maps">("stacked");
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
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [associatedMaps, setAssociatedMaps] = useState<any[]>([]);
  
  const [meta, setMeta] = useState({
    title: "KYC Directives",
    oldTitle: "RBI/2024/MD/KYC",
    newTitle: "RBI/2026/MD/KYC",
    totalChanges: 3,
    highRisk: 1,
    impactedDepts: 3,
    exposure: "Medium"
  });

  // State variables for manual comparison execution
  const [documents, setDocuments] = useState<any[]>([]);
  const [oldDocId, setOldDocId] = useState<string>("");
  const [newDocId, setNewDocId] = useState<string>("");
  const [executing, setExecuting] = useState<boolean>(false);

  const loadDocuments = () => {
    api.listDocuments()
      .then((res) => {
        const analyzed = (res.documents || []).filter((d: any) => d.status === "analyzed");
        setDocuments(analyzed);
      })
      .catch((err) => console.error("Failed to load documents", err));
  };

  const handleRunComparison = async () => {
    if (!oldDocId || !newDocId || oldDocId === newDocId) {
      toast({ title: "Please pick two different documents", variant: "destructive" });
      return;
    }
    setExecuting(true);
    try {
      toast({ title: "Comparing documents...", description: "Aligning text and detecting modifications..." });
      const comp = await api.compare(oldDocId, newDocId);
      
      toast({ title: "Generating impact analysis...", description: "Analyzing departmental roles and categories..." });
      await api.impact(comp.comparisonId);
      
      toast({ title: "Creating Measurable Action Points (MAPs)...", description: "Mapping audit readiness evidence..." });
      await api.generateMaps(comp.comparisonId);
      
      toast({ title: "Success", description: "Comparison executed successfully!" });
      
      // Reload comparisons and select the new one
      const res = await api.listComparisons();
      setComparisons(res || []);
      setSelectedCompId(comp.comparisonId);
      localStorage.setItem("acris.last_comparison_id", comp.comparisonId);
      
      setOldDocId("");
      setNewDocId("");
      loadDocuments();
    } catch (err: any) {
      toast({ title: "Comparison failed", description: err.message, variant: "destructive" });
    } finally {
      setExecuting(false);
    }
  };

  const ComparisonLauncher = () => {
    if (userType === "department_officer") return null;
    return (
      <div className="glass-card p-4 border rounded-xl flex flex-col md:flex-row items-end gap-3 bg-muted/10">
        <div className="flex-1 w-full space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preceding Version (Old)</label>
          <select
            value={oldDocId}
            onChange={(e) => setOldDocId(e.target.value)}
            className="premium-select text-xs h-9 w-full bg-background focus:outline-none"
            disabled={executing}
          >
            <option value="">Select predecessor document...</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({new Date(doc.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 w-full space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Version (New)</label>
          <select
            value={newDocId}
            onChange={(e) => setNewDocId(e.target.value)}
            className="premium-select text-xs h-9 w-full bg-background focus:outline-none"
            disabled={executing}
          >
            <option value="">Select target document...</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({new Date(doc.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRunComparison}
          disabled={executing || !oldDocId || !newDocId}
          className="bg-primary text-primary-foreground font-semibold h-9 px-4 rounded-lg text-xs hover:opacity-90 transition-opacity uppercase tracking-wider flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
        >
          {executing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <GitCompare className="h-3.5 w-3.5" />
              Compare
            </>
          )}
        </button>
      </div>
    );
  };

  useEffect(() => {
    if (userDepartment) {
      setDept(userDepartment.toLowerCase());
    }
  }, [userDepartment]);

  useEffect(() => {
    loadDocuments();
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
      setComparisonData(null);
      setAssociatedMaps([]);
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
    
    // Fetch comparison details
    api.getComparison(selectedCompId)
      .then((res) => {
        setComparisonData(res);
        setOldText(res.oldAligned || []);
        setNewText(res.newAligned || []);
        const total = (res.added?.length || 0) + (res.modified?.length || 0) + (res.removed?.length || 0);
        const high = [...(res.added || []), ...(res.modified || []), ...(res.removed || [])].filter((c: any) => c.severity === "High" || c.severity === "Critical" || c.severity === "HIGH" || c.severity === "CRITICAL").length;
        const depts = new Set([...(res.added || []), ...(res.modified || []), ...(res.removed || [])].map((c: any) => c.category || c.department).filter(Boolean));
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

    // Fetch maps
    api.listMaps()
      .then((res) => {
        const filtered = (res || []).filter((m: any) => m.comparison_id === selectedCompId);
        setAssociatedMaps(filtered);
      })
      .catch((err) => console.error("Failed to load maps for comparison", err));

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

  // Compute filtered modified, added, removed items for the Stacked Diffs Tab
  const filteredChanges = useMemo(() => {
    if (!comparisonData) return { modified: [], added: [], removed: [] };

    const filterObj = (text: string, sev?: string, cat?: string) => {
      if (query && !text.toLowerCase().includes(query.toLowerCase())) return false;
      if (severity !== "All") {
        const itemSev = sev || "Low";
        if (itemSev.toLowerCase() !== severity.toLowerCase()) return false;
      }
      if (dept !== "All") {
        const itemDept = cat || "Compliance";
        if (itemDept.replace(" Team", "").toLowerCase() !== dept.toLowerCase()) return false;
      }
      return true;
    };

    return {
      modified: (comparisonData.modified || []).filter((item: any) => filterObj(item.newText || item.oldText, item.severity, item.category)),
      added: (comparisonData.added || []).filter((item: any) => filterObj(item.text, item.severity, item.category)),
      removed: (comparisonData.removed || []).filter((item: any) => filterObj(item.text, item.severity, item.category))
    };
  }, [comparisonData, query, severity, dept]);

  const filteredMaps = useMemo(() => {
    return associatedMaps.filter((m: any) => {
      if (query && !m.title.toLowerCase().includes(query.toLowerCase()) && !m.description?.toLowerCase().includes(query.toLowerCase())) return false;
      if (severity !== "All") {
        if (m.severity?.toLowerCase() !== severity.toLowerCase()) return false;
      }
      if (dept !== "All") {
        const mDept = m.assigned_department || m.department || "Compliance";
        if (mDept.replace(" Team", "").toLowerCase() !== dept.toLowerCase()) return false;
      }
      return true;
    });
  }, [associatedMaps, query, severity, dept]);

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
        {userType !== "department_officer" && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-semibold">
              Select two parsed documents from your database to run a comparative diff analysis:
            </div>
            <ComparisonLauncher />
          </div>
        )}
        <EmptyState 
          title="No comparisons available" 
          description={userType === "department_officer" 
            ? "No active comparisons have been generated by your AI Compliance Officer yet." 
            : "No comparative data exists. Select two documents above and click 'Compare' to execute the difference engine."} 
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
          Use the tabs below to switch between Stacked Diffs, Side-by-Side Document Alignment, and the Compliance MAPs Action Plan.
        </BeginnerHint>
      )}

      {userType !== "department_officer" && (
        <ComparisonLauncher />
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
                placeholder="Search clauses/MAPs..."
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-2">
            <button
              onClick={() => setActiveTab("stacked")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "stacked" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Layers className="h-3.5 w-3.5" />
              Clause Changes (Stacked Diffs)
            </button>
            <button
              onClick={() => setActiveTab("sideBySide")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "sideBySide" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <GitCompare className="h-3.5 w-3.5" />
              Document Alignment (Side-by-Side)
            </button>
            <button
              onClick={() => setActiveTab("maps")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "maps" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Compliance MAPs ({filteredMaps.length})
            </button>
          </div>

          {/* Tab Panels */}
          {activeTab === "stacked" && (
            <div className="space-y-4">
              {filteredChanges.modified.length === 0 && filteredChanges.added.length === 0 && filteredChanges.removed.length === 0 ? (
                <div className="glass-card p-12 text-center text-xs text-muted-foreground font-semibold">
                  No changes match active filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {/* Modified sentences */}
                  {filteredChanges.modified.map((item: any, idx: number) => {
                    const simPct = Math.round((item.similarity || 0) * 100);
                    return (
                      <div key={`mod-${idx}`} className="glass-card p-4 border border-l-4 border-l-amber-500 bg-amber-500/5 rounded-xl space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Change #{idx + 1} — Modified Clause
                          </span>
                          <span className="flex items-center gap-2">
                            <RiskBadge risk={item.severity || "Medium"} />
                            <span className="text-[10px] font-semibold text-muted-foreground">{simPct}% match</span>
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Previous version (Database):</div>
                            <p className="text-xs text-muted-foreground line-through leading-relaxed bg-rose-500/5 p-2 rounded border border-rose-500/10">
                              {item.oldText || item.old}
                            </p>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-amber-500 uppercase mb-1">Updated version (Uploaded PDF):</div>
                            <p className="text-xs text-foreground font-semibold leading-relaxed bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                              {item.newText || item.new}
                            </p>
                          </div>
                          {item.reason && (
                            <div className="text-[10px] text-muted-foreground italic flex items-start gap-1.5 pt-1.5 border-t border-border/40">
                              <span className="font-bold uppercase not-italic text-[9px] text-primary">Explanation:</span>
                              {item.reason}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                          <span>Clause ID: <span className="font-mono text-primary font-bold">{item.id || item.old_id}</span></span>
                          <span className="uppercase font-bold tracking-wider">{item.category || "General"}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Added sentences */}
                  {filteredChanges.added.map((item: any, idx: number) => (
                    <div key={`add-${idx}`} className="glass-card p-4 border border-l-4 border-l-emerald-500 bg-emerald-500/5 rounded-xl space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-border/40">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Added Clause
                        </span>
                        <RiskBadge risk={item.severity || "Medium"} />
                      </div>
                      <p className="text-xs text-foreground font-semibold leading-relaxed">
                        {item.text}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                        <span>Clause ID: <span className="font-mono text-primary font-bold">{item.id}</span></span>
                        <span className="uppercase font-bold tracking-wider">{item.category || "General"}</span>
                      </div>
                    </div>
                  ))}

                  {/* Removed sentences */}
                  {filteredChanges.removed.map((item: any, idx: number) => (
                    <div key={`rem-${idx}`} className="glass-card p-4 border border-l-4 border-l-rose-500 bg-rose-500/5 rounded-xl space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-border/40">
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Removed Clause
                        </span>
                        <RiskBadge risk={item.severity || "High"} />
                      </div>
                      <p className="text-xs text-muted-foreground line-through leading-relaxed">
                        {item.text}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                        <span>Clause ID: <span className="font-mono text-primary font-bold">{item.id}</span></span>
                        <span className="uppercase font-bold tracking-wider">{item.category || "General"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "sideBySide" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 glass-card overflow-hidden bg-card">
              <Pane title={`Old Version (${meta.oldTitle})`} lines={oldFiltered} divider />
              <Pane title={`New Version (${meta.newTitle})`} lines={newFiltered} />
            </div>
          )}

          {activeTab === "maps" && (
            <div className="space-y-4">
              {filteredMaps.length === 0 ? (
                <div className="glass-card p-12 text-center text-xs text-muted-foreground font-semibold">
                  No compliance Action Points (MAPs) generated for this comparison. Click "Compare" or ensure the comparison completed execution.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMaps.map((map: any) => (
                    <div key={map.id} className={`glass-card p-4 border-l-4 rounded-xl flex flex-col justify-between ${map.severity === "High" || map.severity === "Critical" ? "border-l-rose-500" : map.severity === "Medium" ? "border-l-amber-500" : "border-l-emerald-500"}`}>
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase">{map.id.substring(0, 8)}</span>
                          <RiskBadge risk={map.severity} />
                        </div>
                        <h4 className="text-xs font-bold text-foreground mb-1">{map.title}</h4>
                        {map.description && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{map.description}</p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-border/50 flex flex-wrap justify-between items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {map.owner || "Unassigned"}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {map.deadline || "No deadline"}</span>
                        <span className="badge badge-low text-[8px] uppercase tracking-wider">{map.assigned_department || map.department || "Compliance"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${map.status === "Completed" ? "bg-emerald-500/10 text-emerald-500" : map.status === "Awaiting Validation" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>{map.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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

