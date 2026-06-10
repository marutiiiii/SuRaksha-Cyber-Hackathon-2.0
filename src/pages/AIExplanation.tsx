import { useRef, useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { BeginnerHint } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import { ChatMessage } from "@/mocks";
import { Send, Sparkles, BookOpenCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const QUICK = [
  { label: "Summarize my latest regulation in plain English" },
  { label: "What changed between my two latest documents?" },
  { label: "Which departments are most impacted right now?" },
  { label: "List my open MAPs sorted by severity" },
  { label: "Draft a 5-bullet executive briefing" },
];

const initial: ChatMessage[] = [
  { role: "assistant", content: "Hi. I'm ReguFlow AI Copilot. Ask me about your uploaded regulations, detected changes, or open action points. I cite the clauses I use." },
];

export default function AIExplanation() {
  const isBeginner = useIsBeginner();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

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

  const lastWithCitations = [...messages].reverse().find((m) => m.citations);

  return (
    <div className="space-y-6 h-[calc(100vh-7rem)] flex flex-col">
      <PageHeader title="AI Compliance Copilot" subtitle="Ask questions about any regulation; generate MAPs, reports, and explanations" />

      {isBeginner && (
        <BeginnerHint>
          Type a question or click a suggested action below. The copilot will reply with a citation-backed
          summary you can hand to your team.
        </BeginnerHint>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        <div className="section-container flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
                <div className={`max-w-[80%] text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-md px-3 py-2" : "text-foreground"}`}>
                  <p className="whitespace-pre-line">{m.content}</p>
                  {m.citations && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.citations.map((c, j) => (
                        <span key={j} className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 text-muted-foreground bg-card">
                          {c.regulation} · {c.clause} · {c.confidence}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-sm text-muted-foreground italic">Thinking...</div>
              </div>
            )}
          </div>

          <div className="border-t p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q.label)}
                  className="text-xs border border-border rounded px-2 py-1 hover:bg-muted transition-colors"
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
                placeholder="Ask the copilot..."
                className="flex-1 border border-border rounded-md px-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-card"
              />
              <button type="submit" className="bg-primary text-primary-foreground rounded-md h-9 px-3 flex items-center gap-1.5 text-sm hover:opacity-90">
                <Send className="h-4 w-4" /> Send
              </button>
            </form>
          </div>
        </div>

        <div className="section-container p-4 flex flex-col">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <BookOpenCheck className="h-4 w-4 text-primary" /> Source references
          </div>
          {lastWithCitations?.citations ? (
            <div className="space-y-3">
              {lastWithCitations.citations.map((c, i) => (
                <div key={i} className="border border-border rounded-md p-3">
                  <div className="font-mono text-xs font-semibold mb-1">{c.regulation}</div>
                  <div className="text-sm">{c.clause}</div>
                  <div className="text-xs text-muted-foreground mt-1">Confidence {c.confidence}%</div>
                  <div className="h-1 bg-muted rounded mt-1">
                    <div className="h-full bg-primary rounded" style={{ width: `${c.confidence}%` }} />
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground border-t pt-3">
                Traceability: replies are grounded in indexed regulatory text and internal policies.
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No citations yet. Try a suggested action.</div>
          )}
        </div>
      </div>
    </div>
  );
}
