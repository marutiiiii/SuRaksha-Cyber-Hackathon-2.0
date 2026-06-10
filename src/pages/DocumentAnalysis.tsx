import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { RiskBadge } from "@/components/shared/Badges";
import { BeginnerHint, EmptyState } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { Upload, FileText, CheckCircle2, Loader2, Circle, FileUp, GitCompare, Zap, ListChecks } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const STAGES = ["Uploading", "Extracting Text", "Extracting Clauses", "Indexed"];

interface DocRow {
  id: string;
  title: string;
  source?: string;
  status: string;
  pages?: number;
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
  const [comparison, setComparison] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const { documents } = await api.listDocuments();
      setHistory(documents);
    } catch (e: any) {
      console.error(e);
    }
  };
  useEffect(() => { loadHistory(); }, []);

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
    } catch (e: any) {
      toast({ title: "Pipeline failed", description: e.message, variant: "destructive" });
      setStage(-1);
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    runPipeline(files[0]);
  };

  const typeColor = (t: string) =>
    t === "added"
      ? "border-l-[hsl(var(--success))]"
      : t === "removed"
      ? "border-l-[hsl(var(--destructive))]"
      : "border-l-[hsl(var(--warning))]";

  const runCompare = async () => {
    if (!oldDoc || !newDoc || oldDoc === newDoc) {
      toast({ title: "Pick two different documents", variant: "destructive" });
      return;
    }
    setBusy("compare");
    try {
      const r = await api.compare(oldDoc, newDoc);
      setComparison(r);
      toast({ title: "Comparison complete", description: `+${r.counts.added} / -${r.counts.removed} / ~${r.counts.modified}` });
    } catch (e: any) {
      toast({ title: "Compare failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const runImpact = async () => {
    if (!comparison?.comparisonId) return;
    setBusy("impact");
    try {
      const r = await api.impact(comparison.comparisonId);
      toast({ title: "Impact analysis ready", description: `${r.matrix.length} departments scored. View in Impact Analysis.` });
    } catch (e: any) {
      toast({ title: "Impact failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const runMaps = async () => {
    if (!comparison?.comparisonId) return;
    setBusy("maps");
    try {
      const r = await api.generateMaps(comparison.comparisonId);
      toast({ title: "MAPs generated", description: `${r.count} action points added. View in MAPs.` });
    } catch (e: any) {
      toast({ title: "MAP generation failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const added = comparison?.added ?? [];
  const removed = comparison?.removed ?? [];
  const modified = comparison?.modified ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Document Analysis Workspace" subtitle="Upload regulatory documents and run an automated diff + impact pipeline" />

      {isBeginner && (
        <BeginnerHint>
          Drag a PDF below. ReguFlow AI uploads it, extracts the text, and uses AI to detect regulatory
          clauses. After two documents are analyzed you can run change detection, impact analysis, and
          generate action points.
        </BeginnerHint>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
        className={`section-container p-10 text-center transition-all border-2 border-dashed ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          {dragging ? <FileUp className="h-7 w-7 text-primary" /> : <Upload className="h-7 w-7 text-primary" />}
        </div>
        <div className="text-base font-semibold mb-1">{dragging ? "Drop your file here" : "Drag & drop a regulatory document"}</div>
        <div className="text-xs text-muted-foreground mb-4">Accepted: PDF · Max 25 MB · Real pipeline</div>
        <button
          onClick={() => inputRef.current?.click()}
          className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium rounded hover:opacity-90 transition-opacity"
        >
          Choose file
        </button>
        <input ref={inputRef} type="file" hidden accept=".pdf" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {stage >= 0 && (
        <div className="section-container p-5">
          <div className="text-sm font-semibold mb-4">Processing pipeline</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {STAGES.map((s, i) => {
              const state = stage > i ? "done" : stage === i ? "active" : "pending";
              const bg =
                state === "done" ? "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.08)]"
                : state === "active" ? "border-primary bg-primary/10 animate-pulse"
                : "border-border bg-muted/30";
              return (
                <div key={s} className={`border rounded-md p-2.5 transition-colors ${bg}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {state === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />}
                    {state === "active" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    {state === "pending" && <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stage {i + 1}</span>
                  </div>
                  <div className={`text-xs ${state === "pending" ? "text-muted-foreground" : "font-medium"}`}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {clauses && clauses.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold">Extracted clauses ({clauses.length})</div>
          <div className="grid md:grid-cols-2 gap-3">
            {clauses.map((c, i) => (
              <div key={i} className="section-container p-4 border-l-4 border-l-primary/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{c.clauseId ?? c.id}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.category}</span>
                  </div>
                  {c.severity && <RiskBadge risk={c.severity} />}
                </div>
                <div className="text-sm mb-2 line-clamp-4">{c.text}</div>
                {c.obligation && <div className="text-xs text-muted-foreground">Obligation: <span className="text-foreground">{c.obligation}</span></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length >= 2 && (
        <div className="section-container p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <GitCompare className="h-4 w-4 text-primary" /> Compare two versions
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Old version</label>
              <select value={oldDoc} onChange={(e) => setOldDoc(e.target.value)} className="border border-border rounded-md w-full px-2 h-9 text-sm bg-background mt-1">
                <option value="">Select…</option>
                {history.filter((h) => h.status === "analyzed").map((h) => <option key={h.id} value={h.id}>{h.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">New version</label>
              <select value={newDoc} onChange={(e) => setNewDoc(e.target.value)} className="border border-border rounded-md w-full px-2 h-9 text-sm bg-background mt-1">
                <option value="">Select…</option>
                {history.filter((h) => h.status === "analyzed").map((h) => <option key={h.id} value={h.id}>{h.title}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={runCompare} disabled={busy === "compare"} className="bg-primary text-primary-foreground px-3 h-9 rounded text-sm hover:opacity-90 disabled:opacity-60 w-full">
                {busy === "compare" ? "Comparing…" : "Run change detection"}
              </button>
            </div>
          </div>

          {comparison && (
            <>
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="border border-border rounded-md p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Added</div>
                  <div className="text-xl font-semibold text-[hsl(var(--success))]">{comparison.counts.added}</div>
                </div>
                <div className="border border-border rounded-md p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Removed</div>
                  <div className="text-xl font-semibold text-[hsl(var(--destructive))]">{comparison.counts.removed}</div>
                </div>
                <div className="border border-border rounded-md p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Modified</div>
                  <div className="text-xl font-semibold text-[hsl(var(--warning))]">{comparison.counts.modified}</div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={runImpact} disabled={busy === "impact"} className="border border-border bg-card px-3 h-9 rounded text-sm hover:bg-muted disabled:opacity-60 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> {busy === "impact" ? "Analyzing…" : "Run impact analysis"}
                </button>
                <button onClick={runMaps} disabled={busy === "maps"} className="bg-primary text-primary-foreground px-3 h-9 rounded text-sm hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> {busy === "maps" ? "Generating…" : "Generate MAPs"}
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3 pt-3">
                {[...added.map((c: any) => ({ ...c, type: "added" })),
                  ...modified.map((c: any) => ({ id: c.id, text: c.newText, category: c.category, severity: c.severity, type: "modified" })),
                  ...removed.map((c: any) => ({ ...c, type: "removed" })),
                ].slice(0, 10).map((c: any, i: number) => (
                  <div key={i} className={`section-container p-3 border-l-4 ${typeColor(c.type)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold">{c.id}</span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.type}</span>
                    </div>
                    <div className="text-sm line-clamp-3">{c.text}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {false && (
        <div className="space-y-3">
        </div>
      )}

      <div className="section-container">
        <div className="px-4 py-3 border-b text-sm font-semibold">Upload history</div>
        {history.length === 0 ? (
          <EmptyState title="No uploads yet" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Source</th>
                <th>Pages</th>
                <th>Uploaded</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((f) => (
                <tr key={f.id}>
                  <td className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> {f.title}</td>
                  <td className="text-muted-foreground">{f.source ?? "—"}</td>
                  <td className="text-muted-foreground">{f.pages ?? "—"}</td>
                  <td className="text-muted-foreground">{new Date(f.created_at).toLocaleString()}</td>
                  <td>
                    <span className={`text-xs font-medium ${f.status === "analyzed" ? "text-[hsl(var(--success))]" : f.status === "extracted" ? "text-[hsl(var(--info))]" : "text-muted-foreground"}`}>{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}