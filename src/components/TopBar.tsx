import { Bell } from "lucide-react";

export default function TopBar() {
  return (
    <header className="h-10 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
      <input
        type="text"
        placeholder="Search regulations..."
        className="border px-2 py-1 text-sm w-64 bg-background"
      />
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Bell className="h-4 w-4" /> 3 new
        </span>
        <span className="font-semibold">Admin User</span>
      </div>
    </header>
  );
}
