import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { currentUser } from "@/mocks";
import { useCopilot } from "@/state/CopilotContext";

export default function CompanyProfile() {
  const [industry, setIndustry] = useState("Banking");
  const [services, setServices] = useState("");
  const [riskPref, setRiskPref] = useState("moderate");
  const { mode, setMode } = useCopilot();

  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" subtitle="Configure your organization and personal compliance settings" />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="section-container p-5">
          <div className="text-sm font-semibold mb-4">User profile</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {currentUser.initials}
            </div>
            <div>
              <div className="text-sm font-medium">{currentUser.name}</div>
              <div className="text-xs text-muted-foreground">{currentUser.role} · {currentUser.department}</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Expertise score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded">
                  <div className="h-full bg-primary rounded" style={{ width: `${currentUser.expertiseScore}%` }} />
                </div>
                <span className="tabular-nums text-xs">{currentUser.expertiseScore}/100</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Copilot mode</div>
              <div className="flex gap-2">
                {(["beginner", "intermediate", "expert"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 border rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors ${mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mode adapts table density, tooltips, and guidance across the app.
              </p>
            </div>
          </div>
        </div>

        <div className="section-container p-5">
          <div className="text-sm font-semibold mb-4">Organization</div>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Industry</label>
            <select className="border border-border rounded-md px-3 py-2 text-sm w-full bg-card focus:outline-none focus:ring-1 focus:ring-ring" value={industry} onChange={(e) => setIndustry(e.target.value)}>
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
              className="border border-border rounded-md px-3 py-2 text-sm w-full bg-card focus:outline-none focus:ring-1 focus:ring-ring"
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
            <button
              onClick={() => toast({ title: "Profile saved", description: "Your organization settings were updated." })}
              className="bg-primary text-primary-foreground rounded px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Save Profile
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
