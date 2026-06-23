import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { useCopilot } from "@/state/CopilotContext";
import { useOrgProfile } from "@/state/OrgProfileContext";
import { useAuth } from "@/state/AuthContext";
import { ShieldCheck, User, Users, Settings2, ShieldAlert } from "lucide-react";

export default function CompanyProfile() {
  const { orgProfile, completeSetup } = useOrgProfile();
  const { user } = useAuth();
  const { mode, setMode } = useCopilot();

  const [orgName, setOrgName] = useState("");
  const [orgSize, setOrgSize] = useState("Medium");
  const [industry, setIndustry] = useState<"Banking" | "FinTech">("Banking");
  const [services, setServices] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [riskPref, setRiskPref] = useState("moderate");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgProfile) {
      setOrgName(orgProfile.orgName || "SafeBank India");
      setOrgSize(orgProfile.orgSize || "Medium");
      setIndustry(orgProfile.industryType || "Banking");
      setServices(orgProfile.services ? orgProfile.services.join(", ") : "");
      setSelectedDepts(orgProfile.departments || []);
    }
  }, [orgProfile]);

  const name = user?.user_metadata?.name ?? user?.email ?? "Aarav Mehta";
  const role = user?.user_metadata?.role ?? "Compliance Officer";
  const department = orgProfile.departments?.[0] ?? "Compliance";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word: string) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    if (selectedDepts.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one department.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const servicesList = services
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    completeSetup({
      orgName: orgName,
      industryType: industry,
      orgSize: orgSize as any,
      departments: selectedDepts,
      services: servicesList,
    });

    const dbUserId = localStorage.getItem("acris.db_user_id") || user?.id;
    if (dbUserId) {
      try {
        const sessionStr = localStorage.getItem("mock_user_session");
        let token = "";
        if (sessionStr) {
          try {
            token = JSON.parse(sessionStr)?.access_token || "";
          } catch {}
        }
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/api/v1/auth/org-setup/${dbUserId}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            org_name: orgName,
            org_size: orgSize,
            departments: selectedDepts,
            services: servicesList,
            enabled_sources: orgProfile.enabledSources || ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
            industry: industry,
          }),
        });
        if (!res.ok) {
          throw new Error("Backend save failed");
        }
        toast({ title: "Profile saved", description: "Your organization settings were updated in the database." });
      } catch (err) {
        console.warn("Could not sync profile to backend:", err);
        toast({ title: "Profile saved locally", description: "Settings saved locally but could not sync to database.", variant: "destructive" });
      }
    } else {
      toast({ title: "Profile saved", description: "Your organization settings were updated locally." });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Organization Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure your enterprise metadata and individual profile preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          {/* User Profile Card */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">User Details</h3>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-primary to-cyan-500 text-white flex items-center justify-center font-bold shadow-sm shadow-primary/25">
                {initials}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{name}</div>
                <div className="text-xs text-muted-foreground font-semibold">{role} · {department} Department</div>
              </div>
            </div>
            
            <div className="space-y-1.5 pt-3 border-t border-border/40">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <span>Compliance Level</span>
                <span className="text-foreground">85/100</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Compliance Mode Preferences</h3>
            <div>
              <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">Adaptive Layout Density</span>
              <div className="flex gap-2">
                {(["beginner", "expert"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold capitalize transition-all ${
                      mode === m
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border hover:bg-muted text-muted-foreground hover:text-foreground bg-background"
                    }`}
                  >
                    {m} Mode
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3.5 leading-relaxed font-semibold">
                {mode === "beginner" && "Beginner mode: Displays in-context tooltips, introductory guide cards, and descriptive overview banners."}
                {mode === "expert" && "Expert mode: Streamlines workspace columns, enables high-density data matrices, and condenses alerts list."}
              </p>
            </div>
            
            <div className="border-t border-border/40 pt-4 space-y-3 font-semibold text-muted-foreground">
              <span className="block text-[9px] font-mono font-bold uppercase tracking-wider mb-3">Auditing Toggles</span>
              <div className="space-y-3 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={mode !== "expert"} readOnly className="accent-primary rounded h-4 w-4 border-border" />
                  <span>Show inline helper banners & SOP guides</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={mode === "expert"} readOnly className="accent-primary rounded h-4 w-4 border-border" />
                  <span>Enable dense table layouts for all data grids</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" defaultChecked className="accent-primary rounded h-4 w-4 border-border" />
                  <span>Auto-generate audit evidence requirement checklists</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Details Form */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Organization Details</h3>
          
          <div className="space-y-4 font-bold">
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Registered Entity Name</label>
              <input
                type="text"
                className="premium-input text-xs h-10 focus:outline-none"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Company Staff Size</label>
                <select 
                  className="premium-select text-xs h-10 focus:outline-none" 
                  value={orgSize} 
                  onChange={(e) => setOrgSize(e.target.value)}
                >
                  <option value="Startup">Startup (&lt;50)</option>
                  <option value="Small">Small (50 - 250)</option>
                  <option value="Medium">Medium (250 - 1000)</option>
                  <option value="Enterprise">Enterprise (1000+)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Regulated Sector</label>
                <select 
                  className="premium-select text-xs h-10 focus:outline-none" 
                  value={industry} 
                  onChange={(e) => setIndustry(e.target.value as any)}
                >
                  <option value="Banking">Banking (RBI Regulated)</option>
                  <option value="FinTech">FinTech (Financial Services)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Regulated Services / Products</label>
              <input
                type="text"
                className="premium-input text-xs h-10 focus:outline-none"
                placeholder="e.g. Retail Banking, UPI Payments, Loans"
                value={services}
                onChange={(e) => setServices(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Active Departments</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5 font-semibold text-xs text-muted-foreground">
                {["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"].map((dept) => (
                  <label 
                    key={dept} 
                    className={`flex items-center gap-2.5 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                      selectedDepts.includes(dept) 
                        ? "border-primary bg-primary/5 text-foreground" 
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepts.includes(dept)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDepts([...selectedDepts, dept]);
                        } else {
                          setSelectedDepts(selectedDepts.filter((d) => d !== dept));
                        }
                      }}
                      className="accent-primary rounded h-4 w-4 border-border"
                    />
                    <span>{dept}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Audit Risk Profile</label>
              <div className="flex gap-6 text-xs text-muted-foreground">
                {["conservative", "moderate", "aggressive"].map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors font-bold capitalize">
                    <input 
                      type="radio" 
                      name="risk" 
                      value={r} 
                      checked={riskPref === r} 
                      onChange={() => setRiskPref(r)} 
                      className="accent-primary h-4.5 w-4.5 border-border" 
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 mt-4 flex justify-end">
              <button
                disabled={saving}
                onClick={handleSaveProfile}
                className="bg-primary text-primary-foreground font-extrabold rounded-lg px-5 py-2.5 text-xs hover:opacity-90 transition-all uppercase tracking-wider disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
