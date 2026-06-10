import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import Logo from "@/components/shared/Logo";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({ title: "Account created", description: "You're signed in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate("/");
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm section-container p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Logo />
        </div>
        <div className="text-lg font-semibold mb-1">
          {mode === "signin" ? "Sign in to ReguFlow AI" : "Create your ReguFlow AI account"}
        </div>
        <div className="text-xs text-muted-foreground mb-5">Regulation → Action → Proof</div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-border rounded-md w-full px-3 py-2 text-sm mt-1 bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Password</label>
            <input
              required
              minLength={6}
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-border rounded-md w-full px-3 py-2 text-sm mt-1 bg-background"
            />
          </div>
          <button
            disabled={busy}
            className="w-full bg-primary text-primary-foreground py-2 text-sm font-medium rounded hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs text-muted-foreground hover:text-foreground mt-4 w-full text-center"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}