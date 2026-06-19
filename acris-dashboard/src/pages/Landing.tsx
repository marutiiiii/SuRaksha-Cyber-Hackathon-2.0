import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { ShieldCheck, ArrowRight, BrainCircuit, GitCompareArrows, Target, KanbanSquare, CheckSquare, FileText } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth?mode=signup");
    }
  };

  const features = [
    {
      icon: BrainCircuit,
      title: "AI Clause Extraction",
      desc: "Upload regulatory documents (PDF/DOCX) and automatically extract obligation details, departments, and risk severities using Gemini.",
      color: "text-cyan-400",
      bg: "rgba(34,211,238,0.06)",
      border: "rgba(34,211,238,0.15)"
    },
    {
      icon: GitCompareArrows,
      title: "Granular Change Detection",
      desc: "Perform side-by-side comparisons of different regulation versions and highlight added, modified, or removed clauses instantly.",
      color: "text-amber-400",
      bg: "rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.15)"
    },
    {
      icon: Target,
      title: "Dynamic Impact Matrix",
      desc: "Automatically map regulatory obligations to standard bank departments (Compliance, Legal, Operations, IT, Cybersecurity, Audit).",
      color: "text-rose-400",
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.15)"
    },
    {
      icon: KanbanSquare,
      title: "Sequential MAP Tasks",
      desc: "Convert regulatory changes into actionable tasks (MAPs), track ownership, and enforce strict, audited progression lifecycles.",
      color: "text-emerald-400",
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.15)"
    },
    {
      icon: CheckSquare,
      title: "Audit Readiness Score",
      desc: "Monitor real-time compliance readiness using mathematically weighted task completion formulas and audit findings mapping.",
      color: "text-blue-400",
      bg: "rgba(59,130,246,0.06)",
      border: "rgba(59,130,246,0.15)"
    },
    {
      icon: FileText,
      title: "Executive Reports",
      desc: "Compile regulatory compliance results, departmental risk matrices, and task logs into formal, auditable PDF reports at one click.",
      color: "text-purple-400",
      bg: "rgba(139,92,246,0.06)",
      border: "rgba(139,92,246,0.15)"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#050816] text-[#F8FAFC] flex flex-col overflow-x-hidden font-sans relative">
      
      {/* Background Volumetric Lighting Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

      {/* Styles for animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-logo-landing {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }
        .animate-logo {
          animation: float-logo-landing 4s ease-in-out infinite;
          filter: drop-shadow(0 0 16px rgba(59,130,246,0.35));
        }
      `}} />

      {/* Header / Navbar */}
      <header className="w-full h-14 px-8 flex items-center justify-between border-b border-slate-900 bg-slate-950/40 backdrop-blur-md z-30 sticky top-0">
        <div className="flex items-center gap-3 relative h-14 w-48">
          <img src="/logo.png" alt="ReguFlow AI" className="absolute left-0 top-[-20px] h-24 w-auto object-contain animate-logo z-10" />
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => user ? navigate("/dashboard") : navigate("/auth?mode=signin")}
            className="px-5 py-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900/60 font-semibold text-xs transition-all duration-300"
          >
            {user ? "Dashboard" : "Sign In"}
          </button>
          <button 
            onClick={handleCTA}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all duration-300"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 lg:py-32 z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 font-semibold text-xs tracking-wide mb-6 uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Regulation-to-Action Compliance Operations Platform</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
          Turn Banking Regulation Into <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Action</span>, Then Proof.
        </h1>
        
        <p className="text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed mb-10">
          The adaptive AI-powered compliance engine engineered specifically for banks and financial institutions.
          Detect circular changes, automate departmental impact analysis, assign actionable tasks, and verify audit-readiness — all in a single interface.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <button 
            onClick={handleCTA}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:from-blue-800 active:to-cyan-800 text-white font-bold text-sm shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all duration-300 group"
          >
            <span>Access Compliance Dashboard</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          {!user && (
            <button 
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 bg-slate-950/20 hover:bg-slate-900/40 text-slate-300 hover:text-white font-bold text-sm transition-all duration-300"
            >
              Create Account
            </button>
          )}
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="w-full border-t border-slate-900/60 bg-slate-950/15 py-24 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Capabilities Built for Regulated Banking Operations</h2>
            <p className="text-slate-400 text-sm">
              ReguFlow AI covers the entire lifecycle of a regulatory circular, ensuring seamless workflow audits from day one.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg flex flex-col gap-4"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  borderColor: "rgba(255, 255, 255, 0.05)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = feat.border;
                  e.currentTarget.style.background = feat.bg;
                  e.currentTarget.style.boxShadow = `0 10px 30px ${feat.bg}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                }}
              >
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${feat.color}`}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{feat.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Footer Bar */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/60 py-8 text-center text-xs text-slate-500 z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} ReguFlow AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Enterprise Security</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
