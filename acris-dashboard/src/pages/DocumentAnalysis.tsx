import { AnyObject } from "@/types";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { BeginnerHint, EmptyState } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { Upload, FileText, CheckCircle2, Loader2, Circle, FileUp, GitCompare, Zap, Sparkles, X, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const STAGES = ["Uploading", "Extracting Text", "Extracting Clauses", "Indexed"];

interface DocRow {
  id: string;
  user_id?: string;
  title: string;
  source?: string;
  status: string;
  pages?: number;
  copilot_mode?: string;
  created_at: string;
}
interface Clause {
  id?: string;
  clauseId?: string;
  text: string;
  category?: string;
  severity?: string;
  obligation?: string;
}

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

export default function DocumentAnalysis() {
  const isBeginner = useIsBeginner();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState(-1);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<DocRow[]>([]);
  const [clauses, setClauses] = useState<Clause[] | null>(null);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [oldDoc, setOldDoc] = useState<string>("");
  const [newDoc, setNewDoc] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [draftType, setDraftType] = useState("sop");
  const [docDraftResult, setDocDraftResult] = useState<string | null>(null);
  const [docDraftBusy, setDocDraftBusy] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<unknown[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;
  const totalPages = Math.ceil(history.length / rowsPerPage);
  const paginatedHistory = history.slice(
    (currentPage - 1) * rowsPerPage,
    (currentPage - 1) * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [history.length]);

  const [executedCompId, setExecutedCompId] = useState<string | null>(
    () => localStorage.getItem("acris.last_comparison_id")
  );

  const loadDraftHistory = () => {
    api.listDraftHistory()
      .then((res) => setSavedDrafts(res || []))
      .catch((err) => console.error("Failed to load drafts history", err));
  };

  const handleDocSelect = async (docId: string) => {
    setActiveDoc(docId);
    setClauses(null);
    try {
      const data = await api.getDocumentClauses(docId);
      setClauses(data);
    } catch (e: AnyObject) {
      toast({ title: "Failed to fetch clauses", description: e.message, variant: "destructive" });
    }
  };

  const handleDraftFromDocument = async (comparisonId?: string | null) => {
    const hasComp = comparisonId && comparisonId.length > 0;
    if (!hasComp && !activeDoc) {
      toast({ title: "Drafting Error", description: "Select a document from upload history to draft compliance document.", variant: "destructive" });
      return;
    }
    setDocDraftBusy(true);
    try {
      const res = hasComp
        ? await api.generateComplianceDocument(draftType, comparisonId ?? undefined, undefined)
        : await api.generateComplianceDocument(draftType, undefined, activeDoc ?? undefined);
      setDocDraftResult(res.draft);
      toast({ title: "Document Draft Generated", description: `Compiled AI draft for compliance ${draftType.toUpperCase()}.` });
      loadDraftHistory();
    } catch (e: unknown) {
      toast({ title: "Analysis failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDocDraftBusy(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { documents } = await api.listDocuments();
      const filtered = !isBeginner
        ? (documents || []).filter((d: DocRow) => d.copilot_mode === "expert")
        : (documents || []);
      setHistory(filtered);
    } catch (e: unknown) {
      console.error(e);
    }
  };
  useEffect(() => {
    loadHistory();
    loadDraftHistory();
  }, []);

  const runPipeline = async (file: File) => {
    try {
      setClauses(null);
      setStage(0);
      const guess = /rbi/i.test(file.name) ? "RBI" : /sebi/i.test(file.name) ? "SEBI" : /npci/i.test(file.name) ? "NPCI" : /cert/i.test(file.name) ? "CERT-In" : "Unknown";
      const up = await api.uploadDocument(file, guess);
      setActiveDoc(up.documentId);
      await loadHistory();
      setStage(1);
      await api.extractText(up.documentId);
      await loadHistory();
      setStage(2);
      const res = await api.extractClauses(up.documentId);
      setClauses(res.clauses);
      await loadHistory();
      setStage(3);
      toast({ title: "Document analyzed", description: `${res.count} clauses extracted.` });

      // Auto-compare pipeline against the previous expert-mode document
      const { documents } = await api.listDocuments();
      const prevDoc = documents.find(
        (d: { id: string, status: string, copilot_mode?: string }) => d.id !== up.documentId && d.status === "analyzed" && d.copilot_mode === "expert"
      );
      if (prevDoc) {
        toast({ title: "Auto-Comparing Revisions...", description: `Comparing against preceding version: ${prevDoc.title}` });
        const comp = await api.compare(prevDoc.id, up.documentId);
        await api.impact(comp.comparisonId);
        await api.generateMaps(comp.comparisonId);
        localStorage.setItem("acris.last_comparison_id", comp.comparisonId);
        setExecutedCompId(comp.comparisonId);
        toast({ title: "Auto-Comparison Completed", description: "Comparisons, impact analysis, and MAP tasks generated successfully." });
      } else {
        toast({ title: "Document Indexed", description: "First document uploaded successfully. Upload a subsequent version later to see auto-comparisons." });
      }
      setStage(4);
    } catch (e: unknown) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
      setStage(-1);
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    runPipeline(files[0]);
  };

  const runExecute = async () => {
    if (!oldDoc || !newDoc || oldDoc === newDoc) {
      toast({ title: "Pick two different documents", variant: "destructive" });
      return;
    }
    setBusy("execute");
    try {
      toast({ title: "Processing comparison...", description: "Identifying added, modified, and removed clauses..." });
      const comp = await api.compare(oldDoc, newDoc);
      
      toast({ title: "Running impact analysis...", description: "Assessing departmental compliance changes..." });
      await api.impact(comp.comparisonId);
      
      toast({ title: "Generating MAPs...", description: "Creating mitigation action items..." });
      await api.generateMaps(comp.comparisonId);
      
      toast({ 
        title: "Execution complete", 
        description: "Entire compliance comparison pipeline executed. Results are now updated across all dedicated pages." 
      });
      
      localStorage.setItem("acris.last_comparison_id", comp.comparisonId);
      setExecutedCompId(comp.comparisonId);
      
      setOldDoc("");
      setNewDoc("");
    } catch (e: AnyObject) {
      toast({ title: "Execution failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (isBeginner) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Document Workspace</h1>
            <p className="text-xs text-muted-foreground mt-1">Upload files to parse circulars, run differentials, and generate mitigation draft guidelines</p>
          </div>
        </div>

        <div className="glass-card flex flex-col items-center justify-center p-16 text-center border rounded-xl" style={{ minHeight: "380px" }}>
          <Zap className="h-16 w-16 text-primary animate-pulse mb-6" style={{ color: "#8B5CF6" }} />
          <h2 className="text-lg font-bold mb-2">Expert Mode Feature Only</h2>
          <p className="text-xs text-muted-foreground max-w-md mb-8 leading-relaxed">
            Document Ingestion and manual uploading is available in Expert Mode only. In Beginner Mode, your compliance workspace is updated automatically via the 24-hour auto-scraping pipeline.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem("reguflow.copilot.mode", "expert");
                window.location.reload();
              }}
              className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg text-xs hover:opacity-90 transition-opacity uppercase tracking-wider"
            >
              Switch to Expert Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Document Workspace</h1>
          <p className="text-xs text-muted-foreground mt-1">Upload files to parse circulars, run differentials, and generate mitigation draft guidelines</p>
        </div>
      </div>

      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
        className={`glass-card p-10 text-center transition-all border-2 border-dashed flex flex-col items-center justify-center ${
          dragging 
            ? "border-primary bg-primary/5 scale-[1.005]" 
            : "border-border hover:border-primary/50 hover:bg-muted/10"
        }`}
      >
        <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-sm shadow-primary/5">
          {dragging ? <FileUp className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1">
          {dragging ? "Release to upload circular" : "Drag and drop regulatory PDF here"}
        </h3>
        <p className="text-xs text-muted-foreground mb-5">Supported formats: PDF up to 25MB</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
        >
          Select File
        </button>
        <input ref={inputRef} type="file" hidden accept=".pdf" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {/* Processing Pipeline Stages */}
      {stage >= 0 && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Processing Pipeline Stages</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STAGES.map((s, i) => {
              const state = stage > i ? "done" : stage === i ? "active" : "pending";
              return (
                <div 
                  key={s} 
                  className={`border rounded-lg p-3.5 flex flex-col justify-between transition-colors ${
                    state === "done" ? "border-emerald-500/25 bg-emerald-500/5" : 
                    state === "active" ? "border-primary/30 bg-primary/5 animate-pulse" : 
                    "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {state === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {state === "active" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {state === "pending" && <Circle className="h-4 w-4 text-muted-foreground/30" />}
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Stage 0{i + 1}
                    </span>
                  </div>
                  <span className={`text-xs ${state === "pending" ? "text-muted-foreground" : "font-bold text-foreground"}`}>
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extracted Clauses Grid */}
      {clauses && clauses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Extracted Clauses ({clauses.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clauses.map((c, i) => (
              <div key={i} className="glass-card p-4 border-l-4 border-l-primary/40 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{c.clauseId ?? c.id}</span>
                    <span className="badge badge-info text-[9px] font-bold uppercase tracking-wider bg-primary/5 border-primary/20 text-primary">
                      {c.category}
                    </span>
                  </div>
                  {c.severity && <RiskBadge risk={c.severity} />}
                </div>
                <p className="text-xs text-foreground font-semibold leading-relaxed mb-3 flex-1">{c.text}</p>
                {c.obligation && (
                  <div className="text-[10px] text-muted-foreground font-medium pt-2 border-t border-border/40">
                    Obligation: <span className="text-foreground">{c.obligation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Single Doc Drafting */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>AI Compliance Document Drafting</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Generate policy guidelines, amended SOPs, checklists, or employee internal bulletins matching the active clauses extracted above.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-md pt-2">
              <div className="flex-1">
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Draft Target Type
                </label>
                <select
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                  className="premium-select text-xs h-9 bg-background focus:outline-none"
                >
                  <option value="sop">SOP Amendment</option>
                  <option value="policy">Board Policy Draft</option>
                  <option value="circular">Internal Circular</option>
                  <option value="checklist">Audit Checklist</option>
                </select>
              </div>
              <button
                onClick={() => handleDraftFromDocument(null)}
                disabled={docDraftBusy}
                className="bg-primary text-primary-foreground font-bold px-4 h-9 rounded-lg text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                {docDraftBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>Draft Policy Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Comparison is run automatically on single PDF upload */}

      {/* Expert Step 3 Section */}
      {executedCompId && (
        <div className="glass-card p-5 space-y-3 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>Draft Policy from Comparative Difference Analysis</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full">
              Expert Mode · Step 03
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Synthesize compliance circular policy guidelines reflecting only the *changes* detected between versions.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-md pt-1">
            <div className="flex-1">
              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Draft Document Type
              </label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                className="premium-select text-xs h-9 bg-background focus:outline-none"
              >
                <option value="sop">SOP Amendment</option>
                <option value="policy">Board Policy Draft</option>
                <option value="circular">Internal Circular</option>
                <option value="checklist">Audit Checklist</option>
              </select>
            </div>
            <button
              onClick={() => handleDraftFromDocument(executedCompId)}
              disabled={docDraftBusy}
              className="bg-primary text-primary-foreground font-bold px-4 h-9 rounded-lg text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              {docDraftBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>Draft Document</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload History & Draft History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upload History List */}
        <div className="glass-card lg:col-span-2 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border text-sm font-bold text-foreground">Upload History</div>
          {history.length === 0 ? (
            <EmptyState title="No uploads yet" />
          ) : (
            <>
              <div className="overflow-x-auto w-full flex-1">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Source</th>
                      <th>Pages</th>
                      <th>Uploaded At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((f) => (
                      <tr 
                        key={f.id}
                        onClick={() => f.status === "analyzed" && handleDocSelect(f.id)}
                        className={`cursor-pointer transition-colors ${
                          activeDoc === f.id ? "bg-primary/5 hover:bg-primary/10" : ""
                        }`}
                      >
                        <td className="font-semibold text-foreground flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-muted-foreground" /> 
                          <span className="truncate max-w-[200px]">{f.title}</span>
                        </td>
                        <td>
                          <span className="badge badge-info bg-primary/5 border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                            {f.source ?? "—"}
                          </span>
                        </td>
                        <td className="text-muted-foreground text-xs font-semibold">{f.pages ?? "—"}</td>
                        <td className="text-muted-foreground text-xs font-semibold">
                          {new Date(f.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            f.status === "analyzed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : 
                            "bg-muted text-muted-foreground border-border"
                          }`}>
                            {f.status}
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
                    Showing <span className="text-foreground">{Math.min(history.length, (currentPage - 1) * rowsPerPage + 1)}</span> to{" "}
                    <span className="text-foreground">{Math.min(history.length, currentPage * rowsPerPage)}</span> of{" "}
                    <span className="text-foreground">{history.length}</span> entries
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

        {/* Saved Draft History */}
        <div className="glass-card flex flex-col">
          <div className="px-4 py-3 border-b border-border text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> 
            <span>Saved Draft History</span>
          </div>
          {savedDrafts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <span className="text-xs text-muted-foreground font-semibold italic">No drafts generated yet</span>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1 p-4 flex-1 max-h-[340px]">
              {savedDrafts.map((d) => (
                <div
                  key={d.id}
                  onClick={async () => {
                    setDraftType(d.type);
                    try {
                      const res = await api.getDraft(d.id);
                      setDocDraftResult(res.content);
                    } catch (err: unknown) {
                      toast({ title: "Report generation failed", description: (err as Error).message, variant: "destructive" });
                    }
                  }}
                  className="p-3 border border-border hover:bg-muted/40 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  <div className="font-bold text-foreground flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{d.title}</span>
                    <span className="text-[9px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-primary uppercase font-extrabold">
                      v{d.version}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 truncate font-medium">
                    {d.source}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-2 flex items-center justify-between font-bold">
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                    <span className="uppercase text-[8px] tracking-wide text-primary">{d.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generated Draft Output Modal */}
      {docDraftResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-2xl p-5 flex flex-col h-[75vh]">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <div className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" /> 
                <span>Compiled Compliance Draft ({draftType.toUpperCase()})</span>
              </div>
              <button onClick={() => setDocDraftResult(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-muted/20 p-4 rounded-lg border border-border font-mono text-xs whitespace-pre-wrap leading-relaxed select-all">
              {docDraftResult}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
              <button 
                onClick={() => setDocDraftResult(null)} 
                className="px-4 h-9 text-xs border border-border bg-card rounded-lg hover:bg-muted font-bold text-foreground transition-colors uppercase tracking-wider"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([docDraftResult], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${draftType.toUpperCase()}-Draft.txt`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  toast({ title: "Draft Downloaded", description: "Compliance draft text file downloaded." });
                }}
                className="px-4 h-9 text-xs border border-border bg-card rounded-lg hover:bg-muted font-bold text-foreground transition-colors uppercase tracking-wider"
              >
                Download Draft
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(docDraftResult);
                  toast({ title: "Copied to clipboard", description: "Compliance draft copied successfully." });
                }}
                className="px-4 h-9 text-xs bg-primary text-primary-foreground font-extrabold rounded-lg hover:opacity-90 transition-opacity uppercase tracking-wider"
              >
                Copy Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}