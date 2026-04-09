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
  if (type === "added") return "#dcfce7";
  if (type === "removed") return "#fee2e2";
  if (type === "modified") return "#fef9c3";
  return "transparent";
};

export default function ChangeDetection() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Change Detection</h1>
      <div className="flex gap-2 mb-2 text-xs">
        <span className="px-2 py-0.5 border" style={{ background: "#dcfce7" }}>Added</span>
        <span className="px-2 py-0.5 border" style={{ background: "#fee2e2" }}>Removed</span>
        <span className="px-2 py-0.5 border" style={{ background: "#fef9c3" }}>Modified</span>
      </div>
      <div className="grid grid-cols-2 border">
        <div className="border-r">
          <div className="p-2 bg-secondary border-b font-semibold text-sm">Old Version</div>
          {oldText.map((line, i) => (
            <div key={i} className="p-2 border-b text-sm" style={{ background: bgColor(line.type) }}>
              {line.text}
            </div>
          ))}
        </div>
        <div>
          <div className="p-2 bg-secondary border-b font-semibold text-sm">New Version</div>
          {newText.map((line, i) => (
            <div key={i} className="p-2 border-b text-sm" style={{ background: bgColor(line.type) }}>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
