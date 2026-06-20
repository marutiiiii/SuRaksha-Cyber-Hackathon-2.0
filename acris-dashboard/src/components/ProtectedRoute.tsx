import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrgProfile } from "@/state/OrgProfileContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { orgProfile } = useOrgProfile();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  // If logged in, but organization setup is not complete, redirect to /setup
  if (!orgProfile.isSetup && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  // If organization setup is complete, and trying to access /setup, redirect to /dashboard
  if (orgProfile.isSetup && location.pathname === "/setup") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}