import { AnyObject } from "@/types";
import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Lock, User, Eye, EyeOff, Check, Target, Sparkles, ShieldCheck, Puzzle } from "lucide-react";
import Logo from "@/components/shared/Logo";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

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

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industryType, setIndustryType] = useState<"Banking" | "FinTech">("Banking");
  const [userType, setUserType] = useState<"admin" | "department_officer">("admin");
  const [department, setDepartment] = useState("Compliance");
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<{ id: string; name: string; industry: string }[]>([]);

  useEffect(() => {
    if (mode === "signup") {
      fetch(`${BACKEND_URL}/auth/organizations`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setOrganizations(data);
            if (data.length > 0) {
              setOrganizationId(data[0].id);
            }
          }
        })
        .catch((err) => console.error("Error fetching organizations:", err));
    }
  }, [mode]);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {

      if (mode === "signup") {
        // ── Try backend registration ───────────────────────────────────────
        let backendSuccess = false;
        let toastMsg = "Your account has been saved to the database. Please sign in.";
        try {
          const res = await fetch(`${BACKEND_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: fullName,
              email: email.toLowerCase(),
              password,
              org_name: userType === "admin" ? orgName : undefined,
              industry_type: userType === "admin" ? industryType : undefined,
              user_type: userType,
              department: userType === "department_officer" ? department : undefined,
              organization_id: userType === "department_officer" ? organizationId : undefined,
            }),
          });
          if (res.ok) {
            backendSuccess = true;
            if (userType === "department_officer") {
              toastMsg = "Registration submitted. Awaiting approval from your organization admin.";
            }
          } else {
            const err = await res.json();
            throw new Error(err.detail || "Registration failed.");
          }
        } catch (fetchErr: AnyObject) {
          if (fetchErr.message?.includes("failed") || fetchErr.message?.includes("exists") || fetchErr.message?.includes("required") || fetchErr.message?.includes("Invalid")) throw fetchErr;
          console.warn("Backend register unavailable, using local fallback:", fetchErr.message);
        }

        // Always save local credentials as fallback
        const credentials = { email: email.toLowerCase(), password, fullName, orgName, industryType, userType, department };
        localStorage.setItem(`acris.user_cred.${email.toLowerCase()}`, JSON.stringify(credentials));

        // Initialize org profile state
        const initialProfile = {
          isSetup: false,
          orgName,
          industryType,
          orgSize: "",
          departments: [],
          services: [],
          enabledSources: ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
        };
        localStorage.setItem("acris.org_profile", JSON.stringify(initialProfile));
        localStorage.setItem("acris.registered_name", fullName);
        localStorage.setItem("acris.registered_org", orgName);
        localStorage.setItem("acris.registered_industry", industryType);

        toast({
          title: userType === "admin" ? "Account created" : "Registration Submitted",
          description: backendSuccess
            ? toastMsg
            : "Account registered locally. Please sign in to continue.",
        });
        setMode("signin");
        setBusy(false);
        return;

      } else {
        // ── Try backend login ──────────────────────────────────────────────
        let backendLoggedIn = false;
        try {
          const res = await fetch(`${BACKEND_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.toLowerCase(), password }),
          });
          if (res.ok) {
            const data = await res.json();
            const userData = data.user;
            // Persist backend user data in localStorage so org profile context picks it up
            if (userData?.organization) {
              const org = userData.organization;
              const profile = {
                isSetup: org.is_setup_complete,
                orgName: org.name,
                industryType: org.industry || "Banking",
                orgSize: org.org_size || "",
                departments: org.departments || [],
                services: org.services || [],
                enabledSources: org.enabled_sources || ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
              };
              localStorage.setItem("acris.org_profile", JSON.stringify(profile));
            }
            // Save user_id for org-setup endpoint calls later
            if (userData?.id) {
              localStorage.setItem("acris.db_user_id", userData.id);
            }
            signInDemo({
              id: userData?.id,
              token: data.access_token,
              email: userData?.email || email,
              name: userData?.full_name || fullName,
              orgName: userData?.organization?.name || orgName,
              industryType: (userData?.organization?.industry as "Banking" | "FinTech") || "Banking",
              userType: userData?.user_type,
              department: userData?.department,
              status: userData?.status,
              role: userData?.role_name,
            });
            backendLoggedIn = true;
          } else {
            const err = await res.json();
            throw new Error(err.detail || "Invalid credentials.");
          }
        } catch (fetchErr: AnyObject) {
          if (fetchErr.message?.includes("credentials") || fetchErr.message?.includes("inactive") || fetchErr.message?.includes("blocked")) throw fetchErr;
          console.warn("Backend login unavailable, using local fallback.");
        }

        if (!backendLoggedIn) {
          // ── Local credentials fallback ────────────────────────────────────
          const savedCredStr = localStorage.getItem(`acris.user_cred.${email.toLowerCase()}`);
          if (savedCredStr) {
            const savedCred = JSON.parse(savedCredStr);
            if (savedCred.password === password) {
              signInDemo({
                token: `mock-access-token:${email.toLowerCase()}`,
                email: savedCred.email,
                name: savedCred.fullName,
                orgName: savedCred.orgName,
                industryType: savedCred.industryType,
                userType: savedCred.userType || "admin",
                department: savedCred.department || "",
                status: "Active",
              });
            } else {
              throw new Error("Invalid email or password.");
            }
          } else {
            throw new Error("Invalid email or password. If you just registered, please try again.");
          }
        }

        navigate("/dashboard");
      }
    } catch (err: AnyObject) {
      toast({ title: "Auth error", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between font-sans transition-colors duration-300">
      
      {/* Top Navbar */}
      <header className="w-full h-16 bg-card border-b border-border px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center">
          <Logo theme="default" size="md" />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/")}
            className="border border-border text-foreground bg-transparent hover:bg-muted font-bold text-xs px-4 py-2.5 rounded-lg transition-colors uppercase tracking-wider shadow-sm"
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
            <div className="inline-flex items-center gap-2 border-l-2 border-primary pl-3">
              <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
                Secure Portal Access
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight leading-none uppercase">
              Turn regulation into <span className="text-primary">action</span>, then proof.
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              Log into your financial institution's portal. 
              Upload official circulars, view side-by-side compliance diffs, map departmental roles, and track evidence.
            </p>
          </div>

          {/* Isometric Visual Graphic (SVG) */}
          <div className="relative py-4 max-w-md mx-auto lg:mx-0 flex items-center justify-center bg-card border border-border p-4 rounded-xl shadow-sm">
            <svg viewBox="0 0 400 240" className="w-full h-full max-h-[220px]">
              <defs>
                <radialGradient id="radialGlowLight" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="shieldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary)/0.8)" />
                </linearGradient>
              </defs>
              
              <circle cx="200" cy="120" r="90" fill="url(#radialGlowLight)" />
              
              <g transform="translate(200, 150) scale(1, 0.5)" opacity="0.15">
                <circle cx="0" cy="0" r="140" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" />
                <circle cx="0" cy="0" r="90" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="0" cy="0" r="50" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <line x1="-150" y1="0" x2="150" y2="0" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="-150" x2="0" y2="150" stroke="currentColor" strokeWidth="1" />
              </g>
              
              <g transform="translate(200, 150)">
                <ellipse cx="0" cy="0" rx="40" ry="20" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="2" opacity="0.8" />
                <ellipse cx="0" cy="0" rx="30" ry="15" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              </g>
              
              <g transform="translate(200, 105)">
                <path 
                  d="M-18,-22 L0,-29 L18,-22 L18,0 C18,13 0,25 0,25 C0,25 -18,13 -18,0 Z" 
                  fill="url(#shieldGradLight)" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className="text-primary"
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
              
              <g transform="translate(90, 95)">
                <circle cx="0" cy="0" r="20" fill="hsl(var(--card))" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
                <circle cx="0" cy="0" r="16" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                <path d="M-5,-8 L1,-8 L6,-3 L6,8 L-5,8 Z" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                <path d="M1,-8 L1,-3 L6,-3" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                <line x1="-2.5" y1="0.5" x2="3.5" y2="0.5" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                <line x1="-2.5" y1="4.5" x2="3.5" y2="4.5" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              </g>
              
              <g transform="translate(310, 85)">
                <circle cx="0" cy="0" r="20" fill="hsl(var(--card))" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
                <circle cx="0" cy="0" r="16" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                <path d="M-6,-8 L0,-11 L6,-8 L6,0 C6,4.5 0,10 0,10 C0,10 -6,4.5 -6,0 Z" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                <path d="M-2.5,0 L-1,1.5 L3.5,-3" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              <path d="M110,95 C140,95 150,135 170,145" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <path d="M290,85 C260,85 250,135 230,145" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            </svg>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border p-3.5 flex flex-col gap-1 rounded-xl">
              <div className="flex items-center gap-1.5 text-primary font-bold text-lg">
                <ShieldCheck className="w-5 h-5" />
                <span>98%</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Detection Rate</span>
            </div>
            <div className="bg-card border border-border p-3.5 flex flex-col gap-1 rounded-xl">
              <div className="flex items-center gap-1.5 text-success font-bold text-lg">
                <Sparkles className="w-5 h-5" />
                <span>12x</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Analysis Speed</span>
            </div>
            <div className="bg-card border border-border p-3.5 flex flex-col gap-1 rounded-xl">
              <div className="flex items-center gap-1.5 text-primary/80 font-bold text-lg">
                <Target className="w-5 h-5" />
                <span>24h</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Audit Readiness</span>
            </div>
          </div>

          {/* Bank outlines */}
          <div className="space-y-2.5 pt-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Aligned with global banking compliance requirements</span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 opacity-60 grayscale text-foreground">
              <span className="text-xs font-extrabold tracking-wider">BANK OF AMERICA</span>
              <span className="text-xs font-extrabold tracking-wider">CITI GROUP</span>
              <span className="text-xs font-extrabold tracking-wider">HSBC</span>
              <span className="text-xs font-extrabold tracking-wider">JPMORGAN CHASE</span>
            </div>
          </div>
        </div>

        {/* Right: Floating Card (5 columns) */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="glass-card bg-card/60 border border-border p-7 lg:p-8 w-full max-w-md shadow-lg flex flex-col justify-between min-h-[460px] rounded-2xl">
            <div>
              {/* Top Compliance Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/5 text-primary rounded-lg text-[11px] font-bold border border-primary/20">
                <Lock className="w-3 h-3" />
                <span>Secure. Compliant. Enterprise-ready.</span>
              </div>

              {/* Header */}
              <h2 className="text-xl lg:text-2xl font-extrabold text-foreground mt-6 tracking-tight uppercase">
                {mode === "signin" ? "Portal Sign In" : "Register Account"}
              </h2>
              <p className="text-muted-foreground text-xs mt-1 font-medium">
                {mode === "signin"
                  ? "Sign in to continue to your ACRIS dashboard"
                  : "Start your Regulation → Action → Proof workflow"}
              </p>

              {/* Form */}
              <form onSubmit={submit} className="space-y-4 mt-6">
                {mode === "signup" && (
                  <>
                    {/* Portal Role */}
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Portal Role
                      </label>
                      <select
                        value={userType}
                        onChange={(e) => setUserType(e.target.value as AnyObject)}
                        className="premium-select"
                      >
                        <option value="admin">AI Compliance Officer (Admin)</option>
                        <option value="department_officer">Department Officer</option>
                      </select>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Full Name
                      </label>
                      <input
                        required
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Aarav Mehta"
                        className="premium-input"
                      />
                    </div>

                    {userType === "admin" ? (
                      <>
                        {/* Organization Name */}
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Organization Name
                          </label>
                          <input
                            required
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="SafeBank India"
                            className="premium-input"
                          />
                        </div>

                        {/* Industry Type */}
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Industry Type
                          </label>
                          <select
                            value={industryType}
                            onChange={(e) => setIndustryType(e.target.value as AnyObject)}
                            className="premium-select"
                          >
                            <option value="Banking">Banking</option>
                            <option value="FinTech">FinTech</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Organization */}
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Organization
                          </label>
                          <select
                            value={organizationId}
                            onChange={(e) => setOrganizationId(e.target.value)}
                            className="premium-select"
                            required
                          >
                            {organizations.map((org) => (
                              <option key={org.id} value={org.id}>
                                {org.name} ({org.industry})
                              </option>
                            ))}
                            {organizations.length === 0 && (
                              <option value="">No organizations available</option>
                            )}
                          </select>
                        </div>

                        {/* Department */}
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Department
                          </label>
                          <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="premium-select"
                            required
                          >
                            <option value="Compliance">Compliance</option>
                            <option value="Legal">Legal</option>
                            <option value="IT">IT</option>
                            <option value="Cybersecurity">Cybersecurity</option>
                            <option value="Operations">Operations</option>
                            <option value="Audit">Audit</option>
                            <option value="Risk Management">Risk Management</option>
                            <option value="HR">HR</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Email */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jack.turner@finbank.com"
                      className="premium-input pl-9 pr-9 focus:outline-none"
                    />
                    {isEmailValid && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success stroke-[3]" />
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <input
                      required
                      minLength={6}
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="premium-input pl-9 pr-9 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                {mode === "signin" && (
                  <div className="flex items-center justify-between text-xs py-0.5 font-medium">
                    <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-0 focus:outline-none w-3.5 h-3.5 bg-card"
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="#" onClick={(e) => { e.preventDefault(); alert("Please contact bank IT administrator to reset password."); }} className="text-primary hover:underline font-bold">
                      Forgot password?
                    </a>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  disabled={busy}
                  className="w-full bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] py-3 text-xs font-bold rounded-lg uppercase tracking-wider shadow-sm transition-all disabled:opacity-60"
                >
                  {busy ? "Authenticating..." : mode === "signin" ? "Sign In" : "Register"}
                </button>
              </form>


            </div>

            {/* Toggle Mode */}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground mt-6 w-full text-center transition-colors"
            >
              {mode === "signin" ? (
                <>New to ACRIS? <span className="text-primary font-bold hover:underline">Create an account</span></>
              ) : (
                <>Already have an account? <span className="text-primary font-bold hover:underline">Sign in</span></>
              )}
            </button>
          </div>
        </div>
        
      </div>

      {/* Footer Bar */}
      <div className="w-full bg-card border-t border-border py-6 text-muted-foreground">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="block text-foreground font-bold text-xs uppercase tracking-wider">End-to-End Compliance</span>
              <span className="block text-muted-foreground text-[10px] mt-0.5 leading-relaxed font-medium">Traceable workflow steps from circular ingestion to audit readiness.</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="block text-foreground font-bold text-xs uppercase tracking-wider">AI-Powered Insights</span>
              <span className="block text-muted-foreground text-[10px] mt-0.5 leading-relaxed font-medium">LLM-assisted explanations and automated task suggestion.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="block text-foreground font-bold text-xs uppercase tracking-wider">Enterprise Security</span>
              <span className="block text-muted-foreground text-[10px] mt-0.5 leading-relaxed font-medium">Impenetrable data isolation, RBAC logging, and secure db storage.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20">
              <Puzzle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="block text-foreground font-bold text-xs uppercase tracking-wider">Seamless Integration</span>
              <span className="block text-muted-foreground text-[10px] mt-0.5 leading-relaxed font-medium">Maps directly to core bank departments and policy databases.</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}