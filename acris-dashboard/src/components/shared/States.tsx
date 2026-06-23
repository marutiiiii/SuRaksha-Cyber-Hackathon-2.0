import { ReactNode } from "react";
import { Inbox, Loader2, AlertCircle } from "lucide-react";
import { useIsBeginner } from "@/state/CopilotContext";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ title = "No data", description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground/60" />
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground max-w-sm">{description}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-12 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" /> {message}
    </div>
  );
}

export function BeginnerHint({ children }: { children: ReactNode }) {
  const isBeginner = useIsBeginner();
  if (!isBeginner) return null;

  return (
    <div className="border border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.08)] text-sm rounded-md px-3 py-2">
      <span className="font-semibold text-[hsl(var(--info))] mr-2">Tip</span>
      <span className="text-foreground/80">{children}</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="section-container p-5 space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        <div className="h-5 w-12 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-3 w-full bg-muted rounded animate-pulse" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-3.5 w-10 bg-muted rounded animate-pulse" />
        <div className="h-3.5 w-16 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="section-container p-4 animate-pulse space-y-4">
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1" style={{ width: i === 0 ? "20%" : i === 2 ? "40%" : "15%" }} />
        ))}
      </div>
      <div className="space-y-3.5">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-3.5 bg-muted rounded flex-1"
                style={{
                  opacity: 1 - rowIndex * 0.1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 animate-pulse">
        <div className="h-7 w-48 bg-muted rounded" />
        <div className="h-4 w-96 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="section-container p-4 animate-pulse space-y-2">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-7 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
      <SkeletonTable rows={4} cols={4} />
    </div>
  );
}