import { useEffect, useRef, useState } from "react";
import { Bell, Search, Moon, Sun, LogOut, ChevronDown, Command } from "lucide-react";
import { useTheme } from "@/state/ThemeContext";
import { useCopilot, CopilotMode } from "@/state/CopilotContext";
import { useAuth } from "@/state/AuthContext";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const MODES: { value: CopilotMode; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Standard" },
  { value: "expert", label: "Expert" },
];

export default function TopBar() {
  const { theme, toggle } = useTheme();
  const { mode, setMode } = useCopilot();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const name = user?.user_metadata?.name ?? user?.email ?? "Aarav Mehta";
  const role = user?.user_metadata?.role ?? "Compliance Officer";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word: string) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();

  const isRegulationsPage = location.pathname === "/regulations";

  useEffect(() => {
    if (isRegulationsPage) {
      setSearchValue(searchParams.get("q") || "");
    } else {
      setSearchValue("");
    }
  }, [location.pathname, searchParams, isRegulationsPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    if (isRegulationsPage) {
      if (val) {
        setSearchParams({ q: val });
      } else {
        const params = new URLSearchParams(searchParams);
        params.delete("q");
        setSearchParams(params);
      }
    }
  };

  const handleSearchFocus = () => {
    setSearchFocused(true);
    if (!isRegulationsPage) {
      toast({
        title: "Global Search",
        description: "Navigate to the Regulations page to use full text search.",
      });
    }
  };

  return (
    <header className="topbar-enterprise flex items-center justify-between px-6 flex-shrink-0">
      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-3 h-9 rounded-lg transition-all duration-300"
        style={{
          width: 320,
          background: searchFocused ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.04)",
          border: searchFocused
            ? "1px solid rgba(59,130,246,0.35)"
            : "1px solid rgba(255,255,255,0.07)",
          boxShadow: searchFocused ? "0 0 20px rgba(59,130,246,0.1)" : "none",
        }}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(148,163,184,0.5)" }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search regulations, entities..."
          className="border-0 bg-transparent text-sm flex-1 focus:outline-none"
          style={{
            color: "#F8FAFC",
            fontSize: 13,
            caretColor: "#3B82F6",
          }}
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleSearchFocus}
          onBlur={() => setSearchFocused(false)}
        />
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">

        {/* Mode switcher */}
        <div className="flex items-center p-0.5 rounded-lg" style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)"
        }}>
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200"
              style={mode === m.value ? {
                background: "rgba(59,130,246,0.2)",
                color: "#60A5FA",
                border: "1px solid rgba(59,130,246,0.3)",
                boxShadow: "0 0 12px rgba(59,130,246,0.15)"
              } : {
                color: "rgba(148,163,184,0.6)",
                border: "1px solid transparent"
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="divider-v h-6" />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
          }}
          title="Toggle theme"
        >
          {theme === "dark"
            ? <Sun className="h-3.5 w-3.5" style={{ color: "rgba(148,163,184,0.7)" }} />
            : <Moon className="h-3.5 w-3.5" style={{ color: "rgba(148,163,184,0.7)" }} />}
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.08)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,63,94,0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <Bell className="h-3.5 w-3.5" style={{ color: "rgba(148,163,184,0.7)" }} />
          <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ background: "#F43F5E", boxShadow: "0 0 8px rgba(244,63,94,0.5)" }}>
            3
          </span>
        </button>

        {/* Divider */}
        <div className="divider-v h-6" />

        {/* User profile */}
        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
              boxShadow: "0 0 16px rgba(59,130,246,0.3)"
            }}>
            {initials}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold leading-tight max-w-[140px] truncate" style={{ color: "#F8FAFC" }}>{name}</div>
            <div className="text-[11px] leading-tight truncate" style={{ color: "rgba(148,163,184,0.6)" }}>{role}</div>
          </div>
          <ChevronDown className="h-3 w-3 hidden sm:block" style={{ color: "rgba(148,163,184,0.4)" }} />
          <button
            onClick={signOut}
            title="Sign out"
            className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)" }}
          >
            <LogOut className="h-3 w-3" style={{ color: "#FB7185" }} />
          </button>
        </div>
      </div>
    </header>
  );
}
