export default function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  return (
    <div className="flex items-center gap-2">
      <div className={`${dim} bg-primary text-primary-foreground flex items-center justify-center rounded font-bold text-sm`}>
        R
      </div>
      <div className="leading-tight">
        <div className="font-bold text-sidebar-primary-foreground text-sm tracking-tight">ReguFlow AI</div>
        <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">Compliance Engine</div>
      </div>
    </div>
  );
}