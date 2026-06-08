import PageHeader from "@/components/shared/PageHeader";
import KpiCard from "@/components/shared/KpiCard";
import { RiskBadge } from "@/components/shared/Badges";
import { audits } from "@/mocks";
import { ShieldCheck, ShieldAlert, ShieldX, FileWarning } from "lucide-react";

const HEALTH = Math.round(audits.reduce((a, d) => a + d.readinessScore, 0) / audits.length);

const totals = audits.reduce(
  (a, d) => ({
    open: a.open + d.openFindings,
    critical: a.critical + d.criticalFindings,
    closed: a.closed + d.closedFindings,
    missing: a.missing + d.missingEvidence,
  }),
  { open: 0, critical: 0, closed: 0, missing: 0 }
);

const timeline = [
  { date: "2026-03-01", title: "Q1 internal audit kickoff", desc: "Scope locked across 6 departments." },
  { date: "2026-03-22", title: "Cybersecurity gap identified", desc: "3 critical findings logged from CERT-In advisory." },
  { date: "2026-04-08", title: "RBI KYC amendment ingested", desc: "9 MAPs auto-generated." },
  { date: "2026-04-30", title: "Mid-cycle readiness review", desc: "Audit readiness lifted 78% → 83%." },
  { date: "2026-05-20", title: "External audit fieldwork", desc: "Evidence collection in progress." },
];

function CircleScore({ score }: { score: number }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const tone = score >= 85 ? "hsl(var(--success))" : score >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r={r} stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
      <circle cx="80" cy="80" r={r} stroke={tone} strokeWidth="12" fill="none"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 80 80)" />
      <text x="80" y="84" textAnchor="middle" fontSize="32" fontWeight="700" fill="hsl(var(--foreground))">{score}%</text>
    </svg>
  );
}

export default function AuditReadiness() {
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Readiness Center" subtitle="Real-time audit health, findings, and evidence tracking" />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="section-container p-6 flex flex-col items-center justify-center text-center">
          <CircleScore score={HEALTH} />
          <div className="text-sm font-semibold mt-3">Overall audit readiness</div>
          <div className="text-xs text-muted-foreground">Aggregated across {audits.length} departments</div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <KpiCard label="Open Findings" value={totals.open} tone="warning" icon={<ShieldAlert className="h-4 w-4" />} />
          <KpiCard label="Critical Findings" value={totals.critical} tone="danger" icon={<ShieldX className="h-4 w-4" />} />
          <KpiCard label="Closed Findings" value={totals.closed} tone="success" icon={<ShieldCheck className="h-4 w-4" />} />
          <KpiCard label="Missing Evidence" value={totals.missing} tone="warning" icon={<FileWarning className="h-4 w-4" />} />
        </div>
      </div>

      <div className="section-container">
        <div className="px-4 py-3 border-b text-sm font-semibold">Department readiness</div>
        <div className="p-4 space-y-3">
          {audits.map((d) => (
            <div key={d.department}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{d.department}</span>
                <div className="flex items-center gap-2">
                  <RiskBadge risk={d.risk} />
                  <span className="text-muted-foreground tabular-nums w-10 text-right">{d.readinessScore}%</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${d.readinessScore}%`,
                    background: d.readinessScore >= 85 ? "hsl(var(--success))" : d.readinessScore >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="section-container">
          <div className="px-4 py-3 border-b text-sm font-semibold">Audit timeline</div>
          <div className="p-4">
            <div className="relative border-l-2 border-border ml-2 space-y-4 pl-4">
              {timeline.map((t, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[22px] top-1 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                  <div className="text-xs text-muted-foreground">{t.date}</div>
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="section-container p-5">
          <div className="text-sm font-semibold mb-3">Executive audit summary</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Audit posture is improving steadily, driven by faster MAP closure across Compliance and Legal.
            Cybersecurity remains the weakest link with 9 open findings, of which 3 are critical and tied to
            the CERT-In CVE-2026-3344 advisory. Recommended focus for next 30 days: accelerate patch deployment
            across remaining 12 nodes and close 5 missing evidence items in Operations.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border rounded-md p-3">
              <div className="text-2xl font-semibold">+6</div>
              <div className="text-xs text-muted-foreground">Score uplift (30d)</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-2xl font-semibold">22</div>
              <div className="text-xs text-muted-foreground">MAPs closed</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-2xl font-semibold">4.2d</div>
              <div className="text-xs text-muted-foreground">Avg. closure</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}