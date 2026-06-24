import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrgProfile } from "@/state/OrgProfileContext";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, session } = useAuth();
  const { orgProfile } = useOrgProfile();
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(true);
  const [currentStatus, setCurrentStatus] = useState("Active");

  useEffect(() => {
    if (!user) {
      setRefreshing(false);
      return;
    }
    
    fetch(`${BACKEND_URL}/auth/profile/${user.id}`, {
      headers: {
        Authorization: `Bearer ${session?.access_token || "mock-access-token"}`,
      },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch profile");
      })
      .then((data) => {
        if (data && data.status) {
          setCurrentStatus(data.status);
          const mockUserStr = localStorage.getItem("mock_user_session");
          if (mockUserStr) {
            try {
              const parsed = JSON.parse(mockUserStr);
              if (parsed.user && parsed.user.user_metadata) {
                parsed.user.user_metadata.status = data.status;
                parsed.user.user_metadata.user_type = data.user_type;
                parsed.user.user_metadata.department = data.department;
                parsed.user.user_metadata.role = data.role_name;
                localStorage.setItem("mock_user_session", JSON.stringify(parsed));
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
        setRefreshing(false);
      })
      .catch((err) => {
        console.error("Error refreshing status:", err);
        setCurrentStatus(user?.user_metadata?.status || "Active");
        setRefreshing(false);
      });
  }, [user, session]);

  if (loading || refreshing) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  if (currentStatus === "Pending Approval" || currentStatus === "Blocked") {
    return <Navigate to="/pending-approval" replace />;
  }

  const userType = user?.user_metadata?.user_type || "admin";
  if (userType === "admin" && !orgProfile.isSetup && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  if (orgProfile.isSetup && location.pathname === "/setup") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}