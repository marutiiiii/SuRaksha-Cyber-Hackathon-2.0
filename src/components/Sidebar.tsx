import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Regulations", path: "/regulations" },
  { label: "Change Detection", path: "/change-detection" },
  { label: "Impact Analysis", path: "/impact-analysis" },
  { label: "AI Explanation", path: "/ai-explanation" },
  { label: "Reports", path: "/reports" },
  { label: "Alerts", path: "/alerts" },
  { label: "Audit Logs", path: "/audit-logs" },
  { label: "Company Profile", path: "/company-profile" },
];

export default function Sidebar() {
  return (
    <aside className="w-52 min-h-screen border-r bg-secondary flex-shrink-0">
      <div className="p-4 border-b font-bold text-primary text-lg">ACRIS</div>
      <nav className="flex flex-col">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "px-4 py-2 text-sm border-b hover:bg-accent",
                isActive && "bg-primary text-primary-foreground font-semibold"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
