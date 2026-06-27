import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, RefreshCw, LogOut, CheckCircle, Clock } from "lucide-react";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

export default function PendingApproval() {
  const { user, signOut, session } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string>("Pending Approval");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setStatus(user.user_metadata?.status || "Pending Approval");
  }, [user, navigate]);

  const checkStatus = async () => {
    if (!user) return;
    setChecking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/profile/${user.id}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token || "mock-access-token"}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        
        // Sync with session storage
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
          } catch (e) {
            console.error(e);
          }
        }

        if (data.status === "Active") {
          toast({
            title: "Access Granted",
            description: "Your account has been approved. Redirecting to dashboard...",
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Status Checked",
            description: `Your current status is: ${data.status}`,
          });
        }
      } else {
        throw new Error("Failed to verify status");
      }
    } catch (err: unknown) {
      toast({
        title: "Check Failed",
        description: (err as Error).message || "Unable to reach server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isBlocked = status === "Blocked";

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-6 font-sans select-none">
      <div className="glass-card bg-card/60 border border-border p-8 md:p-10 w-full max-w-lg shadow-2xl rounded-2xl flex flex-col items-center text-center space-y-6">
        
        {/* Animated Icon Container */}
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border shadow-inner ${
          isBlocked 
            ? "bg-destructive/10 border-destructive/20 text-destructive animate-pulse" 
            : "bg-primary/10 border-primary/20 text-primary"
        }`}>
          {isBlocked ? (
            <ShieldAlert className="w-10 h-10 stroke-[1.5]" />
          ) : (
            <Clock className="w-10 h-10 stroke-[1.5] animate-spin-slow" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
            {isBlocked ? "Access Restricted" : "Awaiting Approval"}
          </h1>
          <p className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase">
            {isBlocked ? "Security Block Active" : "Account Verification In Progress"}
          </p>
        </div>

        {/* Description */}
        <div className="bg-muted/40 border border-border p-4 rounded-xl text-xs md:text-sm text-muted-foreground leading-relaxed font-medium max-w-sm">
          {isBlocked ? (
            "Your account has been blocked by your organization's AI Compliance Officer. Please contact your internal administrator to resolve this issue."
          ) : (
            "Your registration request has been submitted. An AI Compliance Officer (Admin) from your organization needs to approve your account before you can access the ACRIS workspace."
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-4">
          {!isBlocked && (
            <button
              onClick={checkStatus}
              disabled={checking}
              className="w-full sm:flex-1 bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] py-3 text-xs font-bold rounded-lg uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>{checking ? "Verifying..." : "Check Status"}</span>
            </button>
          )}
          
          <button
            onClick={handleSignOut}
            className="w-full sm:flex-1 border border-border hover:bg-muted bg-card text-foreground py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Meta / Helpful tips */}
        <div className="text-[10px] text-muted-foreground/60 font-medium">
          Logged in as <span className="font-bold text-muted-foreground">{user?.email}</span>
        </div>
      </div>
    </div>
  );
}
