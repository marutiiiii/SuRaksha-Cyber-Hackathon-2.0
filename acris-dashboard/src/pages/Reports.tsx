import { useState, useEffect } from "react";
import { Download, Printer, Share2, FileText, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import ViewOnlyBanner from "@/components/shared/ViewOnlyBanner";
import { useAuth } from "@/state/AuthContext";

const REPORT_TYPES = [
  { id: "executive", title: "Executive Report", desc: "Board-ready summary of compliance posture and risk exposure." },
  { id: "compliance", title: "Compliance Report", desc: "Regulation-by-regulation status with evidence references." },
  { id: "snapshot", title: "Compliance Snapshot", desc: "Quick dashboard view of scores, regulatory overview, and MAP status." },
  { id: "risk", title: "Risk Report", desc: "Risk heat-map across departments, top open items." },
  { id: "department", title: "Department Report", desc: "Per-department obligations and MAP progress." },
  { id: "audit", title: "Audit Report", desc: "Audit-ready package with findings, evidence, and closures." },
];

export default function Reports() {
  const { user } = useAuth();
  const userType = user?.user_type || user?.user_metadata?.user_type || "admin";
  const isDeptOfficer = userType === "department_officer";

  const [active, setActive] = useState("executive");
  const [shareOpen, setShareOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { signed_url } = await api.generateReport(active);
      if (signed_url) {
        const filename = signed_url.split("/").pop();
        const token = localStorage.getItem("mock_user_session")
          ? JSON.parse(localStorage.getItem("mock_user_session")!).access_token
          : "";
          
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const downloadUrl = `${backendUrl}/api/v1/reports/download/${filename}`;
        
        toast({ title: "Downloading Report", description: "Fetching PDF content..." });
        
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const mode = localStorage.getItem("reguflow.copilot.mode") || "beginner";
        headers["X-Copilot-Mode"] = mode;
        
        const res = await fetch(downloadUrl, { headers });
        if (!res.ok) throw new Error("Failed to download PDF file.");
        const blob = await res.blob();
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${active}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        toast({ title: "Report downloaded", description: "PDF saved successfully." });
      }
    } catch (e: any) {
      toast({ title: "Report failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const printReport = () => {
    const printContent = document.getElementById("printable-report-area")?.innerHTML;
    if (!printContent) {
      toast({ title: "Print error", description: "No report content found to print.", variant: "destructive" });
      return;
    }
    
    toast({ title: "Preparing print", description: "Generating print document..." });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;
    
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Print Compliance Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            body {
              background-color: white !important;
              color: #0f172a !important;
              padding: 40px;
              font-family: 'Inter', -apple-system, sans-serif;
              font-size: 11px;
              line-height: 1.5;
            }
            h1 {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a !important;
              border-bottom: none;
              padding-bottom: 4px;
              margin-top: 12px;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            h2 {
              font-size: 13px;
              font-weight: 700;
              color: #1e293b !important;
              border-bottom: none;
              padding-bottom: 3px;
              margin-top: 10px;
              margin-bottom: 6px;
            }
            h3 {
              font-size: 11px;
              font-weight: 600;
              color: #475569 !important;
              margin-top: 8px;
              margin-bottom: 4px;
            }
            p {
              margin: 4px 0;
              color: #334155;
            }
            hr {
              display: none;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 8px 0;
            }
            th, td {
              border: 1px solid #e2e8f0 !important;
              padding: 6px 8px !important;
              text-align: left;
            }
            th {
              background-color: #0f172a !important;
              color: white !important;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
            }
            td {
              color: #334155;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            ul, ol {
              padding-left: 20px;
              margin: 4px 0;
            }
            li {
              margin-bottom: 2px;
              color: #334155;
            }
            .flex {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            input[type="checkbox"] {
              margin: 0;
              accent-color: #0f172a;
            }
            @media print {
              body {
                padding: 0;
              }
              tr {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div>
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() {
                window.parent.document.body.removeChild(window.frameElement);
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const handleShareClick = async () => {
    setShareOpen(true);
    setSharing(true);
    try {
      const { signed_url } = await api.generateReport(active);
      if (signed_url) {
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const fullUrl = signed_url.startsWith("http") ? signed_url : `${backendUrl}${signed_url}`;
        setShareLink(fullUrl);
      }
    } catch (e: any) {
      toast({ title: "Failed to generate share link", description: e.message, variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Report Console</h1>
          <p className="text-xs text-muted-foreground mt-1">Compile, preview, and share audit-ready compliance packages</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPdf}
            disabled={exporting || isDeptOfficer}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors disabled:opacity-50 uppercase tracking-wider"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} 
            <span>Export PDF</span>
          </button>
          {!isDeptOfficer && (
            <button
              onClick={printReport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors uppercase tracking-wider"
            >
              <Printer className="h-3.5 w-3.5" /> <span>Print</span>
            </button>
          )}
          {!isDeptOfficer && (
            <button
              onClick={handleShareClick}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity uppercase tracking-wider"
            >
              <Share2 className="h-3.5 w-3.5" /> <span>Share</span>
            </button>
          )}
        </div>
      </div>

      <ViewOnlyBanner />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Selector side columns */}
        <div className="space-y-3">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              className={`w-full text-left glass-card p-4 transition-all duration-200 border hover:border-primary/40 ${
                active === r.id 
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/5 font-bold" 
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs font-extrabold text-foreground uppercase tracking-wide">{r.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal font-semibold">{r.desc}</p>
            </button>
          ))}
        </div>

        {/* Paper sheet preview */}
        <div className="max-w-4xl w-full">
          <ReportPreview type={active} />
        </div>
      </div>

      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border shadow-xl w-full max-w-md p-6 rounded-xl text-foreground relative text-left">
            <button 
              onClick={() => setShareOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Share2 className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Share Compliance Report</h3>
            </div>

            {sharing ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-semibold">Generating secure sharing link...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                  Select a secure platform to distribute the live generated PDF report link.
                </p>

                {/* Share platforms row */}
                <div className="grid grid-cols-3 gap-3">
                  {/* WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this ${active.toUpperCase()} compliance report generated by ReguFlow AI: ${shareLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span className="text-[10px] font-bold">WhatsApp</span>
                  </a>

                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(`Check out this ${active.toUpperCase()} compliance report generated by ReguFlow AI`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-lg border border-sky-500/20 bg-sky-500/5 text-sky-600 hover:bg-sky-500/10 hover:text-sky-500 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0C5.344 0 0 5.344 0 11.944c0 6.6 5.344 11.944 11.944 11.944 6.6 0 11.944-5.344 11.944-11.944C23.888 5.344 18.544 0 11.944 0zm5.541 8.528l-1.921 9.06c-.14.636-.517.794-1.053.493l-2.929-2.16-1.412 1.36c-.156.156-.287.287-.588.287l.21-2.98 5.421-4.897c.235-.21-.052-.326-.366-.117L7.669 13.06l-2.89-.904c-.628-.196-.64-.628.131-.929l11.29-4.352c.523-.19.98.12.825.937z" />
                    </svg>
                    <span className="text-[10px] font-bold">Telegram</span>
                  </a>

                  {/* Discord */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Check out this ${active.toUpperCase()} compliance report generated by ReguFlow AI: ${shareLink}`);
                      toast({ title: "Copied!", description: "Share message copied to clipboard. Redirecting to Discord..." });
                      window.open("https://discord.com/channels/@me", "_blank");
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 01.078.009c.12.099.246.195.373.289a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                    </svg>
                    <span className="text-[10px] font-bold">Discord</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Secure URL</label>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={shareLink} 
                      className="premium-input text-xs h-9 bg-background focus:outline-none select-all" 
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        toast({ title: "Copied!", description: "Link copied to clipboard." });
                      }}
                      className="bg-primary hover:opacity-90 text-primary-foreground px-3.5 text-xs font-bold rounded-lg transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border mt-4">
                  <button 
                    onClick={() => setShareOpen(false)}
                    className="px-4 py-2 text-xs border border-border bg-card rounded-lg hover:bg-muted font-bold transition-colors uppercase tracking-wider text-foreground"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function renderMarkdownToReact(markdown: string) {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentTableHeaders: string[] = [];
  let currentTableRows: string[][] = [];
  let inTable = false;
  
  let currentListItems: { type: 'bullet' | 'number'; text: string; num?: string }[] = [];
  let inList = false;
  
  const renderText = (txt: string) => {
    let html = txt
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const flushTable = (key: number) => {
    if (currentTableHeaders.length > 0) {
      elements.push(
        <div key={`table-${key}`} className="overflow-x-auto my-2 border border-slate-200 rounded-lg bg-white shadow-sm">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold border-b border-slate-300">
                {currentTableHeaders.map((h, idx) => (
                  <th key={idx} className="p-2 border-r border-slate-800 last:border-r-0 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTableRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="odd:bg-slate-50 even:bg-white border-b border-slate-100 last:border-b-0">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="p-2 border-r border-slate-200 last:border-r-0 text-slate-700 font-medium">{renderText(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTableHeaders = [];
      currentTableRows = [];
    }
    inTable = false;
  };
  
  const flushList = (key: number) => {
    if (currentListItems.length > 0) {
      const ListTag = currentListItems[0].type === 'number' ? 'ol' : 'ul';
      elements.push(
        <ListTag key={`list-${key}`} className={`${ListTag === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-0.5 my-1 text-xs leading-relaxed text-slate-700`}>
          {currentListItems.map((item, idx) => {
            const hasCheck = item.text.trim().startsWith("☐") || item.text.trim().startsWith("[ ]");
            const hasChecked = item.text.trim().startsWith("☒") || item.text.trim().startsWith("[X]") || item.text.trim().startsWith("[x]");
            
            if (hasCheck || hasChecked) {
              const remText = item.text.trim().startsWith("[") ? item.text.trim().substring(3) : item.text.trim().substring(1);
              return (
                <li key={idx} className="list-none flex items-start gap-2 py-0.5 text-slate-700">
                  <input type="checkbox" disabled checked={hasChecked} className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5 mt-0.5 pointer-events-none" />
                  <span>{renderText(remText)}</span>
                </li>
              );
            }
            return (
              <li key={idx} className="text-slate-700">
                {renderText(item.text)}
              </li>
            );
          })}
        </ListTag>
      );
      currentListItems = [];
    }
    inList = false;
  };
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const stripped = line.trim();
    
    if (line.startsWith("|")) {
      if (inList) flushList(idx);
      inTable = true;
      const parts = line.split("|").map(p => p.trim()).slice(1, -1);
      const isSeparator = parts.every(p => /^[-:\s]+$/.test(p));
      if (isSeparator) {
        continue;
      }
      if (currentTableHeaders.length === 0) {
        currentTableHeaders = parts;
      } else {
        currentTableRows.push(parts);
      }
      continue;
    } else {
      if (inTable) flushTable(idx);
    }
    
    const isBullet = stripped.startsWith("* ") || stripped.startsWith("- ");
    const isNum = /^\d+\.\s+/.exec(stripped);
    
    if (isBullet || isNum) {
      inList = true;
      const type = isNum ? 'number' : 'bullet';
      const text = isNum ? stripped.substring(isNum[0].length) : stripped.substring(2);
      currentListItems.push({ type, text });
      continue;
    } else {
      if (inList) flushList(idx);
    }
    
    if (!stripped) {
      continue;
    }
    
    if (stripped.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${idx}`} className="text-xl font-extrabold text-slate-900 pb-1 mb-2 mt-3 uppercase tracking-tight text-center">
          {renderText(stripped.substring(2))}
        </h1>
      );
    } else if (stripped.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${idx}`} className="text-sm font-bold text-slate-900 pb-1 mb-1 mt-3 uppercase tracking-wide">
          {renderText(stripped.substring(3))}
        </h2>
      );
    } else if (stripped.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${idx}`} className="text-xs font-semibold text-slate-700 mb-1 mt-2">
          {renderText(stripped.substring(4))}
        </h3>
      );
    }
    else if (stripped === "---") {
      elements.push(<div key={`hr-${idx}`} className="h-1"></div>);
    }
    else if (stripped.startsWith("☐") || stripped.startsWith("[ ]") || stripped.startsWith("☒") || stripped.startsWith("[X]") || stripped.startsWith("[x]")) {
      const isChecked = stripped.startsWith("☒") || stripped.startsWith("[X]") || stripped.startsWith("[x]");
      const remText = stripped.startsWith("[") ? stripped.substring(3) : stripped.substring(1);
      elements.push(
        <div key={`chk-${idx}`} className="flex items-start gap-2.5 py-0.5 text-xs text-slate-700 font-medium">
          <input type="checkbox" disabled checked={isChecked} className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5 mt-0.5 pointer-events-none" />
          <span>{renderText(remText)}</span>
        </div>
      );
    }
    else {
      elements.push(
        <p key={`p-${idx}`} className="text-xs text-slate-700 leading-relaxed my-0.5 font-normal">
          {renderText(stripped)}
        </p>
      );
    }
  }
  
  if (inTable) flushTable(lines.length);
  if (inList) flushList(lines.length);
  
  return elements;
}

function ReportPreview({ type }: { type: string }) {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.previewReport(type)
      .then((res) => {
        setMarkdown(res.markdown || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load report preview", err);
        setMarkdown("Failed to load report preview.");
        setLoading(false);
      });
  }, [type]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-semibold">Assembling audit report preview...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center bg-muted/10 p-4 border border-border rounded-lg max-h-[75vh] overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        #printable-report-area {
          background-color: white !important;
          color: #0f172a !important;
        }
        #printable-report-area h1 {
          color: #0f172a !important;
          border: none !important;
          border-bottom: none !important;
        }
        #printable-report-area h2 {
          color: #0f172a !important;
          border: none !important;
          border-bottom: none !important;
        }
        #printable-report-area hr {
          display: none !important;
        }
        #printable-report-area h3 {
          color: #334155 !important;
        }
        #printable-report-area p, 
        #printable-report-area span, 
        #printable-report-area li, 
        #printable-report-area td {
          color: #334155 !important;
        }
        #printable-report-area table {
          border-color: #e2e8f0 !important;
        }
        #printable-report-area th {
          background-color: #0f172a !important;
          color: white !important;
        }
        #printable-report-area td {
          border-color: #e2e8f0 !important;
        }
        #printable-report-area input[type="checkbox"] {
          accent-color: #0f172a !important;
          border-color: #cbd5e1 !important;
          background-color: white !important;
          color: #0f172a !important;
          filter: invert(0) !important;
          opacity: 1 !important;
          pointer-events: none !important;
        }
      `}} />
      <div 
        id="printable-report-area"
        className="w-full max-w-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 rounded-sm p-12 min-h-[842px] font-sans relative select-text text-left shrink-0"
      >
        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-6 pb-2 border-b border-slate-200 select-none">
          <span>ReguFlow AI Compliance Engine</span>
          <span className="text-red-600 font-extrabold">Confidential Report</span>
        </div>
        
        <div className="space-y-4">
          {renderMarkdownToReact(markdown)}
        </div>
      </div>
    </div>
  );
}
