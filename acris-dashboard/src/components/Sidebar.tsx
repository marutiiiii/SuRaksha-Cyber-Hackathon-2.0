import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, GitCompareArrows, Target,
  BrainCircuit, FileText, Bell, ClipboardList, Building2,
  FileUp, KanbanSquare, ShieldCheck, Zap
} from "lucide-react";

const navGroups: { title: string; items: { label: string; path: string; icon: any; color: string }[] }[] = [
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
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Audit Readiness", path: "/audit-readiness", icon: ShieldCheck, color: "#3B82F6" },
      { label: "Reports", path: "/reports", icon: FileText, color: "#06B6D4" },
      { label: "Alerts", path: "/alerts", icon: Bell, color: "#EF4444" },
      { label: "Audit Logs", path: "/audit-logs", icon: ClipboardList, color: "#8B5CF6" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Company Profile", path: "/company-profile", icon: Building2, color: "#94A3B8" },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar-enterprise w-[260px] min-h-screen flex-shrink-0 flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes logo-float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }
        .logo-floating {
          animation: logo-float 4s ease-in-out infinite;
          filter: drop-shadow(0 0 12px rgba(59,130,246,0.3));
        }
      `}} />
      {/* Logo area */}
      <div className="px-5 h-12 flex items-center relative">
        <img 
          src="/logo.png" 
          alt="ReguFlow AI Logo" 
          className="absolute left-5 top-[-16px] h-20 w-auto object-contain logo-floating z-10" 
        />
        <div className="ml-auto z-20">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)"
          }}>
            <div className="status-dot status-dot-green" style={{ width: 5, height: 5 }} />
            <span className="text-[10px] font-semibold" style={{ color: "#34D399" }}>Live</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="divider mx-4 mb-3" />

      {/* Compliance health mini-widget */}
      <div className="mx-3 mb-4 p-3 rounded-10" style={{
        background: "rgba(59,130,246,0.06)",
        border: "1px solid rgba(59,130,246,0.15)",
        borderRadius: 10
      }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold" style={{ color: "rgba(148,163,184,0.7)" }}>Compliance Health</span>
          <Zap className="h-3 w-3" style={{ color: "#60A5FA" }} />
        </div>
        <div className="flex items-end gap-2">
          <span className="text-xl font-black" style={{ color: "#60A5FA", textShadow: "0 0 20px rgba(96,165,250,0.4)" }}>84%</span>
          <span className="text-[11px] mb-0.5" style={{ color: "#34D399" }}>↑ +6%</span>
        </div>
        <div className="mt-2 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-1 rounded-full" style={{
            width: "84%",
            background: "linear-gradient(90deg, #3B82F6, #06B6D4)",
            boxShadow: "0 0 8px rgba(59,130,246,0.5)"
          }} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-4 px-3 flex-1 overflow-y-auto pb-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="sidebar-section-label mb-2">{group.title}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={true}
                  className={({ isActive }) =>
                    cn("sidebar-nav-item", isActive ? "active" : "")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="w-7 h-7 rounded-7 flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{
                        background: isActive
                          ? `rgba(${item.color === "#3B82F6" ? "59,130,246" : item.color === "#06B6D4" ? "6,182,212" : item.color === "#8B5CF6" ? "139,92,246" : item.color === "#F59E0B" ? "245,158,11" : item.color === "#EF4444" ? "239,68,68" : item.color === "#10B981" ? "16,185,129" : item.color === "#F97316" ? "249,115,22" : "148,163,184"},0.18)`
                          : "rgba(255,255,255,0.04)",
                        borderRadius: 7
                      }}>
                        <item.icon className="h-3.5 w-3.5" style={{
                          color: isActive ? item.color : "rgba(148,163,184,0.5)"
                        }} />
                      </div>
                      <span className="truncate text-[13px]">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="divider mb-3" />
        <div className="px-2 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "rgba(100,116,139,0.5)" }}>v3.0.0</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.2)",
            color: "#60A5FA",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em"
          }}>ENTERPRISE</span>
        </div>
      </div>
    </aside>
  );
}
