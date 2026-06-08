import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, GitCompareArrows, Target,
  BrainCircuit, FileText, Bell, ClipboardList, Building2,
  FileUp, KanbanSquare, ShieldCheck
} from "lucide-react";
import Logo from "./shared/Logo";

const navGroups: { title: string; items: { label: string; path: string; icon: any }[] }[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Regulations", path: "/regulations", icon: BookOpen },
      { label: "Document Analysis", path: "/document-analysis", icon: FileUp },
      { label: "Change Detection", path: "/change-detection", icon: GitCompareArrows },
      { label: "Alerts", path: "/alerts", icon: Bell },
    ],
  },
  {
    title: "Analysis",
    items: [
      { label: "Impact Analysis", path: "/impact-analysis", icon: Target },
      { label: "AI Copilot", path: "/copilot", icon: BrainCircuit },
    ],
  },
  {
    title: "Actions",
    items: [
      { label: "Action Points (MAPs)", path: "/maps", icon: KanbanSquare },
      { label: "Reports", path: "/reports", icon: FileText },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Audit Readiness", path: "/audit-readiness", icon: ShieldCheck },
      { label: "Audit Logs", path: "/audit-logs", icon: ClipboardList },
      { label: "Company Profile", path: "/company-profile", icon: Building2 },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-sidebar flex-shrink-0 flex flex-col border-r border-sidebar-border">
      <div className="px-4 py-4">
        <Logo />
      </div>
      <div className="px-4">
        <div className="border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }} />
      </div>
      <nav className="flex flex-col gap-3 px-3 py-3 flex-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--sidebar-muted))" }}>
              {group.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3">
        <div className="border-t mb-3" style={{ borderColor: "hsl(var(--sidebar-border))" }} />
        <div className="px-3 text-xs" style={{ color: "hsl(var(--sidebar-muted))" }}>
          v3.0.0 · Enterprise
        </div>
      </div>
    </aside>
  );
}
