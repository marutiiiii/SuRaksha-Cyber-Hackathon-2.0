const oldText = [
  { type: "unchanged", text: "Section 3.1: All regulated entities must maintain KYC records for a minimum period of 5 years." },
  { type: "removed", text: "Section 3.2: Periodic updates of KYC shall be done every 2 years for high-risk customers." },
  { type: "unchanged", text: "Section 3.3: Customer identification procedures must comply with PMLA guidelines." },
  { type: "modified", text: "Section 4.1: Digital KYC (V-CIP) may be used as an alternative to in-person verification." },
  { type: "unchanged", text: "Section 5.1: Non-compliance shall attract penalties as prescribed under Section 13 of PMLA." },
];

const newText = [
  { type: "unchanged", text: "Section 3.1: All regulated entities must maintain KYC records for a minimum period of 5 years." },
  { type: "added", text: "Section 3.2: Periodic updates of KYC shall be done annually for high-risk customers and every 2 years for medium-risk customers." },
  { type: "unchanged", text: "Section 3.3: Customer identification procedures must comply with PMLA guidelines." },
  { type: "modified", text: "Section 4.1: Digital KYC (V-CIP) shall be the preferred method for customer verification, replacing in-person verification where feasible." },
  { type: "unchanged", text: "Section 5.1: Non-compliance shall attract penalties as prescribed under Section 13 of PMLA." },
  { type: "added", text: "Section 5.2: Regulated entities must report KYC compliance status quarterly to RBI." },
];

const bgColor = (type: string) => {
  if (type === "added") return "hsl(142 72% 29% / 0.08)";
  if (type === "removed") return "hsl(0 72% 51% / 0.08)";
  if (type === "modified") return "hsl(38 92% 50% / 0.08)";
  return "transparent";
};

const borderColor = (type: string) => {
  if (type === "added") return "hsl(var(--risk-low))";
  if (type === "removed") return "hsl(var(--risk-high))";
  if (type === "modified") return "hsl(var(--risk-medium))";
  return "transparent";
};

export default function ChangeDetection() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Change Detection</h1>
        <p className="page-subtitle mt-0.5">Compare old and new regulatory text side by side</p>
      </div>

      <div className="flex gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border" style={{ background: "hsl(142 72% 29% / 0.08)", borderColor: "hsl(var(--risk-low))" }}>
          <span className="w-2 h-2" style={{ background: "hsl(var(--risk-low))" }} />Added
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border" style={{ background: "hsl(0 72% 51% / 0.08)", borderColor: "hsl(var(--risk-high))" }}>
          <span className="w-2 h-2" style={{ background: "hsl(var(--risk-high))" }} />Removed
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border" style={{ background: "hsl(38 92% 50% / 0.08)", borderColor: "hsl(var(--risk-medium))" }}>
          <span className="w-2 h-2" style={{ background: "hsl(var(--risk-medium))" }} />Modified
        </span>
      </div>

      <div className="grid grid-cols-2 section-container">
        <div className="border-r">
          <div className="px-4 py-2.5 border-b table-header">Old Version</div>
          {oldText.map((line, i) => (
            <div
              key={i}
              className="px-4 py-3 border-b last:border-0 text-sm leading-relaxed"
              style={{
                background: bgColor(line.type),
                borderLeft: line.type !== "unchanged" ? `3px solid ${borderColor(line.type)}` : "3px solid transparent",
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
        <div>
          <div className="px-4 py-2.5 border-b table-header">New Version</div>
          {newText.map((line, i) => (
            <div
              key={i}
              className="px-4 py-3 border-b last:border-0 text-sm leading-relaxed"
              style={{
                background: bgColor(line.type),
                borderLeft: line.type !== "unchanged" ? `3px solid ${borderColor(line.type)}` : "3px solid transparent",
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
