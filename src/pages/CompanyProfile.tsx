import { useState } from "react";

export default function CompanyProfile() {
  const [industry, setIndustry] = useState("Banking");
  const [services, setServices] = useState("");
  const [riskPref, setRiskPref] = useState("moderate");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Company Profile</h1>
        <p className="page-subtitle mt-0.5">Configure your organization's compliance settings</p>
      </div>

      <div className="section-container p-6 max-w-xl">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Industry</label>
            <select className="border px-3 py-2 text-sm w-full bg-card focus:outline-none focus:ring-1 focus:ring-ring" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option>Banking</option>
              <option>Insurance</option>
              <option>Capital Markets</option>
              <option>NBFC</option>
              <option>Fintech</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Services</label>
            <input
              type="text"
              className="border px-3 py-2 text-sm w-full bg-card focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g., Retail Banking, Wealth Management"
              value={services}
              onChange={(e) => setServices(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Risk Preference</label>
            <div className="flex gap-5 text-sm">
              {["conservative", "moderate", "aggressive"].map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="risk" value={r} checked={riskPref === r} onChange={() => setRiskPref(r)} className="accent-primary" />
                  <span className="font-medium">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <button className="border border-primary bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
