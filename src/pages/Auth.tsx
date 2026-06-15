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
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-background">
      {/* Ambient animated background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 animate-gradient opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 30%, hsl(var(--primary) / 0.25), transparent 60%), radial-gradient(50% 50% at 80% 70%, hsl(var(--info) / 0.20), transparent 60%), radial-gradient(40% 40% at 60% 20%, hsl(var(--accent) / 0.35), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center perspective-1200">
        {/* Brand panel */}
        <div className="hidden lg:block animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6">
            <Logo />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Turn regulation into <span className="text-primary">action</span>, then proof.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            The adaptive compliance copilot for banks. Detect changes, generate MAPs,
            and prove audit readiness — end to end.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            {[
              { k: "98%", v: "Detection accuracy" },
              { k: "12×", v: "Faster impact analysis" },
              { k: "24h", v: "Audit-ready proof" },
            ].map((s, i) => (
              <div
                key={s.v}
                className="border border-border bg-card/70 backdrop-blur rounded-md p-3 animate-fade-in-up"
                style={{ animationDelay: `${120 + i * 80}ms` }}
              >
                <div className="text-xl font-semibold text-primary">{s.k}</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Auth card with 3D effect */}
        <div className="relative animate-scale-in">
          {/* Glow */}
          <div
            aria-hidden
            className="absolute -inset-px rounded-xl blur-2xl opacity-60 animate-float"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.35), hsl(var(--info) / 0.25), hsl(var(--accent) / 0.35))",
            }}
          />
          <div className="card-3d relative w-full max-w-md mx-auto bg-card/95 backdrop-blur border border-border rounded-xl p-7 shadow-xl">
            <div className="flex items-center gap-2 mb-5 lg:hidden">
              <Logo />
            </div>
            <div className="text-xl font-semibold mb-1 tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </div>
            <div className="text-xs text-muted-foreground mb-6">
              {mode === "signin"
                ? "Sign in to continue to ReguFlow AI"
                : "Start your Regulation → Action → Proof workflow"}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bank.com"
                  className="focus-ring border border-border rounded-md w-full px-3 py-2.5 text-sm mt-1 bg-background"
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <input
                  required
                  minLength={6}
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="focus-ring border border-border rounded-md w-full px-3 py-2.5 text-sm mt-1 bg-background"
                />
              </div>
              <button
                disabled={busy}
                className="group relative w-full bg-primary text-primary-foreground py-2.5 text-sm font-medium rounded-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 animate-fade-in-up"
                style={{ animationDelay: "180ms" }}
              >
                <span className="relative z-10">
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
              </button>
            </form>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-xs text-muted-foreground hover:text-foreground mt-5 w-full text-center transition-colors"
            >
              {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}