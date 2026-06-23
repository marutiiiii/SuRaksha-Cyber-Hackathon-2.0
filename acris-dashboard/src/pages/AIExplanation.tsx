import { useRef, useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { BeginnerHint } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import type { ChatMessage } from "@/lib/types";
import { Send, Sparkles, BookOpenCheck, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const QUICK = [
  { label: "Summarize the latest circular" },
  { label: "What changed between my latest documents?" },
  { label: "Which departments are most impacted?" },
  { label: "List open MAPs by severity" },
  { label: "Draft an executive briefing" },
];

const initial: ChatMessage[] = [
  { role: "assistant", content: "Hi! I'm ReguFlow AI Copilot. Ask me about your uploaded regulations, comparison results, or open action points. I cite the exact clauses I refer to." },
];

export default function AIExplanation() {
  const isBeginner = useIsBeginner();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Document Drafting State
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [selectedComp, setSelectedComp] = useState("");
  const [docType, setDocType] = useState("sop");
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<string | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);

  const loadDraftHistory = () => {
    api.listDraftHistory()
      .then((res) => setSavedDrafts(res || []))
      .catch((err) => console.error("Failed to load drafts history", err));
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    api.listComparisons()
      .then((res) => {
        setComparisons(res || []);
        if (res && res.length > 0) {
          setSelectedComp(res[0].comparisonId);
        }
      })
      .catch((err) => console.error("Failed to load comparisons in copilot sidepanel", err));
    loadDraftHistory();
  }, []);

  const send = async (content: string) => {
    if (!content.trim() || thinking) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setThinking(true);
    try {
      const res = await api.copilot(content, sessionId);
      setSessionId(res.sessionId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          citations: (res.citations ?? []).map((c: any) => ({
            regulation: c.document,
            clause: c.clauseId,
            text: c.text,
            confidence: Math.round((c.similarity ?? 0) * 100),
          })),
        },
      ]);
    } catch (e: any) {
      toast({ title: "Copilot error", description: e.message, variant: "destructive" });
    } finally {
      setThinking(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedComp) {
      toast({ title: "Drafting Error", description: "Select a circular comparison to compile drafts.", variant: "destructive" });
      return;
    }
    setDrafting(true);
    try {
      const res = await api.generateComplianceDocument(docType, selectedComp);
      setDraftResult(res.draft);
      toast({ title: "Document Draft Generated", description: `Compiled AI draft for a compliance ${docType.toUpperCase()}.` });
      loadDraftHistory();
    } catch (err: any) {
      toast({ title: "Drafting Failed", description: err.message, variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const lastWithCitations = useMemo(() => {
    return [...messages].reverse().find((m) => m.citations);
  }, [messages]);

  return (
    <div className="space-y-6 h-[calc(100vh-7.5rem)] flex flex-col">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">AI Compliance Copilot</h1>
          <p className="text-xs text-muted-foreground mt-1">Chat-driven regulatory guidance workspace with automated document generation</p>
        </div>
      </div>

      {isBeginner && (
        <BeginnerHint>
          Ask questions about your compliance posture, SOP obligations, or circulars. ACRIS Copilot references specific document nodes.
        </BeginnerHint>
      )}

      {/* Main split dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        {/* Chat pane */}
        <div className="glass-card flex flex-col min-h-0 bg-card overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                )}
                <div className={`max-w-[75%] text-xs leading-relaxed ${
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground font-bold rounded-xl px-4 py-2.5 shadow-sm" 
                    : "text-foreground font-semibold bg-muted/20 border border-border p-4 rounded-xl"
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
                  
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3.5 space-y-2">
                      <details className="text-[11px] border border-border rounded-lg bg-card overflow-hidden">
                        <summary className="cursor-pointer font-bold p-2.5 select-none hover:bg-muted text-muted-foreground flex items-center justify-between">
                          <span>Citations ({m.citations.length})</span>
                        </summary>
                        <div className="p-3 border-t border-border space-y-3 bg-muted/10">
                          {m.citations.map((c, j) => (
                            <div key={j} className="space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span className="font-mono text-primary text-[10px]">{c.regulation} · {c.clause}</span>
                                <span className="text-[9px] text-muted-foreground">{c.confidence}% match</span>
                              </div>
                              {c.text && (
                                <p className="text-muted-foreground italic pl-2 border-l-2 border-primary/30 py-0.5 leading-normal">
                                  "{c.text}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse flex-shrink-0">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div className="text-xs text-muted-foreground font-semibold italic flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Chat input controls */}
          <div className="border-t border-border p-4 space-y-3 bg-muted/10">
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q.label)}
                  className="text-[11px] font-bold border border-border rounded-lg px-3 py-1.5 hover:bg-muted bg-card transition-colors text-foreground"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask ReguFlow AI..."
                className="premium-input flex-1 h-10 text-xs focus:outline-none"
              />
              <button 
                type="submit" 
                className="bg-primary text-primary-foreground font-bold rounded-lg h-10 px-5 flex items-center gap-1.5 text-xs hover:opacity-90 uppercase tracking-wider transition-opacity"
              >
                <Send className="h-3.5 w-3.5" /> <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="glass-card p-4 flex flex-col gap-4 overflow-auto bg-card">
          {/* References Panel */}
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-foreground mb-3 pb-2 border-b border-border">
              <BookOpenCheck className="h-4 w-4 text-primary" /> 
              <span>Active References</span>
            </div>
            {lastWithCitations?.citations ? (
              <div className="space-y-2">
                {lastWithCitations.citations.map((c, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-muted/20 text-xs text-foreground space-y-1.5">
                    <div className="flex items-center justify-between font-mono font-bold text-[9px] text-muted-foreground">
                      <span>{c.regulation} · {c.clause}</span>
                      <span>{c.confidence}% Match</span>
                    </div>
                    {c.text && <p className="text-muted-foreground italic pl-1.5 border-l border-primary/30 py-0.5 leading-normal bg-muted/10 font-semibold">"{c.text}"</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic font-semibold text-center py-4 bg-muted/10 border border-dashed border-border rounded-lg">
                No active source citations
              </p>
            )}
          </div>

          {/* Compliance Document Drafter Panel */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> 
              <span>AI Document Drafting</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Compile policy circular draft templates using the outputs parsed from active comparisons.
            </p>
            
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">Target Comparison</label>
                <select
                  value={selectedComp}
                  onChange={(e) => setSelectedComp(e.target.value)}
                  className="premium-select text-xs h-8 py-1 focus:outline-none"
                >
                  <option value="">Select circular compare run…</option>
                  {comparisons.map((c) => (
                    <option key={c.comparisonId} value={c.comparisonId}>
                      {c.newDocumentTitle.substring(0, 16)}... vs {c.oldDocumentTitle.substring(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">Document Format</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="premium-select text-xs h-8 py-1 focus:outline-none"
                >
                  <option value="sop">SOP Amendment</option>
                  <option value="policy">Board Policy Draft</option>
                  <option value="circular">Internal Circular</option>
                  <option value="checklist">Audit Checklist</option>
                </select>
              </div>

              <button
                onClick={handleGenerateDraft}
                disabled={drafting || !selectedComp}
                className="w-full bg-primary text-primary-foreground h-9 font-bold rounded-lg text-xs hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-1.5 mt-2 uppercase tracking-wider"
              >
                {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>Generate Draft</span>
              </button>
            </div>
          </div>

          {/* Draft History Panel */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-foreground">
              <BookOpenCheck className="h-4 w-4 text-primary" /> 
              <span>Saved SOP Drafts</span>
            </div>
            {savedDrafts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic font-semibold text-center py-4 bg-muted/10 border border-dashed border-border rounded-lg">No drafts saved.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1 max-h-[220px]">
                {savedDrafts.map((d) => (
                  <div
                    key={d.id}
                    onClick={async () => {
                      setDocType(d.type);
                      try {
                        const res = await api.getDraft(d.id);
                        setDraftResult(res.content);
                      } catch (err: any) {
                        toast({ title: "Failed to open draft", description: err.message, variant: "destructive" });
                      }
                    }}
                    className="p-2.5 border border-border hover:bg-muted/40 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span className="truncate max-w-[150px]">{d.title}</span>
                      <span className="text-[9px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-primary uppercase font-extrabold">
                        v{d.version}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 truncate font-semibold">
                      {d.source}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1 flex justify-between font-bold">
                      <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      <span className="text-primary uppercase">{d.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generated Draft Output Modal */}
      {draftResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border text-foreground rounded-xl shadow-xl w-full max-w-2xl p-5 flex flex-col h-[75vh]">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <div className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" /> 
                <span>Compiled Compliance Draft ({docType.toUpperCase()})</span>
              </div>
              <button onClick={() => setDraftResult(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-muted/20 p-4 rounded-lg border border-border font-mono text-xs whitespace-pre-wrap leading-relaxed select-all">
              {draftResult}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
              <button 
                onClick={() => setDraftResult(null)} 
                className="px-4 h-9 text-xs border border-border bg-card rounded-lg hover:bg-muted font-bold text-foreground transition-colors uppercase tracking-wider"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([draftResult], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${docType.toUpperCase()}-Draft.txt`;
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
                  navigator.clipboard.writeText(draftResult);
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
