import { useState } from "react";
import { Download, Printer, Share2, FileText, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/Badges";
import { api } from "@/lib/api";

const REPORT_TYPES = [
  { id: "executive", title: "Executive Report", desc: "Board-ready summary of compliance posture and risk exposure." },
  { id: "compliance", title: "Compliance Report", desc: "Regulation-by-regulation status with evidence references." },
  { id: "risk", title: "Risk Report", desc: "Risk heat-map across departments, top open items." },
  { id: "department", title: "Department Report", desc: "Per-department obligations and MAP progress." },
  { id: "audit", title: "Audit Report", desc: "Audit-ready package with findings, evidence, and closures." },
];

export default function Reports() {
  const [active, setActive] = useState("executive");
  const [shareOpen, setShareOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { signed_url } = await api.generateReport(active);
      toast({ title: "Report generated", description: "Opening PDF…" });
      if (signed_url) window.open(signed_url, "_blank");
    } catch (e: any) {
      toast({ title: "Report failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Generation Center"
        subtitle="Generate, preview, and export compliance reports for stakeholders"
        actions={
          <>
            <button
              onClick={exportPdf}
              disabled={exporting}
              className="border border-border bg-card px-3 h-9 text-sm font-medium rounded hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
            </button>
            <button
              onClick={() => window.print()}
              className="border border-border bg-card px-3 h-9 text-sm font-medium rounded hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="bg-primary text-primary-foreground px-3 h-9 text-sm font-medium rounded hover:opacity-90 flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </>
        }
      />

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <div className="space-y-2">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              className={`w-full text-left section-container p-3 transition-colors ${active === r.id ? "border-primary bg-accent" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{r.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </button>
          ))}
        </div>

        <div className="section-container p-8 max-w-3xl">
          <ReportPreview type={active} />
        </div>
      </div>

      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="bg-card rounded-md border border-border shadow-md w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Share report</div>
              <button onClick={() => setShareOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Recipients</label>
            <input className="border border-border rounded-md w-full px-3 py-2 text-sm mt-1 mb-3" placeholder="name@bank.com, ..." />
            <label className="text-xs font-semibold text-muted-foreground uppercase">Note</label>
            <textarea className="border border-border rounded-md w-full px-3 py-2 text-sm mt-1 mb-4" rows={3} placeholder="Optional message" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShareOpen(false)} className="px-3 h-9 text-sm border border-border rounded hover:bg-muted">Cancel</button>
              <button
                onClick={() => {
                  setShareOpen(false);
                  toast({ title: "Report shared", description: "Recipients will receive an email shortly." });
                }}
                className="px-3 h-9 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportPreview({ type }: { type: string }) {
  const title = REPORT_TYPES.find((r) => r.id === type)?.title || "Report";
  return (
    <div className="space-y-5">
      <div className="border-b pb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">ReguFlow AI · Q2 2026</div>
        <div className="text-2xl font-semibold mt-1">{title}</div>
        <div className="text-sm text-muted-foreground">Prepared 2026-05-22 · Confidential</div>
      </div>
      <Section label="Summary">
        <p>
          This report covers the regulatory changes detected in Q1 2026 affecting banking and financial services.
          23 high-risk changes identified across RBI, SEBI, and MCA circulars. 47 action items generated with an
          average implementation deadline of 45 days.
        </p>
      </Section>
      <Section label="Impact">
        <p>
          Compliance, Operations, and Risk Management departments are most affected. Estimated cost of implementation:
          ₹12.5L across technology upgrades and process re-engineering. 3 existing SOPs require revision.
        </p>
      </Section>
      <Section label="Actions Required">
        <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
          <li>Update KYC periodic review schedule for high-risk customers</li>
          <li>Implement V-CIP as preferred verification method</li>
          <li>Set up quarterly KYC compliance reporting to RBI</li>
          <li>Revise customer risk categorization framework</li>
        </ul>
      </Section>
      <Section label="Deadlines">
        <table className="data-table border border-border rounded-md overflow-hidden">
          <thead>
            <tr>
              <th>Action</th>
              <th>Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { action: "KYC schedule update", deadline: "2026-05-15", status: "Pending" },
              { action: "V-CIP implementation", deadline: "2026-06-30", status: "In Progress" },
              { action: "Quarterly reporting setup", deadline: "2026-07-01", status: "Not Started" },
            ].map((row, i) => (
              <tr key={i}>
                <td className="font-medium">{row.action}</td>
                <td className="text-muted-foreground">{row.deadline}</td>
                <td><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <div className="border-t pt-3 text-xs text-muted-foreground">Signed: Compliance Office · ReguFlow AI</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
