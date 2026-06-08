import { ReactNode } from "react";
import { Inbox, Loader2, AlertCircle } from "lucide-react";

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
  return (
    <div className="border border-[hsl(var(--info)/0.4)] bg-[hsl(var(--info)/0.08)] text-sm rounded-md px-3 py-2">
      <span className="font-semibold text-[hsl(var(--info))] mr-2">Tip</span>
      <span className="text-foreground/80">{children}</span>
    </div>
  );
}