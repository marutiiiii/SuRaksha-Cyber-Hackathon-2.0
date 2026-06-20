import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInDemo: (customUser?: { email: string; name: string; orgName: string; industryType: "Banking" | "FinTech" }) => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  signInDemo: () => {},
});

const mockUser: User = {
  id: "demo-user-id",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@safebank.com",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Aarav Mehta", role: "Compliance Officer" },
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

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (localStorage.getItem("mock_user_session") && !s) {
        return;
      }
      setSession(s);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (localStorage.getItem("mock_user_session")) {
        return;
      }
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInDemo = (customUser?: { email: string; name: string; orgName: string; industryType: "Banking" | "FinTech" }) => {
    const sessionToSave = customUser ? {
      ...mockSession,
      user: {
        ...mockUser,
        email: customUser.email,
        user_metadata: {
          name: customUser.name,
          role: "Compliance Officer",
          org_name: customUser.orgName,
          industry_type: customUser.industryType
        }
      }
    } : mockSession;

    localStorage.setItem("mock_user_session", JSON.stringify(sessionToSave));
    
    // Set organization profile state
    const profile = customUser ? {
      isSetup: false,
      orgName: customUser.orgName,
      industryType: customUser.industryType,
      orgSize: "" as any,
      departments: [],
      services: [],
      enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
    } : {
      isSetup: true,
      orgName: "SafeBank India",
      industryType: "Banking" as const,
      orgSize: "Enterprise" as const,
      departments: ["Compliance", "Legal", "IT", "Cybersecurity", "Operations", "Audit", "Risk Management"],
      services: ["Retail Banking", "Corporate Banking", "Internet Banking", "Mobile Banking", "UPI", "Loans", "Credit Cards", "KYC Services"],
      enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
    };
    
    if (customUser || !localStorage.getItem("acris.org_profile")) {
      localStorage.setItem("acris.org_profile", JSON.stringify(profile));
    }

    setSession(sessionToSave);
  };

  const signOut = async () => {
    localStorage.removeItem("mock_user_session");
    localStorage.removeItem("acris.org_profile");
    localStorage.removeItem("acris.registered_name");
    localStorage.removeItem("acris.registered_org");
    localStorage.removeItem("acris.registered_industry");
    await supabase.auth.signOut();
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