import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Lock, User, Eye, EyeOff, Check, Play, Target, Sparkles, ShieldCheck, Puzzle } from "lucide-react";

export default function Auth() {
  const { user, loading, signInDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signin" ? "signin" : "signup";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (email.toLowerCase() === "demo@safebank.com" && password === "demo123") {
        signInDemo();
        navigate("/dashboard");
        return;
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast({ title: "Account created", description: "You're signed in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#0a122c] via-[#060b1b] to-[#03060f] flex flex-col justify-between overflow-x-hidden">

        
        {/* Style block for animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
          @keyframes float-reverse {
            0% { transform: translateY(0px); }
            50% { transform: translateY(8px); }
            100% { transform: translateY(0px); }
          }
          .animate-float {
            animation: float 4s ease-in-out infinite;
          }
          .animate-float-reverse {
            animation: float-reverse 4.5s ease-in-out infinite;
          }
        `}} />

        {/* Main Split Grid */}
        <div className="grid lg:grid-cols-12 gap-8 p-8 lg:p-12 items-center flex-grow">
          
          {/* Left: Brand panel (7 columns) */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-8 lg:space-y-0">
            {/* Top Logo */}
            <div className="flex items-center gap-2.5 relative h-12 w-48">
              <img 
                src="/logo.png" 
                alt="ReguFlow AI Logo" 
                className="absolute left-0 top-[-24px] h-28 w-auto object-contain animate-float z-10" 
                style={{ filter: "drop-shadow(0 0 20px rgba(59,130,246,0.5))" }}
              />
            </div>

            {/* Title & Copy */}
            <div className="space-y-4 max-w-xl">
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.12]">
                Turn regulation into <span className="text-blue-500">action</span>, then proof.
              </h1>
              <p className="text-slate-400 text-[13.5px] leading-relaxed">
                The adaptive compliance copilot for banks. Detect changes, generate MAPs,
                and prove audit readiness — end to end.
              </p>
            </div>

            {/* Isometric Visual Graphic (SVG) */}
            <div className="relative py-4 max-w-md mx-auto lg:mx-0 flex items-center justify-center">
              <svg viewBox="0 0 400 240" className="w-full h-full max-h-[220px]">
                <defs>
                  <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
                
                {/* Ambient Glow */}
                <circle cx="200" cy="120" r="90" fill="url(#radialGlow)" filter="url(#glow)" />
                
                {/* Isometric Grid Base */}
                <g transform="translate(200, 150) scale(1, 0.5)" opacity="0.2">
                  <circle cx="0" cy="0" r="140" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 5" />
                  <circle cx="0" cy="0" r="90" fill="none" stroke="#2563eb" strokeWidth="2" />
                  <circle cx="0" cy="0" r="50" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                  <line x1="-150" y1="0" x2="150" y2="0" stroke="#3b82f6" strokeWidth="1" />
                  <line x1="0" y1="-150" x2="0" y2="150" stroke="#3b82f6" strokeWidth="1" />
                </g>
                
                {/* Pedestal Top */}
                <g transform="translate(200, 150)">
                  <ellipse cx="0" cy="0" rx="40" ry="20" fill="#0f1b3e" stroke="#2563eb" strokeWidth="2" filter="url(#glow)" />
                  <ellipse cx="0" cy="0" rx="30" ry="15" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
                </g>
                
                {/* Floating Shield */}
                <g transform="translate(200, 105)" className="animate-float">
                  <path 
                    d="M-18,-22 L0,-29 L18,-22 L18,0 C18,13 0,25 0,25 C0,25 -18,13 -18,0 Z" 
                    fill="url(#shieldGrad)" 
                    stroke="#60a5fa" 
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                  <path 
                    d="M-7,-2 L-2,3 L8,-7" 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                </g>
                
                {/* Left Badge (Document) */}
                <g transform="translate(90, 95)" className="animate-float-reverse">
                  <circle cx="0" cy="0" r="20" fill="#0b1329" stroke="#3b82f6" strokeWidth="1.5" opacity="0.95" />
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-5,-8 L1,-8 L6,-3 L6,8 L-5,8 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                  <path d="M1,-8 L1,-3 L6,-3" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                  <line x1="-2.5" y1="0.5" x2="3.5" y2="0.5" stroke="#60a5fa" strokeWidth="1.5" />
                  <line x1="-2.5" y1="4.5" x2="3.5" y2="4.5" stroke="#60a5fa" strokeWidth="1.5" />
                </g>
                
                {/* Right Badge (Security) */}
                <g transform="translate(310, 85)" className="animate-float">
                  <circle cx="0" cy="0" r="20" fill="#0b1329" stroke="#3b82f6" strokeWidth="1.5" opacity="0.95" />
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-6,-8 L0,-11 L6,-8 L6,0 C6,4.5 0,10 0,10 C0,10 -6,4.5 -6,0 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                  <path d="M-2.5,0 L-1,1.5 L3.5,-3" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Dotted lines connection */}
                <path d="M110,95 C140,95 150,135 170,145" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <path d="M290,85 C260,85 250,135 230,145" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              </svg>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0f1b3e]/30 border border-slate-800/40 rounded-xl p-3.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-blue-500 font-semibold text-lg">
                  <ShieldCheck className="w-4.5 h-4.5" />
                  <span>98%</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Detection accuracy</span>
              </div>
              <div className="bg-[#0f1b3e]/30 border border-slate-800/40 rounded-xl p-3.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-lg">
                  <Sparkles className="w-4.5 h-4.5" />
                  <span>12x</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Faster impact analysis</span>
              </div>
              <div className="bg-[#0f1b3e]/30 border border-slate-800/40 rounded-xl p-3.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-purple-500 font-semibold text-lg">
                  <Target className="w-4.5 h-4.5" />
                  <span>24h</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Audit ready proof</span>
              </div>
            </div>

            {/* Bank outlines */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Trusted by leading financial institutions worldwide</span>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {/* Bank of America */}
                <div className="flex items-center gap-1.5 text-white/45 hover:text-white/80 transition-colors cursor-default">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
                    <rect x="0" y="0" width="3" height="16" />
                    <rect x="5" y="0" width="6" height="7" />
                    <rect x="5" y="9" width="6" height="7" />
                    <rect x="13" y="0" width="3" height="16" />
                  </svg>
                  <span className="text-xs font-bold tracking-wider">BANK OF AMERICA</span>
                </div>
                {/* Citi */}
                <div className="relative flex items-center text-white/45 hover:text-white/80 transition-colors cursor-default">
                  <span className="text-sm font-extrabold tracking-tight">citi</span>
                  <path d="M-2,2 C4,-1 11,-1 16,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="absolute -top-0.5 left-0 w-full" />
                </div>
                {/* HSBC */}
                <div className="flex items-center gap-1 text-white/45 hover:text-white/80 transition-colors cursor-default">
                  <svg viewBox="0 0 24 12" className="w-6 h-3 fill-current">
                    <polygon points="0,6 4,0 4,12" />
                    <polygon points="8,6 4,0 4,12" fill="none" stroke="currentColor" strokeWidth="1" />
                    <polygon points="8,6 12,0 12,12" />
                    <polygon points="16,6 12,0 12,12" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <span className="text-xs font-bold tracking-tight">HSBC</span>
                </div>
                {/* JPMorgan */}
                <div className="flex items-center gap-1.5 text-white/45 hover:text-white/80 transition-colors cursor-default">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 stroke-current fill-none" strokeWidth="1.5">
                    <polygon points="8,0 16,4 16,12 8,16 0,12 0,4" />
                    <line x1="8" y1="0" x2="8" y2="16" />
                    <line x1="0" y1="8" x2="16" y2="8" />
                  </svg>
                  <span className="text-xs font-bold">JPMorganChase</span>
                </div>
                {/* Wells Fargo */}
                <div className="text-white/45 hover:text-white/80 transition-colors cursor-default text-xs font-extrabold tracking-tight">
                  WELLS FARGO
                </div>
              </div>
            </div>
          </div>

          {/* Right: Floating White Form Card (5 columns) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="bg-white rounded-2xl p-7 lg:p-8 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col justify-between min-h-[460px]">
              <div>
                {/* Top Compliance Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-semibold border border-blue-100">
                  <Lock className="w-3 h-3 text-blue-600" />
                  <span>Secure. Compliant. Enterprise-ready.</span>
                </div>

                {/* Header */}
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-6 tracking-tight">
                  {mode === "signin" ? "Welcome back" : "Create an account"}
                </h2>
                <p className="text-slate-500 text-xs mt-1 font-medium">
                  {mode === "signin"
                    ? "Sign in to continue to ReguFlow AI"
                    : "Start your Regulation → Action → Proof workflow"}
                </p>

                {/* Form */}
                <form onSubmit={submit} className="space-y-4 mt-6">
                  {/* Email */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Email
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jack.turner@finbank.com"
                        className="border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 rounded-lg w-full pl-10 pr-10 py-3 text-xs bg-slate-50/50 text-slate-900 focus:outline-none transition-all"
                      />
                      {isEmailValid && (
                        <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-500 stroke-[3]" />
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Password
                    </label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        required
                        minLength={6}
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 rounded-lg w-full pl-10 pr-10 py-3 text-xs bg-slate-50/50 text-slate-900 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  {mode === "signin" && (
                    <div className="flex items-center justify-between text-xs py-0.5">
                      <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none font-medium">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5"
                        />
                        <span>Remember me</span>
                      </label>
                      <a href="#" className="text-blue-600 hover:underline font-semibold">
                        Forgot password?
                      </a>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    disabled={busy}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative flex py-4 items-center justify-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">Or try quick demo</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* Quick Demo Access */}
                <button
                  type="button"
                  onClick={() => {
                    signInDemo();
                    navigate("/dashboard");
                  }}
                  className="w-full border border-blue-200 hover:border-blue-300 bg-white hover:bg-blue-50/20 text-blue-600 py-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />
                  <span>One-Click Demo Access</span>
                </button>
              </div>

              {/* Toggle Mode */}
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 mt-6 w-full text-center transition-colors"
              >
                {mode === "signin" ? (
                  <>New to ReguFlow AI? <span className="text-blue-600 font-semibold hover:underline">Create an account</span></>
                ) : (
                  <>Already have an account? <span className="text-blue-600 font-semibold hover:underline">Sign in</span></>
                )}
              </button>
            </div>
          </div>
          
        </div>

        {/* Footer Bar (Spans full bottom width) */}
        <div className="w-full bg-slate-950/45 border-t border-slate-800/50 py-5">
          <div className="max-w-7xl mx-auto px-8 lg:px-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <span className="block text-white font-bold text-xs">End-to-End Compliance</span>
                <span className="block text-slate-400 text-[10.5px] mt-0.5 leading-relaxed">From regulatory change detection to audit-ready evidence.</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
                <Sparkles className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <span className="block text-white font-bold text-xs">AI-Powered Insights</span>
                <span className="block text-slate-400 text-[10.5px] mt-0.5 leading-relaxed">LLM + graph intelligence for faster, smarter analysis.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <span className="block text-white font-bold text-xs">Enterprise Security</span>
                <span className="block text-slate-400 text-[10.5px] mt-0.5 leading-relaxed">Bank-grade security with SOC 2, ISO 27001 & GDPR compliance.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
                <Puzzle className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <span className="block text-white font-bold text-xs">Seamless Integrations</span>
                <span className="block text-slate-400 text-[10.5px] mt-0.5 leading-relaxed">Works with your GRC, policy, and risk systems.</span>
              </div>
            </div>
          </div>
        </div>

    </div>
  );
}