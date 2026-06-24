import { useAuth } from "@/state/AuthContext";
import { Eye } from "lucide-react";

/**
 * Shows a view-only notice for Department Officers on pages where they can
 * browse but cannot perform write actions.
 */
export default function ViewOnlyBanner() {
  const { user } = useAuth();
  const userType = user?.user_type || user?.user_metadata?.user_type || "admin";

  if (userType !== "department_officer") return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
      <Eye className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs font-bold">
        View-Only Mode — You can browse this page but cannot make changes. Use{" "}
        <span className="underline underline-offset-2">AI Copilot</span> or{" "}
        <span className="underline underline-offset-2">MAP Management</span> to take action.
      </span>
    </div>
  );
}
