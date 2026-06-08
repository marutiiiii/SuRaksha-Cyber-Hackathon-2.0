import { Bell, Search, Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "@/state/ThemeContext";
import { useCopilot, CopilotMode } from "@/state/CopilotContext";
import { currentUser } from "@/mocks";

const MODES: { value: CopilotMode; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
];

export default function TopBar() {
  const { theme, toggle } = useTheme();
  const { mode, setMode } = useCopilot();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2 text-muted-foreground border border-border rounded-md px-3 h-9 w-80">
        <Search className="h-4 w-4" />
        <input
          type="text"
          placeholder="Search regulations, MAPs, reports..."
          className="border-0 bg-transparent text-sm flex-1 placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <kbd className="hidden sm:inline text-[10px] text-muted-foreground/60 border border-border px-1 rounded">⌘K</kbd>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                mode === m.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={toggle} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors" title="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full">3</span>
        </button>
        <div className="w-px h-6 bg-border" />
        <button className="flex items-center gap-2 hover:bg-muted rounded px-2 py-1 transition-colors">
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold rounded">
            {currentUser.initials}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium leading-tight">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground leading-tight">{currentUser.role}</div>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
