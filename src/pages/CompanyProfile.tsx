import { useState } from "react";

export default function CompanyProfile() {
  const [industry, setIndustry] = useState("Banking");
  const [services, setServices] = useState("");
  const [riskPref, setRiskPref] = useState("moderate");

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Company Profile</h1>
      <div className="border p-4 max-w-lg">
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Industry</label>
          <select className="border px-2 py-1 text-sm w-full bg-background" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option>Banking</option>
            <option>Insurance</option>
            <option>Capital Markets</option>
            <option>NBFC</option>
            <option>Fintech</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Services</label>
          <input
            type="text"
            className="border px-2 py-1 text-sm w-full bg-background"
            placeholder="e.g., Retail Banking, Wealth Management"
            value={services}
            onChange={(e) => setServices(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Risk Preference</label>
          <div className="flex gap-4 text-sm">
            {["conservative", "moderate", "aggressive"].map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input type="radio" name="risk" value={r} checked={riskPref === r} onChange={() => setRiskPref(r)} />
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <button className="border px-4 py-1 text-sm font-semibold bg-primary text-primary-foreground">
          Save Profile
        </button>
      </div>
    </div>
  );
}
