import { AnyObject } from "@/types";
import { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { RiskBadge } from "@/components/shared/Badges";
import { EmptyState, SkeletonPage } from "@/components/shared/States";
import type { Risk } from "@/lib/types";
import { Bell, CheckCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const borderLeft = (r: string) =>
  r === "High" ? "hsl(var(--risk-high))" : r === "Medium" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";

interface DisplayAlert {
  id: string;
  message: string;
  time: string;
  risk: Risk | string;
  regulationId?: string;
  isRead: boolean;
}

export default function Alerts() {
  const [selectedRisk, setSelectedRisk] = useState<Risk | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Unread" | "Read">("All");
  const [loading, setLoading] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<DisplayAlert[]>([]);

  const loadAlerts = () => {
    api.listAlerts()
      .then((res) => {
        const mapped = (res || []).map((n: AnyObject) => ({
          id: n.id,
          message: n.title + " — " + n.message,
          time: new Date(n.created_at).toLocaleTimeString() + " today",
          risk: n.severity as Risk,
          regulationId: "Circular",
          isRead: n.is_read
        }));
        setLiveAlerts(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load alerts", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const displayAlerts = useMemo(() => liveAlerts, [liveAlerts]);

  const toggleRead = async (id: string, currentlyRead: boolean) => {
    try {
      if (!currentlyRead) {
        await api.markAlertRead(id);
        setLiveAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
        toast({ title: "Alert read", description: "Marked alert as read." });
      } else {
        // Toggle back to unread locally or ignore
        setLiveAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: false } : a));
      }
    } catch (err: AnyObject) {
      toast({ title: "Failed to update alert", description: err.message, variant: "destructive" });
    }
  };

  const markAllRead = async () => {
    const unreadAlerts = displayAlerts.filter(a => !a.isRead);
    if (unreadAlerts.length === 0) return;

    try {
      await Promise.all(unreadAlerts.map(a => api.markAlertRead(a.id).catch(() => {})));
      setLiveAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      toast({
        title: "Alerts Updated",
        description: "All alerts have been marked as read.",
      });
    } catch (err) {
      setLiveAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    }
  };

  const filteredAlerts = useMemo(() => {
    return displayAlerts.filter((a) => {
      const matchesRisk = selectedRisk === "All" || a.risk === selectedRisk;
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Read" && a.isRead) ||
        (statusFilter === "Unread" && !a.isRead);
      return matchesRisk && matchesStatus;
    });
  }, [displayAlerts, selectedRisk, statusFilter]);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      <PageHeader 
        title="Alerts Feed" 
        subtitle="Real-time compliance alerts and regulator notifications" 
        actions={
          displayAlerts.some(a => !a.isRead) ? (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-lg text-xs font-semibold transition-all h-fit shadow-sm"
            >
              <CheckCheck className="h-3.5 w-3.5 text-primary" />
              <span>Mark all read</span>
            </button>
          ) : undefined
        }
      />

      {/* Filters bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between border-b border-border pb-4">
        {/* Severity filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Severity:</span>
          <div className="flex border border-border rounded-lg p-0.5 bg-muted/30">
            {(["All", "High", "Medium", "Low"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRisk(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedRisk === r
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status:</span>
          <div className="flex border border-border rounded-lg p-0.5 bg-muted/30">
            {(["All", "Unread", "Read"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === s
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <EmptyState
          title="No alerts found"
          description="No notifications match the selected severity and status filters."
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((a) => {
            const isRead = a.isRead;
            return (
              <div
                key={a.id}
                onClick={() => toggleRead(a.id, isRead)}
                className={`glass-card flex items-start justify-between p-4 border-l-4 cursor-pointer hover:-translate-y-0.5 ${
                  isRead ? "opacity-60 bg-muted/5 border-muted/50" : "bg-card"
                }`}
                style={{ borderLeftColor: isRead ? undefined : borderLeft(a.risk) }}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isRead ? "bg-muted/10" : "bg-primary/5"}`}>
                    <Bell className={`h-4.5 w-4.5 ${isRead ? "text-muted-foreground/60" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className={`text-sm leading-relaxed tracking-tight ${isRead ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
                      {a.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{a.time}</span>
                      {a.regulationId && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-mono bg-secondary px-2 py-0.5 rounded text-[10px] border border-border/50 text-secondary-foreground font-semibold">{a.regulationId}</span>
                        </>
                      )}
                      <span className="text-muted-foreground/40">·</span>
                      <span className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
                        {isRead ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" /> Mark as unread
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" /> Mark as read
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 self-center pl-4">
                  <RiskBadge risk={a.risk} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
