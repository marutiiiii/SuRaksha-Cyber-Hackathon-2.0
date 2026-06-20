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

  // New onboarding registration fields
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industryType, setIndustryType] = useState<"Banking" | "FinTech">("Banking");

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
          options: { 
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              name: fullName,
              org_name: orgName,
              industry_type: industryType
            }
          },
        });
        if (error) throw error;

        // Initialize organization profile state in local storage
        const initialProfile = {
          isSetup: false,
          orgName: orgName,
          industryType: industryType,
          orgSize: "",
          departments: [],
          services: [],
          enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"]
        };
        localStorage.setItem("acris.org_profile", JSON.stringify(initialProfile));
        localStorage.setItem("acris.registered_name", fullName);
        localStorage.setItem("acris.registered_org", orgName);
        localStorage.setItem("acris.registered_industry", industryType);

        toast({ title: "Account created", description: "Account created successfully." });
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
    <div className="min-h-screen w-full bg-[#F1F5F9] text-[#0F172A] flex flex-col justify-between font-sans">
      
      {/* Top Navbar */}
      <header className="w-full h-16 bg-[#0F172A] border-b border-slate-800 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40">
        {/* Floating Overlapping Logo container */}
        <div className="relative h-16 w-48 flex items-center">
          <img 
            src="/logo.png" 
            alt="ACRIS Logo" 
            className="absolute left-0 top-[-16px] h-24 w-auto object-contain z-50 pointer-events-auto cursor-pointer"
            onClick={() => navigate("/")}
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/")}
            className="border border-slate-700 text-white bg-transparent hover:bg-slate-800 font-bold text-xs px-4 py-2.5 rounded-none transition-colors uppercase tracking-wider"
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Split Grid */}
      <div className="grid lg:grid-cols-12 gap-12 p-8 lg:p-12 items-center flex-grow max-w-[1400px] mx-auto w-full">
        
        {/* Left: Brand panel (7 columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-8 lg:space-y-6">
          
          {/* Title & Copy */}
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 border-l-2 border-[#1E40AF] pl-3">
              <span className="text-xs font-mono font-bold tracking-widest text-[#1E40AF] uppercase">
                Secure Portal Access
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-none uppercase">
              Turn regulation into <span className="text-[#1E40AF]">action</span>, then proof.
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Access the ACRIS sandbox or log into your financial institution's portal. 
              Upload official circulars, view side-by-side compliance diffs, map departmental roles, and track evidence.
            </p>
          </div>

          {/* Isometric Visual Graphic (SVG) - Styled for light theme background */}
          <div className="relative py-4 max-w-md mx-auto lg:mx-0 flex items-center justify-center bg-white border border-slate-200 p-4 rounded-none shadow-sm">
            <svg viewBox="0 0 400 240" className="w-full h-full max-h-[220px]">
              <defs>
                <radialGradient id="radialGlowLight" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e40af" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="shieldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e40af" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              
              {/* Ambient Glow */}
              <circle cx="200" cy="120" r="90" fill="url(#radialGlowLight)" />
              
              {/* Isometric Grid Base */}
              <g transform="translate(200, 150) scale(1, 0.5)" opacity="0.15">
                <circle cx="0" cy="0" r="140" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="0" cy="0" r="90" fill="none" stroke="#475569" strokeWidth="2" />
                <circle cx="0" cy="0" r="50" fill="none" stroke="#475569" strokeWidth="1.5" />
                <line x1="-150" y1="0" x2="150" y2="0" stroke="#475569" strokeWidth="1" />
                <line x1="0" y1="-150" x2="0" y2="150" stroke="#475569" strokeWidth="1" />
              </g>
              
              {/* Pedestal Top */}
              <g transform="translate(200, 150)">
                <ellipse cx="0" cy="0" rx="40" ry="20" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                <ellipse cx="0" cy="0" rx="30" ry="15" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
              </g>
              
              {/* Shield */}
              <g transform="translate(200, 105)">
                <path 
                  d="M-18,-22 L0,-29 L18,-22 L18,0 C18,13 0,25 0,25 C0,25 -18,13 -18,0 Z" 
                  fill="url(#shieldGradLight)" 
                  stroke="#3b82f6" 
                  strokeWidth="2"
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
              <g transform="translate(90, 95)">
                <circle cx="0" cy="0" r="20" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="16" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M-5,-8 L1,-8 L6,-3 L6,8 L-5,8 Z" fill="none" stroke="#1e40af" strokeWidth="1.5" />
                <path d="M1,-8 L1,-3 L6,-3" fill="none" stroke="#1e40af" strokeWidth="1.5" />
                <line x1="-2.5" y1="0.5" x2="3.5" y2="0.5" stroke="#1e40af" strokeWidth="1.5" />
                <line x1="-2.5" y1="4.5" x2="3.5" y2="4.5" stroke="#1e40af" strokeWidth="1.5" />
              </g>
              
              {/* Right Badge (Security) */}
              <g transform="translate(310, 85)">
                <circle cx="0" cy="0" r="20" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="16" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M-6,-8 L0,-11 L6,-8 L6,0 C6,4.5 0,10 0,10 C0,10 -6,4.5 -6,0 Z" fill="none" stroke="#1e40af" strokeWidth="1.5" />
                <path d="M-2.5,0 L-1,1.5 L3.5,-3" fill="none" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* lines connection */}
              <path d="M110,95 C140,95 150,135 170,145" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M290,85 C260,85 250,135 230,145" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 p-3.5 flex flex-col gap-0.5 rounded-none">
              <div className="flex items-center gap-1.5 text-[#1E40AF] font-bold text-lg">
                <ShieldCheck className="w-5 h-5" />
                <span>98%</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Detection Rate</span>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 flex flex-col gap-0.5 rounded-none">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-lg">
                <Sparkles className="w-5 h-5" />
                <span>12x</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Analysis Speed</span>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 flex flex-col gap-0.5 rounded-none">
              <div className="flex items-center gap-1.5 text-purple-700 font-bold text-lg">
                <Target className="w-5 h-5" />
                <span>24h</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Audit Readiness</span>
            </div>
          </div>

          {/* Bank outlines */}
          <div className="space-y-2.5 pt-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Aligned with global banking compliance requirements</span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 opacity-60 grayscale text-slate-700">
              <span className="text-xs font-extrabold tracking-wider">BANK OF AMERICA</span>
              <span className="text-xs font-extrabold tracking-wider">CITI GROUP</span>
              <span className="text-xs font-extrabold tracking-wider">HSBC</span>
              <span className="text-xs font-extrabold tracking-wider">JPMORGAN CHASE</span>
            </div>
          </div>
        </div>

        {/* Right: Floating White Form Card (5 columns) */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="bg-white border border-slate-200 p-7 lg:p-8 w-full max-w-md shadow-sm flex flex-col justify-between min-h-[460px] rounded-none">
            <div>
              {/* Top Compliance Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-none text-[11px] font-bold border border-blue-100">
                <Lock className="w-3 h-3 text-[#1E40AF]" />
                <span>Secure. Compliant. Enterprise-ready.</span>
              </div>

              {/* Header */}
              <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 mt-6 tracking-tight uppercase">
                {mode === "signin" ? "Portal Sign In" : "Register Account"}
              </h2>
              <p className="text-slate-500 text-xs mt-1 font-medium">
                {mode === "signin"
                  ? "Sign in to continue to your ACRIS dashboard"
                  : "Start your Regulation → Action → Proof workflow"}
              </p>

              {/* Form */}
              <form onSubmit={submit} className="space-y-4 mt-6">
                {mode === "signup" && (
                  <>
                    {/* Full Name */}
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Full Name
                      </label>
                      <input
                        required
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Aarav Mehta"
                        className="border border-slate-300 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none w-full px-3 py-2.5 text-xs bg-slate-50 text-slate-900 font-medium transition-all"
                      />
                    </div>

                    {/* Organization Name */}
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Organization Name
                      </label>
                      <input
                        required
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="SafeBank India"
                        className="border border-slate-300 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none w-full px-3 py-2.5 text-xs bg-slate-50 text-slate-900 font-medium transition-all"
                      />
                    </div>

                    {/* Industry Type */}
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Industry Type
                      </label>
                      <select
                        value={industryType}
                        onChange={(e) => setIndustryType(e.target.value as any)}
                        className="border border-slate-300 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none w-full px-3 py-2.5 text-xs bg-slate-50 text-slate-900 font-medium transition-all"
                      >
                        <option value="Banking">Banking</option>
                        <option value="FinTech">FinTech</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Email */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jack.turner@finbank.com"
                      className="border border-slate-300 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 text-slate-900 font-medium transition-all"
                    />
                    {isEmailValid && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 stroke-[3]" />
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      minLength={6}
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="border border-slate-300 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 text-slate-900 font-medium transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                {mode === "signin" && (
                  <div className="flex items-center justify-between text-xs py-0.5 font-medium">
                    <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded-none border-slate-300 text-[#1E40AF] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="#" onClick={(e) => { e.preventDefault(); alert("Please contact bank IT administrator to reset password."); }} className="text-[#1E40AF] hover:underline font-bold">
                      Forgot password?
                    </a>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  disabled={busy}
                  className="w-full bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-[#1A368F] text-white py-3 text-xs font-bold rounded-none uppercase tracking-wider shadow-sm transition-all disabled:opacity-60"
                >
                  {busy ? "Authenticating..." : mode === "signin" ? "Sign In" : "Register"}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex py-4 items-center justify-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">Or Access Demo</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Quick Demo Access */}
              <button
                type="button"
                onClick={() => {
                  signInDemo();
                  navigate("/dashboard");
                }}
                className="w-full border border-blue-200 hover:border-blue-300 bg-white hover:bg-blue-50/20 text-[#1E40AF] py-3 text-xs font-bold rounded-none transition-all flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider"
              >
                <Play className="w-3.5 h-3.5 text-[#1E40AF] fill-current" />
                <span>One-Click Demo Sandbox</span>
              </button>
            </div>

            {/* Toggle Mode */}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 mt-6 w-full text-center transition-colors"
            >
              {mode === "signin" ? (
                <>New to ACRIS? <span className="text-[#1E40AF] font-bold hover:underline">Create an account</span></>
              ) : (
                <>Already have an account? <span className="text-[#1E40AF] font-bold hover:underline">Sign in</span></>
              )}
            </button>
          </div>
        </div>
        
      </div>

      {/* Footer Bar (Spans full bottom width) */}
      <div className="w-full bg-[#0F172A] border-t border-slate-800 py-6 text-slate-400">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-none bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span className="block text-white font-bold text-xs uppercase tracking-wider">End-to-End Compliance</span>
              <span className="block text-slate-400 text-[10px] mt-0.5 leading-relaxed font-medium">Traceable workflow steps from circular ingestion to audit readiness.</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-none bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
              <Sparkles className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span className="block text-white font-bold text-xs uppercase tracking-wider">AI-Powered Insights</span>
              <span className="block text-slate-400 text-[10px] mt-0.5 leading-relaxed font-medium">LLM-assisted explanations and automated task suggestion.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-none bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span className="block text-white font-bold text-xs uppercase tracking-wider">Enterprise Security</span>
              <span className="block text-slate-400 text-[10px] mt-0.5 leading-relaxed font-medium">Impenetrable data isolation, RBAC logging, and secure db storage.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-none bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/20">
              <Puzzle className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span className="block text-white font-bold text-xs uppercase tracking-wider">Seamless Integration</span>
              <span className="block text-slate-400 text-[10px] mt-0.5 leading-relaxed font-medium">Maps directly to core bank departments and policy databases.</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}