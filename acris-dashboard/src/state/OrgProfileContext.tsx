import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

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
  const { user } = useAuth();
  const [orgProfile, setOrgProfile] = useState<OrgProfile>(() => {
    if (typeof window === "undefined") return defaultProfile;
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...defaultProfile,
          ...parsed,
          departments: parsed.departments || [],
          services: parsed.services || [],
          enabledSources: parsed.enabledSources || []
        };
      } catch (e) {
        return defaultProfile;
      }
    }
    return defaultProfile;
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(orgProfile));
  }, [orgProfile]);

  useEffect(() => {
    const userType = user?.user_metadata?.user_type || user?.user_type || "admin";
    const userDept = user?.user_metadata?.department || user?.department || "";
    if (userType === "department_officer" && userDept) {
      if (orgProfile.departments.length !== 1 || orgProfile.departments[0] !== userDept) {
        setOrgProfile((prev) => ({
          ...prev,
          departments: [userDept]
        }));
      }
    }
  }, [user, orgProfile.departments]);


  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOrgProfile({
          ...defaultProfile,
          ...parsed,
          departments: parsed.departments || [],
          services: parsed.services || [],
          enabledSources: parsed.enabledSources || []
        });
      } catch (e) {
        setOrgProfile(defaultProfile);
      }
    } else {
      setOrgProfile(defaultProfile);
    }

    const dbUserId = localStorage.getItem("acris.db_user_id") || user?.id;
    if (!dbUserId) return;

    const fetchBackendProfile = async () => {
      try {
        const sessionStr = localStorage.getItem("mock_user_session");
        let token = "";
        if (sessionStr) {
          try {
            token = JSON.parse(sessionStr)?.access_token || "";
          } catch {}
        }
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/api/v1/auth/profile/${dbUserId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.organization) {
            setOrgProfile({
              isSetup: data.organization.is_setup_complete,
              orgName: data.organization.name || "",
              industryType: data.organization.industry || "Banking",
              orgSize: data.organization.org_size || "",
              departments: data.organization.departments || [],
              services: data.organization.services || [],
              enabledSources: data.organization.enabled_sources || ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch org profile from backend:", err);
      }
    };

    fetchBackendProfile();
  }, [user]);

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
      services: ["Retail Banking", "Corporate Banking", "Internet Banking", "Mobile Banking", "UPI", "Digital Payments", "Loans", "Credit Cards", "KYC Services"],
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
