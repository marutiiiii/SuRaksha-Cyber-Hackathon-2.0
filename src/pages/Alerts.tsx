import PageHeader from "@/components/shared/PageHeader";
import { RiskBadge } from "@/components/shared/Badges";
import { EmptyState } from "@/components/shared/States";
import { alerts } from "@/mocks";
import { Bell } from "lucide-react";

const borderLeft = (r: string) =>
  r === "High" ? "hsl(var(--destructive))" : r === "Medium" ? "hsl(var(--warning))" : "hsl(var(--success))";

export default function Alerts() {
  return (
    <div className="space-y-6">
      <PageHeader title="Alerts" subtitle={`${alerts.length} regulatory alerts requiring attention`} />

      {alerts.length === 0 ? (
        <EmptyState title="No alerts" description="You're all caught up." />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="section-container flex items-start justify-between p-4 border-l-4 hover:bg-muted/30 cursor-pointer transition-colors"
              style={{ borderLeftColor: borderLeft(a.risk) }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Bell className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-relaxed">{a.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {a.time}{a.regulationId && <> · <span className="font-mono">{a.regulationId}</span></>}
                  </div>
                </div>
              </div>
              <RiskBadge risk={a.risk} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
