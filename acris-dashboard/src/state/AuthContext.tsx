import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";


interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInDemo: (customUser?: { 
    id?: string; 
    token?: string; 
    email: string; 
    name: string; 
    orgName: string; 
    industryType: "Banking" | "FinTech";
    userType?: "admin" | "department_officer";
    department?: string;
    status?: string;
    role?: string;
  }) => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  signInDemo: () => {},
});

const mockUser: User = {
  id: "00000000-0000-0000-0000-000000000000",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@safebank.com",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { 
    name: "Aarav Mehta", 
    role: "Compliance Officer",
    user_type: "admin",
    department: "",
    status: "Active"
  },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockUserStr = localStorage.getItem("mock_user_session");
    if (mockUserStr) {
      try {
        const parsed = JSON.parse(mockUserStr);
        setSession(parsed);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem("mock_user_session");
      }
    }

    setLoading(false);
  }, []);

  const signInDemo = (customUser?: { 
    id?: string; 
    token?: string; 
    email: string; 
    name: string; 
    orgName: string; 
    industryType: "Banking" | "FinTech";
    userType?: "admin" | "department_officer";
    department?: string;
    status?: string;
  }) => {
    const sessionToSave = customUser ? {
      ...mockSession,
      access_token: customUser.token || "mock-access-token",
      user: {
        ...mockUser,
        id: customUser.id || mockUser.id,
        email: customUser.email,
        user_metadata: {
          name: customUser.name,
          role: customUser.role || (customUser.userType === "admin" ? "AI Compliance Officer" : "Department Officer"),
          org_name: customUser.orgName,
          industry_type: customUser.industryType,
          user_type: customUser.userType || "admin",
          department: customUser.department || "",
          status: customUser.status || "Active"
        }
      }
    } : mockSession;

    localStorage.setItem("mock_user_session", JSON.stringify(sessionToSave));
    localStorage.setItem("acris.db_user_id", sessionToSave.user.id);
    
    // Set organization profile state
    const profile = customUser ? {
      isSetup: false,
      orgName: customUser.orgName,
      industryType: customUser.industryType,
      orgSize: "" as "Startup" | "Small" | "Medium" | "Enterprise" | "",
      departments: [],
      services: [],
      enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
    } : {
      isSetup: true,
      orgName: "SafeBank India",
      industryType: "Banking" as const,
      orgSize: "Enterprise" as const,
      departments: ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"],
      services: ["Retail Banking", "Corporate Banking", "Internet Banking", "Mobile Banking", "UPI", "Digital Payments", "Loans", "Credit Cards", "KYC Services"],
      enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
    };
    
    localStorage.setItem("acris.org_profile", JSON.stringify(profile));

    setSession(sessionToSave);
  };

  const signOut = async () => {
    localStorage.removeItem("mock_user_session");
    localStorage.removeItem("acris.org_profile");
    localStorage.removeItem("acris.registered_name");
    localStorage.removeItem("acris.registered_org");
    localStorage.removeItem("acris.registered_industry");
    localStorage.removeItem("acris.db_user_id");

    setSession(null);
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut,
        signInDemo,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);