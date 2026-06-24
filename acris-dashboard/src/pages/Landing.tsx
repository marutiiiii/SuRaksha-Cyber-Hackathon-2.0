import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import Logo from "@/components/shared/Logo";
import { 
  ShieldCheck, 
  ArrowRight, 
  Eye, 
  UploadCloud, 
  GitCompare, 
  AlertTriangle, 
  ListTodo, 
  Brain, 
  FileText, 
  CheckSquare, 
  ClipboardCheck, 
  Check, 
  X, 
  ExternalLink 
} from "lucide-react";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoForm, setDemoForm] = useState({
    fullName: "",
    email: "",
    institution: "",
    jobTitle: "",
    message: ""
  });

  const handleSignIn = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth?mode=signin");
    }
  };

  const handleSignUp = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth?mode=signup");
    }
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/bookings/demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: demoForm.fullName,
          email: demoForm.email,
          institution: demoForm.institution,
          jobTitle: demoForm.jobTitle,
          message: demoForm.message,
        }),
      });

      if (response.ok) {
        setDemoSubmitted(true);
        setTimeout(() => {
          setDemoSubmitted(false);
          setShowDemoModal(false);
          setDemoForm({ fullName: "", email: "", institution: "", jobTitle: "", message: "" });
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || "Failed to submit demo request.");
      }
    } catch (error) {
      console.error("Demo submission error:", error);
      alert("Failed to submit demo request. Please check if the backend is running.");
    }
  };


  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const keyFeatures = [
    {
      icon: Eye,
      title: "Regulatory Monitoring",
      desc: "Centralized real-time tracking of circulars and policy updates directly from RBI, SEBI, NPCI, and CERT-In sources."
    },
    {
      icon: UploadCloud,
      title: "PDF Upload & Analysis",
      desc: "Direct document ingestion engine. Automatically parses complex regulatory texts and segments them into structured, searchable clauses."
    },
    {
      icon: GitCompare,
      title: "Clause-Level Change Detection",
      desc: "Perform automated comparison of document versions. Instantly highlights exact clause additions, deletions, and modifications side-by-side."
    },
    {
      icon: AlertTriangle,
      title: "Impact Analysis",
      desc: "Automated mapping of regulatory mandates to specific bank departments with system-calculated risk scoring and priority levels."
    },
    {
      icon: ListTodo,
      title: "MAP Generation",
      desc: "Derives Measurable Action Points (MAPs) from impact analysis and monitors execution lifecycle from assignment to final audit approval."
    },
    {
      icon: Brain,
      title: "AI Explanations",
      desc: "Contextual explanations of complex legal jargon and compliance obligations tailored specifically to banking operations."
    },
    {
      icon: FileText,
      title: "Compliance Reports",
      desc: "Generate professional, read-only PDF reports detailing compliance posture, risk profiles, and historical action item completion."
    },
    {
      icon: CheckSquare,
      title: "Evidence Validation",
      desc: "Attach policy document PDFs, screenshots, or logs to MAP items. Lock evidence post-completion for immutable compliance proof."
    },
    {
      icon: ClipboardCheck,
      title: "Audit Readiness",
      desc: "Real-time audit scoring calculated through mathematically weighted completion formulas, tracing every task back to its source regulation."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="w-full h-16 bg-[#0F172A] border-b border-slate-800 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center">
          <Logo theme="dark" size="md" />
        </div>

        {/* Center Nav Items */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
          <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors uppercase tracking-wider">Features</button>
          <button onClick={() => scrollToSection("workflow")} className="hover:text-white transition-colors uppercase tracking-wider">How It Works</button>
          <button onClick={() => scrollToSection("comparison")} className="hover:text-white transition-colors uppercase tracking-wider">Solutions & Differentiators</button>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); alert("Documentation is only available to authenticated enterprise accounts."); }}
            className="hover:text-slate-300 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
          >
            <span>Documentation</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSignIn}
            className="border border-slate-700 text-white bg-transparent hover:bg-slate-800 font-bold text-xs px-4 py-2.5 rounded-none transition-colors uppercase tracking-wider"
          >
            {user ? "Dashboard" : "Sign In"}
          </button>
          <button 
            onClick={() => setShowDemoModal(true)}
            className="bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2.5 rounded-none transition-colors uppercase tracking-wider"
          >
            Request Demo
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-16 lg:py-24">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 grid lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 border-l-2 border-[#1E40AF] pl-3">
              <span className="text-xs font-mono font-bold tracking-widest text-[#1E40AF] uppercase">
                Enterprise Regulatory Operations Platform
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-none uppercase">
              Transform Regulatory Change into Actionable Compliance
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              ACRIS (Audit, Compliance and Regulatory Intelligence System) is a centralized, bank-grade operating system. 
              By combining AI intelligence with rigorous, sequential compliance workflows, ACRIS operationalizes regulation, maps departmental impacts, schedules tasks, and verifies immutable audit readiness.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button 
                onClick={() => setShowDemoModal(true)}
                className="w-full sm:w-auto bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-bold text-sm px-8 py-3.5 rounded-none transition-colors uppercase tracking-wider text-center"
              >
                Request Custom Demo
              </button>
              <button 
                onClick={handleSignUp}
                className="w-full sm:w-auto border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-sm px-8 py-3.5 rounded-none transition-colors uppercase tracking-wider text-center"
              >
                Access Platform
              </button>
            </div>

            {/* Trusted Banks Ribbon */}
            <div className="pt-8 border-t border-slate-100 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                Aligned with Global Banking Standards
              </span>
              <div className="flex flex-wrap items-center gap-6 opacity-60 grayscale">
                <span className="text-xs font-extrabold tracking-wider text-slate-700">FEDERAL RESERVE</span>
                <span className="text-xs font-extrabold tracking-wider text-slate-700">RBI REGISTERED</span>
                <span className="text-xs font-extrabold tracking-wider text-slate-700">BASEL III COMPLIANT</span>
                <span className="text-xs font-extrabold tracking-wider text-slate-700">FINRA COMPLIANT</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-6 border border-slate-200 bg-[#F8FAFC] p-6 rounded-none shadow-sm relative">
            <div className="bg-slate-900 text-slate-300 p-2 text-[10px] font-mono flex items-center justify-between border-b border-slate-800">
              <span>ACRIS REGULATORY MONITOR v1.0.0</span>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-none inline-block"></span>
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-none inline-block"></span>
                <span className="w-2.5 h-2.5 bg-green-500 rounded-none inline-block"></span>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200 font-sans space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase">RBI Circular Ingestion Stream</h3>
                  <span className="text-[10px] text-slate-400">Database: Supabase | Connection: Connected</span>
                </div>
                <div className="bg-green-50 border border-green-200 text-green-700 font-mono text-[10px] px-2 py-0.5 font-bold uppercase">
                  Active
                </div>
              </div>

              {/* Simple Table representation of Circulars */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-2 border-r border-slate-200">Source</th>
                      <th className="p-2 border-r border-slate-200">Regulatory Reference</th>
                      <th className="p-2 border-r border-slate-200 font-bold">Severity</th>
                      <th className="p-2 border-r border-slate-200 text-right">Progress</th>
                      <th className="p-2 text-right">Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200 font-bold text-[#1E40AF]">RBI</td>
                      <td className="p-2 border-r border-slate-200 font-medium">Digital Lending Mandate V2.0</td>
                      <td className="p-2 border-r border-slate-200"><span className="bg-red-50 text-red-700 border border-red-200 px-1 py-0.5 text-[9px] font-bold">CRITICAL</span></td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">5/6 MAPs</td>
                      <td className="p-2 text-right font-bold text-yellow-600">83.3%</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-bold text-[#1E40AF]">SEBI</td>
                      <td className="p-2 border-r border-slate-200 font-medium">Cybersecurity Master Circular</td>
                      <td className="p-2 border-r border-slate-200"><span className="bg-orange-50 text-orange-700 border border-orange-200 px-1 py-0.5 text-[9px] font-bold">HIGH</span></td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">11/12 MAPs</td>
                      <td className="p-2 text-right font-bold text-yellow-600">91.6%</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200 font-bold text-[#1E40AF]">NPCI</td>
                      <td className="p-2 border-r border-slate-200 font-medium">UPI Transaction Limits Update</td>
                      <td className="p-2 border-r border-slate-200"><span className="bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 text-[9px] font-bold">MEDIUM</span></td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">4/4 MAPs</td>
                      <td className="p-2 text-right font-bold text-green-700">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* System Stats Block */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="border border-slate-200 p-2.5 bg-slate-50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">System Health</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">SECURE</span>
                </div>
                <div className="border border-slate-200 p-2.5 bg-slate-50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Total MAPs</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">22 Active</span>
                </div>
                <div className="border border-slate-200 p-2.5 bg-slate-50">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Audit Readiness</span>
                  <span className="text-sm font-bold text-[#1E40AF] font-mono">91.6%</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12">
          <div className="max-w-3xl space-y-4 mb-16">
            <span className="text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider">
              Comprehensive Platform Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-slate-900 tracking-tight">
              Built for Institutional Banking Operations
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              Every tool and module is designed to map directly onto existing corporate risk governance workflows, ensuring audit transparency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {keyFeatures.map((feat, index) => (
              <div 
                key={index} 
                className="border border-slate-200 bg-[#F8FAFC] p-6 hover:border-[#1E40AF] transition-colors duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 border border-slate-200 bg-white flex items-center justify-center text-[#1E40AF] mb-4">
                    <feat.icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 mb-2">{feat.title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed font-medium">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works (Workflow Section) */}
      <section id="workflow" className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12">
          <div className="max-w-3xl space-y-4 mb-16">
            <span className="text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider">
              The Regulation-to-Action Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-slate-900 tracking-tight">
              Audit-Proven Compliance Process
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              We replace ad-hoc policies with a structured, step-by-step pipeline that guarantees full task accountability.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase block mb-3">Phase 01 / Ingestion</span>
                <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 mb-2">Ingest & Segment</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                  Upload official regulatory circular PDFs. ACRIS automatically processes the text and segments it into individual clauses.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase block mb-3">Phase 02 / Analysis</span>
                <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 mb-2">Version Comparison</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                  Compare incoming updates side-by-side with older drafts. Track added, removed, or modified clauses with precision.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase block mb-3">Phase 03 / Evaluation</span>
                <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 mb-2">Impact Mapping</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                  Assess regulatory impact across standard banking divisions (IT, Compliance, Security, Audit) and determine priority.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase block mb-3">Phase 04 / Proof</span>
                <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 mb-2">MAP Assignment</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                  Convert impact findings into assigned Measurable Action Points (MAPs). Securely lock evidence to prove compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12">
          <div className="max-w-3xl space-y-4 mb-16">
            <span className="text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider">
              Strategic Advantage
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-slate-900 tracking-tight">
              Traditional Compliance vs ACRIS
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              Understand how ACRIS helps banks move away from manual checklists and towards dynamic, auditable workflows.
            </p>
          </div>

          <div className="border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1E40AF] text-white uppercase tracking-wider">
                  <th className="p-4 font-bold border-r border-slate-300/35">Compliance Category</th>
                  <th className="p-4 font-semibold border-r border-slate-300/35">Traditional Compliance</th>
                  <th className="p-4 font-bold">ACRIS Operations</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-4 font-bold bg-slate-50 border-r border-slate-200">Ingestion & Tracking</td>
                  <td className="p-4 border-r border-slate-200 text-slate-600 font-medium">Manual checks on RBI/SEBI sites; prone to missed notices.</td>
                  <td className="p-4 text-[#1E40AF] font-bold">Centralized ingestion stream with real-time source feeds.</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-4 font-bold bg-slate-50 border-r border-slate-200">Version Comparison</td>
                  <td className="p-4 border-r border-slate-200 text-slate-600 font-medium">Line-by-line manual read of PDFs; slow and error-prone.</td>
                  <td className="p-4 text-[#1E40AF] font-bold">Automated clause-level diffing highlighting exact changes.</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-4 font-bold bg-slate-50 border-r border-slate-200">Impact Assessment</td>
                  <td className="p-4 border-r border-slate-200 text-slate-600 font-medium">Ad-hoc internal emails and highly subjective checklists.</td>
                  <td className="p-4 text-[#1E40AF] font-bold">Traceable department impact mapping with clear risk scores.</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-4 font-bold bg-slate-50 border-r border-slate-200">Task Lifecycle</td>
                  <td className="p-4 border-r border-slate-200 text-slate-600 font-medium">Static shared spreadsheets; no progress verification.</td>
                  <td className="p-4 text-[#1E40AF] font-bold">Sequential MAP tracking (Pending to Completed) with owners.</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-4 font-bold bg-slate-50 border-r border-slate-200">Audit Proof</td>
                  <td className="p-4 border-r border-slate-200 text-slate-600 font-medium">Scattered files gathered manually during audit weeks.</td>
                  <td className="p-4 text-[#1E40AF] font-bold">Real-time readiness scoring with locked, immutable evidence.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl font-extrabold uppercase text-slate-900 tracking-tight">
            Ready to Operationalize Your Compliance Strategy?
          </h2>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto font-medium">
            Schedule a platform review with our compliance consultants, or sign in to your bank's portal to manage active tasks.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => setShowDemoModal(true)}
              className="w-full sm:w-auto bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-bold text-sm px-8 py-3.5 rounded-none transition-colors uppercase tracking-wider"
            >
              Request Custom Demo
            </button>
            <button 
              onClick={handleSignIn}
              className="w-full sm:w-auto border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-sm px-8 py-3.5 rounded-none transition-colors uppercase tracking-wider"
            >
              Portal Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="w-full bg-[#0F172A] text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product Suite</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">Regulatory Monitor</button></li>
              <li><button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">Change Diff Workspace</button></li>
              <li><button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">MAP Engine</button></li>
              <li><button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">Audit Readiness Center</button></li>
            </ul>
          </div>

          {/* Col 2 */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Supported Sources</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><span className="hover:text-white transition-colors">Reserve Bank of India (RBI)</span></li>
              <li><span className="hover:text-white transition-colors">SEBI Regulations</span></li>
              <li><span className="hover:text-white transition-colors">NPCI Circulars</span></li>
              <li><span className="hover:text-white transition-colors">CERT-In Security Advisories</span></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Enterprise Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="hover:text-white transition-colors">SOC 2 Type II Certification</span></li>
              <li><span className="hover:text-white transition-colors">ISO 27001 ISMS Standard</span></li>
              <li><span className="hover:text-white transition-colors">Data Privacy & Security</span></li>
              <li><span className="hover:text-white transition-colors">RBAC & Audit Logging</span></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">ACRIS Contact</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => setShowDemoModal(true)} className="hover:text-white transition-colors">Request Callback</button></li>
              <li><span className="hover:text-white transition-colors">Integration Support</span></li>
              <li><span className="hover:text-white transition-colors">Enterprise SLA</span></li>
              <li><span className="hover:text-white transition-colors">Security Disclosures</span></li>
            </ul>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs gap-4 font-medium">
          <span>&copy; {new Date().getFullYear()} ACRIS compliance engine. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Security Standards</a>
          </div>
        </div>
      </footer>

      {/* Request Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 w-full max-w-md p-8 rounded-none shadow-xl relative animate-none">
            {/* Close Button */}
            <button 
              onClick={() => setShowDemoModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            {demoSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 border-2 border-green-500 text-green-500 rounded-none flex items-center justify-center mx-auto bg-green-50">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h3 className="text-base font-bold uppercase text-slate-900">Request Received</h3>
                <p className="text-slate-600 text-xs font-medium">
                  A banking compliance specialist from our enterprise team will contact you at your work email within 1 business day.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-extrabold uppercase text-slate-900">Request Custom Demo</h3>
                  <p className="text-slate-500 text-xs font-medium">Specify your details to request an interactive platform demo.</p>
                </div>

                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      value={demoForm.fullName}
                      onChange={(e) => setDemoForm({...demoForm, fullName: e.target.value})}
                      placeholder="e.g. Sarah Miller" 
                      className="w-full border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">Work Email</label>
                    <input 
                      required 
                      type="email" 
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({...demoForm, email: e.target.value})}
                      placeholder="e.g. s.miller@citi.com" 
                      className="w-full border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">Institution Name</label>
                    <input 
                      required 
                      type="text" 
                      value={demoForm.institution}
                      onChange={(e) => setDemoForm({...demoForm, institution: e.target.value})}
                      placeholder="e.g. Citi Bank India" 
                      className="w-full border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">Job Title</label>
                    <input 
                      required 
                      type="text" 
                      value={demoForm.jobTitle}
                      onChange={(e) => setDemoForm({...demoForm, jobTitle: e.target.value})}
                      placeholder="e.g. Head of IT Compliance" 
                      className="w-full border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">Additional Requirements (Optional)</label>
                    <textarea 
                      rows={2} 
                      value={demoForm.message}
                      onChange={(e) => setDemoForm({...demoForm, message: e.target.value})}
                      placeholder="e.g. Specific interest in RBI Digital Lending compliance..." 
                      className="w-full border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:border-[#1E40AF] focus:ring-0 focus:outline-none rounded-none font-medium resize-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-bold text-xs py-3 rounded-none transition-colors uppercase tracking-wider"
                  >
                    Submit Request
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
