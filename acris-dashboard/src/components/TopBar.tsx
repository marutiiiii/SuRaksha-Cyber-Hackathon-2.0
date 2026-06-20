import { useEffect, useRef, useState } from "react";
import { Bell, Search, ChevronDown, Command, Check, X } from "lucide-react";
import { useCopilot, CopilotMode } from "@/state/CopilotContext";
import { useAuth } from "@/state/AuthContext";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { alerts as mockAlerts } from "@/mocks";
import { api } from "@/lib/api";
import { useOrgProfile } from "@/state/OrgProfileContext";

const MODES: { value: CopilotMode; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Standard" },
  { value: "expert", label: "Expert" },
];

export default function TopBar() {
  const { mode, setMode } = useCopilot();
  const { user } = useAuth();
  const { orgProfile, completeSetup } = useOrgProfile();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Alerts states
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  // Profile states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalOrgName, setModalOrgName] = useState(orgProfile.orgName);
  const [modalIndustry, setModalIndustry] = useState<"Banking" | "FinTech">(orgProfile.industryType);
  const [modalOrgSize, setModalOrgSize] = useState(orgProfile.orgSize);
  const [modalDepts, setModalDepts] = useState<string[]>(orgProfile.departments || []);
  const [modalServices, setModalServices] = useState<string[]>(orgProfile.services || []);

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
    setModalOrgName(orgProfile.orgName);
    setModalIndustry(orgProfile.industryType);
    setModalOrgSize(orgProfile.orgSize);
    setModalDepts(orgProfile.departments || []);
    setModalServices(orgProfile.services || []);
  }, [orgProfile]);

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

  // Load alerts/notifications
  useEffect(() => {
    api.listAlerts()
      .then((res) => {
        if (res && res.length > 0) {
          const mapped = res.map((n: any) => ({
            id: n.id,
            message: n.message,
            title: n.title,
            time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " today",
            severity: n.severity || "Low",
            isRead: n.is_read
          }));
          setAlerts(mapped);
        } else {
          setAlerts(mockAlerts.map(a => ({ ...a, isRead: false })));
        }
      })
      .catch(() => {
        setAlerts(mockAlerts.map(a => ({ ...a, isRead: false })));
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

  const handleSearchFocus = () => {
    setSearchFocused(true);
    if (!isRegulationsPage) {
      toast({
        title: "Global Search",
        description: "Navigate to the Regulations page to use full text search.",
      });
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

  const handleSaveSettings = () => {
    if (!modalOrgName.trim()) {
      toast({ title: "Validation Error", description: "Organization name cannot be empty.", variant: "destructive" });
      return;
    }
    if (modalDepts.length === 0) {
      toast({ title: "Validation Error", description: "Select at least one active department.", variant: "destructive" });
      return;
    }
    if (modalServices.length === 0) {
      toast({ title: "Validation Error", description: "Select at least one product or service.", variant: "destructive" });
      return;
    }

    completeSetup({
      orgName: modalOrgName,
      industryType: modalIndustry,
      orgSize: modalOrgSize || "Medium",
      departments: modalDepts,
      services: modalServices
    });

    toast({ title: "Settings Updated", description: "Organization profile and personalized filters updated successfully." });
    setShowProfileModal(false);
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <>
      <header className="topbar-enterprise flex items-center justify-between px-6 flex-shrink-0">
        {/* Search */}
        <div
          className="flex items-center gap-2.5 px-3 h-9 rounded-lg transition-all duration-300"
          style={{
            width: 320,
            background: searchFocused ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.04)",
            border: searchFocused
              ? "1px solid rgba(59,130,246,0.35)"
              : "1px solid rgba(255,255,255,0.07)",
            boxShadow: searchFocused ? "0 0 20px rgba(59,130,246,0.1)" : "none",
          }}
        >
          <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(148,163,184,0.5)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search regulations, entities..."
            className="border-0 bg-transparent text-sm flex-1 focus:outline-none"
            style={{
              color: "#F8FAFC",
              fontSize: 13,
              caretColor: "#3B82F6",
            }}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={() => setSearchFocused(false)}
          />
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">

          {/* Mode switcher */}
          <div className="flex items-center p-0.5 rounded-lg" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)"
          }}>
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200"
                style={mode === m.value ? {
                  background: "rgba(59,130,246,0.2)",
                  color: "#60A5FA",
                  border: "1px solid rgba(59,130,246,0.3)",
                  boxShadow: "0 0 12px rgba(59,130,246,0.15)"
                } : {
                  color: "rgba(148,163,184,0.6)",
                  border: "1px solid transparent"
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="divider-v h-6" />

          {/* Notifications Icon (Opens Centered Modal) */}
          <button 
            onClick={() => setShowAlerts(true)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.08)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,63,94,0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
            }}
          >
            <Bell className="h-3.5 w-3.5" style={{ color: "rgba(148,163,184,0.7)" }} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white"
                style={{ background: "#F43F5E", boxShadow: "0 0 8px rgba(244,63,94,0.5)" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="divider-v h-6" />

          {/* User Profile Area (Opens Centered Modal Directly) */}
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2.5 pl-1 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                boxShadow: "0 0 16px rgba(59,130,246,0.3)"
              }}>
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold leading-tight max-w-[140px] truncate" style={{ color: "#F8FAFC" }}>{name}</div>
              <div className="text-[11px] leading-tight truncate" style={{ color: "rgba(148,163,184,0.6)" }}>{role}</div>
            </div>
            <ChevronDown className="h-3 w-3 hidden sm:block" style={{ color: "rgba(148,163,184,0.4)" }} />
          </div>
        </div>
      </header>

      {/* Notifications Modal (Centered, Solid Background) */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div 
            className="border border-slate-700 w-full max-w-md p-6 rounded-none shadow-xl relative text-left text-slate-200"
            style={{ backgroundColor: '#1E293B' }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowAlerts(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-xs font-extrabold uppercase text-white tracking-wider flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#60A5FA]" />
                  <span>Alerts & Notifications</span>
                </h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-[#60A5FA] hover:text-[#3b82f6] uppercase tracking-wider transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center font-medium">No active alerts.</div>
                ) : (
                  alerts.map((a) => {
                    const isRead = a.isRead;
                    return (
                      <div 
                        key={a.id}
                        onClick={() => handleToggleAlert(a.id, isRead)}
                        className={`p-2.5 border border-slate-800 cursor-pointer hover:bg-slate-800/40 flex flex-col gap-1 rounded-none transition-all ${
                          isRead ? "opacity-40" : "bg-[#0F172A]"
                        }`}
                        style={{ borderLeft: isRead ? undefined : `3px solid ${a.severity === "High" ? "#EF4444" : a.severity === "Medium" ? "#F59E0B" : "#10B981"}` }}
                      >
                        <div className={`text-xs ${isRead ? "text-slate-400 line-through" : "text-slate-200 font-semibold"}`}>
                          {a.title ? `${a.title} — ${a.message}` : a.message}
                        </div>
                        <div className="text-[9px] text-slate-500 flex items-center justify-between font-bold uppercase tracking-wider mt-1">
                          <span>{a.time}</span>
                          <span className={isRead ? "text-slate-500" : a.severity === "High" ? "text-red-400" : "text-amber-500"}>
                            {isRead ? "Read" : a.severity}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={() => setShowAlerts(false)}
                  className="bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-bold text-xs px-5 py-2 rounded-none uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Settings Modal (Centered, Solid Background) */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div 
            className="border border-slate-700 w-full max-w-lg p-6 rounded-none shadow-xl relative text-left text-slate-200"
            style={{ backgroundColor: '#1E293B' }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowProfileModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-white tracking-wider">Profile & organization Settings</h3>
                <p className="text-slate-400 text-xs font-semibold">Configure organization details and compliance mode preferences.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Personal Section */}
                <div className="space-y-4 border-r border-slate-800/60 pr-6">
                  <span className="block text-xs font-bold text-[#60A5FA] uppercase tracking-wider border-l-2 border-[#1E40AF] pl-2 font-mono">User Details</span>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">Full Name</label>
                    <input 
                      disabled
                      type="text" 
                      value={name}
                      className="w-full border border-slate-800 px-3 py-2 text-xs text-slate-400 bg-slate-900/50 cursor-not-allowed rounded-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">Role / Designation</label>
                    <input 
                      disabled
                      type="text" 
                      value={role}
                      className="w-full border border-slate-800 px-3 py-2 text-xs text-slate-400 bg-slate-900/50 cursor-not-allowed rounded-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">Compliance Mode</label>
                    <div className="flex flex-col gap-1.5">
                      {(["beginner", "intermediate", "expert"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`w-full border px-3 py-1.5 text-left text-xs font-semibold capitalize rounded-none transition-all ${
                            mode === m
                              ? "border-[#1E40AF] bg-[#1E40AF]/20 text-white shadow-sm"
                              : "border-slate-800 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {m} Mode
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Organization Section */}
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                  <span className="block text-xs font-bold text-[#60A5FA] uppercase tracking-wider border-l-2 border-[#1E40AF] pl-2 font-mono">Organization Details</span>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">Organization Name</label>
                    <input 
                      type="text" 
                      value={modalOrgName}
                      onChange={(e) => setModalOrgName(e.target.value)}
                      className="w-full border border-slate-700 px-3 py-2 text-xs text-slate-200 bg-slate-800 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">Industry Type</label>
                    <select 
                      value={modalIndustry}
                      onChange={(e) => setModalIndustry(e.target.value as any)}
                      className="w-full border border-slate-700 px-3 py-2 text-xs text-slate-200 bg-slate-800 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium"
                    >
                      <option value="Banking">Banking</option>
                      <option value="FinTech">FinTech</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">Organization Size</label>
                    <select 
                      value={modalOrgSize}
                      onChange={(e) => setModalOrgSize(e.target.value as any)}
                      className="w-full border border-slate-700 px-3 py-2 text-xs text-slate-200 bg-slate-800 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium"
                    >
                      <option value="Startup">Startup (&lt;50 employees)</option>
                      <option value="Small">Small (50 - 250 employees)</option>
                      <option value="Medium">Medium (250 - 1000 employees)</option>
                      <option value="Enterprise">Enterprise (1000+ employees)</option>
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
                            className={`flex items-center justify-between border px-2 py-1 text-[11px] text-left font-semibold rounded-none transition-all ${
                              isChecked 
                                ? "border-[#1E40AF] bg-[#1E40AF]/20 text-white" 
                                : "border-slate-800 bg-slate-900/50 hover:bg-slate-800/40 text-slate-400"
                            }`}
                          >
                            <span>{dept}</span>
                            {isChecked && <Check className="w-3 h-3 text-[#60A5FA]" />}
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
                            className={`flex items-center justify-between border px-2 py-1 text-[11px] text-left font-semibold rounded-none transition-all ${
                              isChecked 
                                ? "border-[#1E40AF] bg-[#1E40AF]/20 text-white" 
                                : "border-slate-800 bg-slate-900/50 hover:bg-slate-800/40 text-slate-400"
                            }`}
                          >
                            <span className="truncate pr-0.5">{service}</span>
                            {isChecked && <Check className="w-3 h-3 text-[#60A5FA] flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={handleSaveSettings}
                  className="bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-bold text-xs px-6 py-2.5 rounded-none uppercase tracking-wider"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
