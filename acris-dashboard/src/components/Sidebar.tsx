import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthContext";
import { useTheme } from "@/state/ThemeContext";
import {
  LayoutDashboard, 
  BookOpen, 
  GitCompareArrows, 
  Target,
  BrainCircuit, 
  FileText, 
  FileUp, 
  KanbanSquare, 
  ShieldCheck, 
  LogOut,
  Network,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navGroups = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, color: "#3B82F6" }],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Regulations", path: "/regulations", icon: BookOpen, color: "#06B6D4" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { label: "Document Analysis", path: "/document-analysis", icon: FileUp, color: "#8B5CF6" },
      { label: "Change Detection", path: "/change-detection", icon: GitCompareArrows, color: "#F59E0B" },
      { label: "Impact Analysis", path: "/impact-analysis", icon: Target, color: "#EF4444" },
      { label: "AI Copilot", path: "/copilot", icon: BrainCircuit, color: "#10B981" },
    ],
  },
  {
    title: "Actions",
    items: [
      { label: "MAP Management", path: "/maps", icon: KanbanSquare, color: "#F97316" },
      { label: "Department Routing", path: "/department-routing", icon: Network, color: "#8B5CF6" },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Audit Readiness", path: "/audit-readiness", icon: ShieldCheck, color: "#3B82F6" },
      { label: "Reports", path: "/reports", icon: FileText, color: "#06B6D4" },
    ],
  },
];

export default function Sidebar() {
  const { signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("reguflow.sidebar.collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("reguflow.sidebar.collapsed", String(isCollapsed));
  }, [isCollapsed]);

  const handleToggle = () => setIsCollapsed(!isCollapsed);

  return (
    <aside className={cn(
      "sidebar-enterprise min-h-screen flex-shrink-0 flex flex-col relative z-20",
      isCollapsed ? "w-[76px]" : "w-[280px]"
    )}>
      {/* Top Header / Brand Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden transition-all duration-300">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/20">
              R
            </div>
            <span className="font-extrabold text-sm tracking-wider text-foreground select-none">
              REGUFLOW <span className="text-primary font-black">AI</span>
            </span>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              R
            </div>
          </div>
        )}

        {/* Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            onClick={handleToggle}
            className="w-6 h-6 rounded-md border border-sidebar-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed ? (
              <div className="sidebar-section-label mb-1.5">{group.title}</div>
            ) : (
              <div className="h-px bg-sidebar-border my-2 mx-2" />
            )}
            
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const linkContent = (isActive: boolean) => (
                  <>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                      isActive ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-transparent"
                    )}>
                      <item.icon className="h-4 w-4" style={{
                        color: isActive ? item.color : "currentColor"
                      }} />
                    </div>
                    {!isCollapsed && (
                      <span className="truncate text-xs font-semibold tracking-wide flex-1">{item.label}</span>
                    )}
                  </>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.path} delayDuration={50}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.path}
                          end={true}
                          className={({ isActive }) =>
                            cn("sidebar-nav-item justify-center px-0 py-1", isActive ? "active" : "")
                          }
                        >
                          {({ isActive }) => linkContent(isActive)}
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-semibold text-xs py-1.5 px-3">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={true}
                    className={({ isActive }) =>
                      cn("sidebar-nav-item", isActive ? "active" : "")
                    }
                  >
                    {({ isActive }) => linkContent(isActive)}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer Controls */}
      <div className="p-3 border-t border-sidebar-border mt-auto space-y-1 bg-sidebar-background">
        {/* Expand Trigger (if collapsed) */}
        {isCollapsed && (
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors mb-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Theme Toggle Button */}
        {isCollapsed ? (
          <Tooltip delayDuration={50}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold text-xs py-1.5 px-3">
              Switch to {theme === "dark" ? "Light" : "Dark"} Mode
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all text-xs font-semibold"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        )}

        <div className="h-px bg-sidebar-border my-2" />

        {/* Sign Out Button */}
        {isCollapsed ? (
          <Tooltip delayDuration={50}>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center py-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold text-xs py-1.5 px-3">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-xs font-semibold"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
