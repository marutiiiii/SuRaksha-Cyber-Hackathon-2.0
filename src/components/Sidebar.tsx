import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, GitCompareArrows, Target,
  BrainCircuit, FileText, Bell, ClipboardList, Building2
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Regulations", path: "/regulations", icon: BookOpen },
  { label: "Change Detection", path: "/change-detection", icon: GitCompareArrows },
  { label: "Impact Analysis", path: "/impact-analysis", icon: Target },
  { label: "AI Explanation", path: "/ai-explanation", icon: BrainCircuit },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Alerts", path: "/alerts", icon: Bell },
  { label: "Audit Logs", path: "/audit-logs", icon: ClipboardList },
  { label: "Company Profile", path: "/company-profile", icon: Building2 },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-sidebar flex-shrink-0 flex flex-col">
      <div className="px-5 py-4 flex items-center gap-2">
        <div className="w-7 h-7 bg-sidebar-primary flex items-center justify-center">
          <span className="text-xs font-bold text-primary">A</span>
        </div>
        <span className="font-bold text-sidebar-primary text-base tracking-tight">ACRIS</span>
      </div>
      <div className="px-4 mb-3">
        <div className="border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }} />
      </div>
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3">
        <div className="border-t mb-3" style={{ borderColor: "hsl(var(--sidebar-border))" }} />
        <div className="px-3 text-xs" style={{ color: "hsl(var(--sidebar-muted))" }}>
          v2.1.0 · Enterprise
        </div>
      </div>
    </aside>
  );
}
