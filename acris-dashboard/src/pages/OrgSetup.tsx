import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrgProfile } from "@/state/OrgProfileContext";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Check, LogOut } from "lucide-react";

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

  const handleSubmit = (e: React.FormEvent) => {
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
    <div className="min-h-screen w-full bg-[#F1F5F9] text-[#0F172A] flex flex-col justify-between font-sans">
      
      {/* Navbar */}
      <header className="w-full h-16 bg-[#0F172A] border-b border-slate-800 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40">
        <div className="relative h-16 w-48 flex items-center">
          <img 
            src="/logo.png" 
            alt="ACRIS Logo" 
            className="absolute left-0 top-[-16px] h-24 w-auto object-contain z-50 pointer-events-auto"
          />
        </div>
        <button 
          onClick={handleSignOut}
          className="border border-slate-700 text-white bg-transparent hover:bg-slate-800 font-bold text-xs px-4 py-2.5 rounded-none transition-colors uppercase tracking-wider flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit / Sign Out</span>
        </button>
      </header>

      {/* Setup Form Container */}
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 p-8 w-full max-w-2xl shadow-sm rounded-none">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-2 border-l-2 border-[#1E40AF] pl-3 mb-2">
              <span className="text-xs font-mono font-bold tracking-widest text-[#1E40AF] uppercase">
                Step 2: Onboarding Setup
              </span>
            </div>
            <h1 className="text-xl font-extrabold uppercase text-slate-900 tracking-tight">
              Configure Organization Profile
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              Provide organization details to automatically configure regulatory sources and personalized dashboard recommendation filters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Org Name and Size */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Organization Name
                </label>
                <input
                  required
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Citi Bank India"
                  className="border border-slate-300 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Organization Size
                </label>
                <select
                  required
                  value={orgSize}
                  onChange={(e) => setOrgSize(e.target.value as any)}
                  className="border border-slate-300 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 font-medium transition-all"
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
            <div className="border border-blue-100 bg-blue-50/50 p-4 rounded-none">
              <span className="text-[10px] font-mono font-bold uppercase text-[#1E40AF] block mb-1">
                Automated Regulator Settings
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Based on your industry type (<strong>{savedIndustry}</strong>), ACRIS has automatically configured and enabled the following regulatory sources: 
                <span className="text-[#1E40AF] font-bold"> RBI, NPCI, FIU-IND, CERT-In, MeitY / DPDP</span>.
              </p>
            </div>

            {/* Checkbox Group: Departments */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Active Departments / Operations Units
              </label>
              <p className="text-[10px] text-slate-400 mb-2 font-medium">Select all departments operating in your organization.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {departmentsList.map((dept) => {
                  const isChecked = selectedDepts.includes(dept);
                  return (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => handleDeptToggle(dept)}
                      className={`flex items-center justify-between border px-3 py-2 text-xs text-left font-semibold rounded-none transition-all ${
                        isChecked 
                          ? "border-[#1E40AF] bg-[#1E40AF]/5 text-slate-900" 
                          : "border-slate-300 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span>{dept}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#1E40AF]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkbox Group: Products & Services */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Key Products & Services Offered
              </label>
              <p className="text-[10px] text-slate-400 mb-2 font-medium">Select products/services to customize regulatory change mapping and MAP alerts.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {servicesList.map((service) => {
                  const isChecked = selectedServices.includes(service);
                  return (
                    <button
                      type="button"
                      key={service}
                      onClick={() => handleServiceToggle(service)}
                      className={`flex items-center justify-between border px-3 py-2 text-xs text-left font-semibold rounded-none transition-all ${
                        isChecked 
                          ? "border-[#1E40AF] bg-[#1E40AF]/5 text-slate-900" 
                          : "border-slate-300 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className="truncate pr-1">{service}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#1E40AF] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                disabled={busy}
                type="submit"
                className="bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-[#1A368F] text-white font-bold text-xs px-8 py-3 rounded-none uppercase tracking-wider shadow-sm transition-all disabled:opacity-60"
              >
                {busy ? "Configuring Profile..." : "Complete Setup & Launch"}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-[#0F172A] border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <span>&copy; {new Date().getFullYear()} ACRIS compliance engine. All rights reserved.</span>
      </footer>

    </div>
  );
}
