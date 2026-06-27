import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrgProfile } from "@/state/OrgProfileContext";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Check, LogOut } from "lucide-react";
import Logo from "@/components/shared/Logo";

export default function OrgSetup() {
  const navigate = useNavigate();
  const { orgProfile, completeSetup } = useOrgProfile();
  const { signOut } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [orgSize, setOrgSize] = useState<"Startup" | "Small" | "Medium" | "Enterprise" | "">("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Pre-populate organization name from registration if available
  useEffect(() => {
    const savedOrg = localStorage.getItem("acris.registered_org") || orgProfile.orgName || "";
    setOrgName(savedOrg);
  }, [orgProfile.orgName]);

  const departmentsList = [
    "Compliance",
    "Legal",
    "IT",
    "Cybersecurity",
    "Operations",
    "Audit",
    "Risk Management"
  ];

  const servicesList = [
    "Retail Banking",
    "Corporate Banking",
    "Internet Banking",
    "Mobile Banking",
    "UPI",
    "Digital Payments",
    "Loans",
    "Credit Cards",
    "KYC Services"
  ];

  const handleDeptToggle = (dept: string) => {
    setSelectedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleServiceToggle = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast({ title: "Setup Error", description: "Organization Name is required.", variant: "destructive" });
      return;
    }
    if (!orgSize) {
      toast({ title: "Setup Error", description: "Please select an organization size.", variant: "destructive" });
      return;
    }
    if (selectedDepts.length === 0) {
      toast({ title: "Setup Error", description: "Please select at least one department.", variant: "destructive" });
      return;
    }
    if (selectedServices.length === 0) {
      toast({ title: "Setup Error", description: "Please select at least one product or service.", variant: "destructive" });
      return;
    }

    setBusy(true);

    const savedIndustry = (localStorage.getItem("acris.registered_industry") as "Banking" | "FinTech") || orgProfile.industryType || "Banking";

    completeSetup({
      orgName,
      orgSize,
      industryType: savedIndustry,
      departments: selectedDepts,
      services: selectedServices
    });

    // Sync org setup to backend DB if we have a db user id
    const dbUserId = localStorage.getItem("acris.db_user_id");
    if (dbUserId) {
      try {
        const sessionStr = localStorage.getItem("mock_user_session");
        let token = "";
        if (sessionStr) {
          try {
            token = JSON.parse(sessionStr)?.access_token || "";
          } catch (e) {
            // Ignore parse error
          }
        }
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        await fetch(`${backendUrl}/api/v1/auth/org-setup/${dbUserId}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            org_name: orgName,
            org_size: orgSize,
            departments: selectedDepts,
            services: selectedServices,
            enabled_sources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
          }),
        });
      } catch (err) {
        console.warn("Could not sync org setup to backend:", err);
      }
    }

    toast({
      title: "Setup Complete",
      description: `Organization profile configured for ${orgName} (${savedIndustry}). Relevant sources automatically enabled.`
    });

    navigate("/dashboard");
  };

  const handleSignOut = () => {
    signOut();
    navigate("/auth");
  };

  const savedIndustry = (localStorage.getItem("acris.registered_industry") as "Banking" | "FinTech") || orgProfile.industryType || "Banking";

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between font-sans transition-colors duration-300">
      
      {/* Navbar */}
      <header className="w-full h-16 bg-card border-b border-border px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center">
          <Logo theme="default" size="md" onClick={() => {}} />
        </div>
        <button 
          onClick={handleSignOut}
          className="border border-border text-foreground bg-transparent hover:bg-muted font-bold text-xs px-4 py-2.5 rounded-lg transition-colors uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit / Sign Out</span>
        </button>
      </header>

      {/* Setup Form Container */}
      <div className="flex-grow flex items-center justify-center p-8 bg-muted/20">
        <div className="glass-card p-8 w-full max-w-2xl bg-card border border-border shadow-md">
          <div className="mb-6 border-b border-border pb-4">
            <div className="inline-flex items-center gap-2 border-l-2 border-primary pl-3 mb-2">
              <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
                Step 2: Onboarding Setup
              </span>
            </div>
            <h1 className="text-xl font-extrabold uppercase text-foreground tracking-tight">
              Configure Organization Profile
            </h1>
            <p className="text-muted-foreground text-xs mt-1 font-medium leading-relaxed">
              Provide organization details to automatically configure regulatory sources and personalized dashboard recommendation filters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Org Name and Size */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Organization Name
                </label>
                <input
                  required
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Citi Bank India"
                  className="premium-input"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Organization Size
                </label>
                <select
                  required
                  value={orgSize}
                  onChange={(e) => setOrgSize(e.target.value as "Startup" | "Small" | "Medium" | "Enterprise" | "")}
                  className="premium-select"
                >
                  <option value="">Select Size...</option>
                  <option value="Startup">Startup (&lt;50 employees)</option>
                  <option value="Small">Small (50 - 250 employees)</option>
                  <option value="Medium">Medium (250 - 1000 employees)</option>
                  <option value="Enterprise">Enterprise (1000+ employees)</option>
                </select>
              </div>
            </div>

            {/* Industry and Sources Info banner */}
            <div className="border border-primary/20 bg-primary/5 p-4 rounded-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-primary block mb-1">
                Automated Regulator Settings
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                Based on your industry type (<strong>{savedIndustry}</strong>), ACRIS has automatically configured and enabled the following regulatory sources: 
                <span className="text-primary font-bold"> RBI, NPCI, FIU-IND, CERT-In, MeitY / DPDP</span>.
              </p>
            </div>

            {/* Checkbox Group: Departments */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Active Departments / Operations Units
              </label>
              <p className="text-[10px] text-muted-foreground mb-3 font-medium">Select all departments operating in your organization.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {departmentsList.map((dept) => {
                  const isChecked = selectedDepts.includes(dept);
                  return (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => handleDeptToggle(dept)}
                      className={`flex items-center justify-between border px-3.5 py-2.5 text-xs text-left font-semibold rounded-lg transition-all ${
                        isChecked 
                          ? "border-primary bg-primary/5 text-foreground" 
                          : "border-border bg-card hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{dept}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkbox Group: Products & Services */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Key Products & Services Offered
              </label>
              <p className="text-[10px] text-muted-foreground mb-3 font-medium">Select products/services to customize regulatory change mapping and MAP alerts.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {servicesList.map((service) => {
                  const isChecked = selectedServices.includes(service);
                  return (
                    <button
                      type="button"
                      key={service}
                      onClick={() => handleServiceToggle(service)}
                      className={`flex items-center justify-between border px-3.5 py-2.5 text-xs text-left font-semibold rounded-lg transition-all ${
                        isChecked 
                          ? "border-primary bg-primary/5 text-foreground" 
                          : "border-border bg-card hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="truncate pr-1">{service}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-border pt-4 flex justify-end">
              <button
                disabled={busy}
                type="submit"
                className="bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] font-bold text-xs px-8 py-3 rounded-lg uppercase tracking-wider shadow-sm transition-all disabled:opacity-60"
              >
                {busy ? "Configuring Profile..." : "Complete Setup & Launch"}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-card border-t border-border py-4 text-center text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} ACRIS compliance engine. All rights reserved.</span>
      </footer>

    </div>
  );
}
