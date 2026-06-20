import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface OrgProfile {
  isSetup: boolean;
  orgName: string;
  industryType: "Banking" | "FinTech";
  orgSize: "Startup" | "Small" | "Medium" | "Enterprise" | "";
  departments: string[];
  services: string[];
  enabledSources: string[];
}

interface OrgProfileCtx {
  orgProfile: OrgProfile;
  updateOrgProfile: (profile: Partial<OrgProfile>) => void;
  completeSetup: (profile: Omit<OrgProfile, "isSetup" | "enabledSources">) => void;
  resetProfile: () => void;
  setDemoProfile: () => void;
}

const defaultProfile: OrgProfile = {
  isSetup: false,
  orgName: "",
  industryType: "Banking",
  orgSize: "",
  departments: [],
  services: [],
  enabledSources: []
};

const Ctx = createContext<OrgProfileCtx | null>(null);
const KEY = "acris.org_profile";

export function OrgProfileProvider({ children }: { children: ReactNode }) {
  const [orgProfile, setOrgProfile] = useState<OrgProfile>(() => {
    if (typeof window === "undefined") return defaultProfile;
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return defaultProfile;
      }
    }
    return defaultProfile;
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(orgProfile));
  }, [orgProfile]);

  const updateOrgProfile = (profile: Partial<OrgProfile>) => {
    setOrgProfile((prev) => {
      const updated = { ...prev, ...profile };
      // Dynamically calculate sources if industry type changed
      if (profile.industryType) {
        updated.enabledSources = ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"];
      }
      return updated;
    });
  };

  const completeSetup = (profile: Omit<OrgProfile, "isSetup" | "enabledSources">) => {
    setOrgProfile(() => {
      return {
        ...profile,
        isSetup: true,
        enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
      };
    });
  };

  const resetProfile = () => {
    setOrgProfile(defaultProfile);
    localStorage.removeItem(KEY);
    localStorage.removeItem("acris.registered_name");
    localStorage.removeItem("acris.registered_org");
    localStorage.removeItem("acris.registered_industry");
  };

  const setDemoProfile = () => {
    setOrgProfile({
      isSetup: true,
      orgName: "SafeBank India",
      industryType: "Banking",
      orgSize: "Enterprise",
      departments: ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"],
      services: ["Retail Banking", "Corporate Banking", "Internet Banking", "Mobile Banking", "UPI", "Loans", "Credit Cards", "KYC Services"],
      enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
    });
  };

  return (
    <Ctx.Provider value={{ orgProfile, updateOrgProfile, completeSetup, resetProfile, setDemoProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOrgProfile() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOrgProfile must be used within OrgProfileProvider");
  return v;
}
