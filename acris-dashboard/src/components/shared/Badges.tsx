import type { Risk, Severity } from "@/lib/types";

const riskColor = (r: string) =>
  r === "Critical"
    ? "bg-[hsl(var(--risk-critical)/0.12)] text-[hsl(var(--risk-critical))] border-[hsl(var(--risk-critical)/0.4)]"
  : r === "High"
    ? "bg-[hsl(var(--risk-high)/0.12)] text-[hsl(var(--risk-high))] border-[hsl(var(--risk-high)/0.4)]"
    : r === "Medium"
    ? "bg-[hsl(var(--risk-medium)/0.12)] text-[hsl(var(--risk-medium))] border-[hsl(var(--risk-medium)/0.4)]"
    : "bg-[hsl(var(--risk-low)/0.12)] text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low)/0.4)]";

export function RiskBadge({ risk }: { risk: Risk | Severity | string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${riskColor(risk)}`}>
      {risk}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s.includes("complete") || s === "active" || s === "healthy"
      ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.4)]"
      : s.includes("pending") || s.includes("attention") || s.includes("review")
      ? "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.4)]"
      : s.includes("progress") || s.includes("assigned")
      ? "bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.4)]"
      : s.includes("critical") || s.includes("overdue")
      ? "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.4)]"
      : "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${cls}`}>{status}</span>;
}