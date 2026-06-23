import { useEffect, useRef, useState } from "react";
import { Bell, Search, Command, Check, X, Home, LogOut } from "lucide-react";
import { useCopilot, CopilotMode } from "@/state/CopilotContext";
import { useAuth } from "@/state/AuthContext";
import { useOrgProfile } from "@/state/OrgProfileContext";
import { useLocation, useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const MODES: { value: CopilotMode; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "expert", label: "Expert" },
];

export default function TopBar() {
  const { mode, setMode } = useCopilot();
  const { user, signOut } = useAuth();
  const { orgProfile, completeSetup } = useOrgProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalOrgName, setModalOrgName] = useState("");
  const [modalIndustry, setModalIndustry] = useState<"Banking" | "FinTech">("Banking");
  const [modalOrgSize, setModalOrgSize] = useState<"Startup" | "Small" | "Medium" | "Enterprise">("Medium");
  const [modalDepts, setModalDepts] = useState<string[]>([]);
  const [modalServices, setModalServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const departmentsList = [
    "Compliance",
    "Legal",
    "IT",
    "Cybersecurity",
    "Operations",
    "Audit",
    "Risk Management"
  ];

  const servicesList = [
    "Retail Banking",
    "Corporate Banking",
    "Internet Banking",
    "Mobile Banking",
    "UPI",
    "Loans",
    "Credit Cards",
    "KYC Services"
  ];

  // Sync with context on load / context updates
  useEffect(() => {
    if (orgProfile) {
      setModalOrgName(orgProfile.orgName || "");
      setModalIndustry(orgProfile.industryType || "Banking");
      setModalOrgSize(orgProfile.orgSize || "Medium");
      setModalDepts(orgProfile.departments || []);
      setModalServices(orgProfile.services || []);
    }
  }, [orgProfile]);

  // Alerts states
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const name = user?.user_metadata?.name ?? user?.email ?? "Aarav Mehta";
  const role = user?.user_metadata?.role ?? "Compliance Officer";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word: string) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();

  const isRegulationsPage = location.pathname === "/regulations";

  useEffect(() => {
    if (isRegulationsPage) {
      setSearchValue(searchParams.get("q") || "");
    } else {
      setSearchValue("");
    }
  }, [location.pathname, searchParams, isRegulationsPage]);

  // Load alerts
  useEffect(() => {
    api.listAlerts()
      .then((res) => {
        const mapped = (res || []).map((n: any) => ({
          id: n.id,
          message: n.message,
          title: n.title,
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " today",
          severity: n.severity || "Low",
          isRead: n.is_read
        }));
        setAlerts(mapped);
      })
      .catch(() => {
        setAlerts([]);
      });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    if (isRegulationsPage) {
      if (val) {
        setSearchParams({ q: val });
      } else {
        const params = new URLSearchParams(searchParams);
        params.delete("q");
        setSearchParams(params);
      }
    }
  };

  const handleSearchSubmit = (val: string) => {
    const query = val.trim().toLowerCase();
    if (!query) return;

    const mappings = [
      { keywords: ["dashboard", "overview", "home"], path: "/dashboard" },
      { keywords: ["regulations", "rules", "circulars", "circular", "compliance", "intelligence"], path: "/regulations" },
      { keywords: ["document analysis", "document", "upload", "pdf", "file", "analysis", "doc"], path: "/document-analysis" },
      { keywords: ["change detection", "compare", "changes", "diff", "difference"], path: "/change-detection" },
      { keywords: ["impact analysis", "risk", "impact", "risk matrix", "matrix"], path: "/impact-analysis" },
      { keywords: ["copilot", "ai explanation", "chat", "ai", "explanation", "explain"], path: "/copilot" },
      { keywords: ["maps", "kanban", "map", "actions", "tasks", "task", "map management"], path: "/maps" },
      { keywords: ["audit readiness", "audit", "readiness", "governance"], path: "/audit-readiness" },
      { keywords: ["reports", "export", "report", "download"], path: "/reports" },
      { keywords: ["alerts", "notifications", "alert", "notification"], path: "/alerts" },
      { keywords: ["audit logs", "logs", "log"], path: "/audit-logs" },
      { keywords: ["company profile", "profile", "settings", "organization", "org"], path: "/company-profile" },
    ];

    const match = mappings.find((m) =>
      m.keywords.some((kw) => query.includes(kw) || kw.includes(query))
    );

    if (match) {
      navigate(match.path);
    } else {
      navigate(`/regulations?q=${encodeURIComponent(val.trim())}`);
    }
  };

  const handleToggleAlert = async (id: string, isRead: boolean) => {
    try {
      if (!isRead) {
        await api.markAlertRead(id).catch(() => {});
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
        toast({ title: "Notification read", description: "Marked alert as read." });
      } else {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: false } : a));
      }
    } catch (err) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: !isRead } : a));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = alerts.filter(a => !a.isRead);
      await Promise.all(unread.map(a => api.markAlertRead(a.id).catch(() => {})));
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      toast({ title: "Notifications", description: "All notifications marked as read." });
    } catch (err) {
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    }
  };

  const handleSaveSettings = async () => {
    if (!modalOrgName.trim()) {
      toast({ title: "Validation Error", description: "Organization name cannot be empty.", variant: "destructive" });
      return;
    }
    if (modalDepts.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one department.", variant: "destructive" });
      return;
    }
    if (modalServices.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one product or service.", variant: "destructive" });
      return;
    }

    setSaving(true);
    completeSetup({
      orgName: modalOrgName,
      industryType: modalIndustry,
      orgSize: modalOrgSize,
      departments: modalDepts,
      services: modalServices,
    });

    const dbUserId = localStorage.getItem("acris.db_user_id") || user?.id;
    if (dbUserId) {
      try {
        const sessionStr = localStorage.getItem("mock_user_session");
        let token = "";
        if (sessionStr) {
          try {
            token = JSON.parse(sessionStr)?.access_token || "";
          } catch {}
        }
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/api/v1/auth/org-setup/${dbUserId}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            org_name: modalOrgName,
            org_size: modalOrgSize,
            departments: modalDepts,
            services: modalServices,
            enabled_sources: orgProfile.enabledSources || ["RBI", "NPCI", "FIU-IND", "CERT-In", "MeitY / DPDP"],
            industry: modalIndustry,
          }),
        });
        if (!res.ok) {
          throw new Error("Backend save failed");
        }
        toast({ title: "Settings saved", description: "Your organization settings were updated in the database." });
      } catch (err) {
        console.warn("Could not sync settings to backend:", err);
        toast({ title: "Settings saved locally", description: "Settings saved locally but could not sync to database.", variant: "destructive" });
      }
    } else {
      toast({ title: "Settings saved", description: "Your organization settings were updated locally." });
    }
    setSaving(false);
    setShowProfileModal(false);
  };

  const getBreadcrumbs = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return [{ label: "Home", path: "/dashboard", active: true }];
    return [
      { label: "Home", path: "/dashboard", active: false },
      ...parts.map((p, idx) => {
        const path = "/" + parts.slice(0, idx + 1).join("/");
        const label = p
          .split("-")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return { label, path, active: idx === parts.length - 1 };
      })
    ];
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="topbar-enterprise flex items-center justify-between px-6 flex-shrink-0 relative z-30">
        {/* Left: Global Search & Cmd + K */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2.5 px-3 h-9 rounded-lg transition-all duration-200 border ${
              searchFocused 
                ? "bg-primary/5 border-primary/45 shadow-sm shadow-primary/5" 
                : "bg-muted/50 border-transparent hover:bg-muted"
            }`}
            style={{ width: 280 }}
          >
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search (Ctrl + K)..."
              className="border-0 bg-transparent text-xs flex-1 focus:outline-none text-foreground placeholder-muted-foreground font-medium"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit(searchValue);
                }
              }}
            />
            <kbd className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-background border border-border text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>
        </div>

        {/* Center: Page Context & Breadcrumb Navigation */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          {breadcrumbs.map((b, i) => (
            <div key={b.path} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/45">/</span>}
              {b.active ? (
                <span className="text-foreground font-bold">{b.label}</span>
              ) : (
                <Link to={b.path} className="hover:text-foreground transition-colors flex items-center gap-1">
                  {i === 0 && <Home className="h-3 w-3" />}
                  <span>{b.label}</span>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Right: Actions, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* AI Mode Selector */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-150 ${
                  mode === m.value 
                    ? "bg-background text-primary shadow-sm border border-border" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="divider-v h-6" />

          {/* Notifications button */}
          <button 
            onClick={() => setShowAlerts(true)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted hover:text-rose-500 transition-colors"
          >
            <Bell className="h-4 w-4 text-muted-foreground hover:text-rose-500 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white bg-rose-500 shadow-sm shadow-rose-500/30">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="divider-v h-6" />

          {/* User Block */}
          <div className="flex items-center gap-2.5">
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 cursor-pointer group hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-tr from-primary to-cyan-500 shadow-sm shadow-primary/25">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold leading-tight text-foreground group-hover:text-primary transition-colors">{name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">{role}</div>
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="ml-1 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all border border-transparent hover:border-destructive/20"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Modal (Centered, Premium Solid Layout) */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="border border-border w-full max-w-md p-6 bg-card text-foreground rounded-xl shadow-xl relative text-left">
            <button 
              onClick={() => setShowAlerts(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span>Alerts & Notifications</span>
                </h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center font-medium">No active alerts.</div>
                ) : (
                  alerts.map((a) => {
                    const isRead = a.isRead;
                    return (
                      <div 
                        key={a.id}
                        onClick={() => handleToggleAlert(a.id, isRead)}
                        className={`p-3 border border-border cursor-pointer hover:bg-muted/40 flex flex-col gap-1 rounded-lg transition-all ${
                          isRead ? "opacity-45" : "bg-muted/20"
                        }`}
                        style={{ borderLeft: isRead ? undefined : `3px solid hsl(var(--risk-${a.severity?.toLowerCase() || 'medium'}))` }}
                      >
                        <div className={`text-xs ${isRead ? "text-muted-foreground line-through" : "text-foreground font-semibold"}`}>
                          {a.title ? `${a.title} — ${a.message}` : a.message}
                        </div>
                        <div className="text-[9px] text-muted-foreground flex items-center justify-between font-bold uppercase tracking-wider mt-1">
                          <span>{a.time}</span>
                          <span className={isRead ? "text-muted-foreground" : a.severity === "High" ? "text-rose-500" : "text-amber-500"}>
                            {isRead ? "Read" : a.severity}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button 
                  onClick={() => setShowAlerts(false)}
                  className="bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs px-5 py-2 rounded-lg uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Settings Modal (Centered, Premium Enterprise Theme) */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="border border-border w-full max-w-xl p-6 bg-card text-foreground rounded-xl shadow-xl relative text-left transition-all duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setShowProfileModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-foreground tracking-wider">Profile & Organization Settings</h3>
                <p className="text-muted-foreground text-xs font-semibold mt-0.5">Configure organization details and compliance mode preferences.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 pt-2">
                {/* Personal Section */}
                <div className="space-y-4 border-r border-border/60 pr-6">
                  <span className="block text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-primary pl-2 font-mono">User Details</span>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">Full Name</label>
                    <input 
                      disabled
                      type="text" 
                      value={name}
                      className="w-full border border-border px-3 py-2 text-xs text-muted-foreground bg-muted/30 cursor-not-allowed rounded-lg font-semibold h-10"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">Role / Designation</label>
                    <input 
                      disabled
                      type="text" 
                      value={role}
                      className="w-full border border-border px-3 py-2 text-xs text-muted-foreground bg-muted/30 cursor-not-allowed rounded-lg font-semibold h-10"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-2">Compliance Mode</label>
                    <div className="flex flex-col gap-1.5">
                      {(["beginner", "expert"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`w-full border px-3 py-2 text-left text-xs font-semibold capitalize rounded-lg transition-all ${
                            mode === m
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {m} Mode
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Organization Section */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <span className="block text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-primary pl-2 font-mono">Organization Details</span>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">Organization Name</label>
                    <input 
                      type="text" 
                      value={modalOrgName}
                      onChange={(e) => setModalOrgName(e.target.value)}
                      className="w-full border border-border px-3 py-2 text-xs text-foreground bg-background focus:border-primary focus:ring-0 focus:outline-none rounded-lg font-semibold h-10"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">Industry Type</label>
                    <select 
                      value={modalIndustry}
                      onChange={(e) => setModalIndustry(e.target.value as any)}
                      className="w-full border border-border px-3 py-2 text-xs text-foreground bg-background focus:border-primary focus:ring-0 focus:outline-none rounded-lg font-semibold h-10"
                    >
                      <option value="Banking">Banking (RBI Regulated)</option>
                      <option value="FinTech">FinTech (Financial Services)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">Organization Size</label>
                    <select 
                      value={modalOrgSize}
                      onChange={(e) => setModalOrgSize(e.target.value as any)}
                      className="w-full border border-border px-3 py-2 text-xs text-foreground bg-background focus:border-primary focus:ring-0 focus:outline-none rounded-lg font-semibold h-10"
                    >
                      <option value="Startup">Startup (&lt;50)</option>
                      <option value="Small">Small (50 - 250)</option>
                      <option value="Medium">Medium (250 - 1000)</option>
                      <option value="Enterprise">Enterprise (1000+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">Active Departments</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {departmentsList.map(dept => {
                        const isChecked = modalDepts.includes(dept);
                        return (
                          <button
                            type="button"
                            key={dept}
                            onClick={() => {
                              setModalDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
                            }}
                            className={`flex items-center justify-between border px-2.5 py-1.5 text-[11px] text-left font-bold rounded-lg transition-all ${
                              isChecked 
                                ? "border-primary bg-primary/5 text-foreground" 
                                : "border-border bg-background hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <span>{dept}</span>
                            {isChecked && <Check className="w-3 h-3 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">Products & Services</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {servicesList.map(service => {
                        const isChecked = modalServices.includes(service);
                        return (
                          <button
                            type="button"
                            key={service}
                            onClick={() => {
                              setModalServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]);
                            }}
                            className={`flex items-center justify-between border px-2.5 py-1.5 text-[11px] text-left font-bold rounded-lg transition-all ${
                              isChecked 
                                ? "border-primary bg-primary/5 text-foreground" 
                                : "border-border bg-background hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <span className="truncate pr-0.5">{service}</span>
                            {isChecked && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button 
                  disabled={saving}
                  onClick={handleSaveSettings}
                  className="bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs px-6 py-2.5 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
