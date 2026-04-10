import { Bell, Search } from "lucide-react";

export default function TopBar() {
  return (
    <header className="h-12 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Search className="h-4 w-4" />
        <input
          type="text"
          placeholder="Search regulations, alerts, reports..."
          className="border-0 bg-transparent px-1 py-1 text-sm w-72 placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-5 text-sm">
        <button className="relative flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">3</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">AU</div>
          <div>
            <div className="text-sm font-medium leading-tight">Admin User</div>
            <div className="text-xs text-muted-foreground leading-tight">Compliance Officer</div>
          </div>
        </div>
      </div>
    </header>
  );
}
