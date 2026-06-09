import { useRef, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { RiskBadge } from "@/components/shared/Badges";
import { BeginnerHint, EmptyState } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { clauseChanges } from "@/mocks";
import { Upload, FileText, CheckCircle2, Loader2, Circle, FileUp } from "lucide-react";

const STAGES = [
  "Uploading",
  "Extracting Clauses",
  "Comparing Versions",
  "Running Impact Analysis",
  "Generating MAPs",
  "Preparing Report",
];

interface UploadedFile {
  name: string;
  size: string;
  uploadedAt: string;
  status: "Processed" | "Processing";
}

const initialHistory: UploadedFile[] = [
  { name: "RBI_KYC_Master_Direction_v2026.pdf", size: "1.2 MB", uploadedAt: "2026-04-08 10:14", status: "Processed" },
  { name: "SEBI_LODR_Amendment_Apr2026.pdf", size: "842 KB", uploadedAt: "2026-04-04 09:22", status: "Processed" },
  { name: "CERT-In_Advisory_2026-09.pdf", size: "320 KB", uploadedAt: "2026-05-20 08:02", status: "Processed" },
];

export default function DocumentAnalysis() {
  const isBeginner = useIsBeginner();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState(-1);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [showResults, setShowResults] = useState(false);

  const simulate = (filename: string) => {
    setShowResults(false);
    setStage(0);
    setHistory((h) => [
      { name: filename, size: "967 KB", uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "), status: "Processing" },
      ...h,
    ]);
    let i = 0;
    const tick = () => {
      i++;
      if (i < STAGES.length) {
        setStage(i);
        setTimeout(tick, 700);
      } else {
        setStage(STAGES.length);
        setShowResults(true);
        setHistory((h) => h.map((f, idx) => (idx === 0 ? { ...f, status: "Processed" } : f)));
      }
    };
    setTimeout(tick, 700);
  };

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    simulate(files[0].name);
  };

  const typeColor = (t: string) =>
    t === "added"
      ? "border-l-[hsl(var(--success))]"
      : t === "removed"
      ? "border-l-[hsl(var(--destructive))]"
      : "border-l-[hsl(var(--warning))]";

  const added = clauseChanges.filter((c) => c.type === "added").length;
  const removed = clauseChanges.filter((c) => c.type === "removed").length;
  const modified = clauseChanges.filter((c) => c.type === "modified").length;
  const depts = Array.from(new Set(clauseChanges.map((c) => c.department)));
  const risk = clauseChanges.some((c) => c.severity === "Critical") ? "Critical" : clauseChanges.some((c) => c.severity === "High") ? "High" : "Medium";

  return (
    <div className="space-y-6">
      <PageHeader title="Document Analysis Workspace" subtitle="Upload regulatory documents and run an automated diff + impact pipeline" />

      {isBeginner && (
        <BeginnerHint>
          Drag a PDF or DOCX into the zone below. ReguFlow AI will simulate extracting clauses, comparing
          versions, and producing a list of action points.
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
        <div className="text-xs text-muted-foreground mb-4">Accepted: PDF, DOCX · Max 25 MB · Frontend-only simulation</div>
        <button
          onClick={() => inputRef.current?.click()}
          className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium rounded hover:opacity-90 transition-opacity"
        >
          Choose file
        </button>
        <input ref={inputRef} type="file" hidden accept=".pdf,.docx" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {stage >= 0 && (
        <div className="section-container p-5">
          <div className="text-sm font-semibold mb-4">Processing pipeline</div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
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

      {showResults && (
        <div className="space-y-3">
          <div className="section-container p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Added</div>
              <div className="text-xl font-semibold text-[hsl(var(--success))]">{added}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Removed</div>
              <div className="text-xl font-semibold text-[hsl(var(--destructive))]">{removed}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Modified</div>
              <div className="text-xl font-semibold text-[hsl(var(--warning))]">{modified}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Affected Departments</div>
              <div className="text-xl font-semibold">{depts.length}</div>
              <div className="text-[10px] text-muted-foreground truncate">{depts.join(", ")}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Overall Risk</div>
              <div className="text-xl font-semibold text-[hsl(var(--destructive))]">{risk}</div>
            </div>
          </div>
          <div className="text-sm font-semibold">Detected clause changes ({clauseChanges.length})</div>
          <div className="grid md:grid-cols-2 gap-3">
            {clauseChanges.map((c) => (
              <div key={c.id} className={`section-container p-4 border-l-4 ${typeColor(c.type)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{c.id}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.type}</span>
                  </div>
                  <RiskBadge risk={c.severity} />
                </div>
                <div className="text-sm mb-2">{c.summary}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Dept: <span className="font-medium text-foreground">{c.department}</span></span>
                  <span>Confidence: <span className="font-medium text-foreground">{c.confidence}%</span></span>
                </div>
              </div>
            ))}
          </div>
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
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((f, i) => (
                <tr key={i}>
                  <td className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> {f.name}</td>
                  <td className="text-muted-foreground">{f.size}</td>
                  <td className="text-muted-foreground">{f.uploadedAt}</td>
                  <td>
                    <span className={`text-xs font-medium ${f.status === "Processed" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--info))]"}`}>{f.status}</span>
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