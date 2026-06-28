import React, { Suspense, lazy, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/state/ThemeContext";
import { CopilotProvider } from "@/state/CopilotContext";
import { AuthProvider } from "@/state/AuthContext";
import { OrgProfileProvider } from "./state/OrgProfileContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import OrgSetup from "./pages/OrgSetup";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";
import BootstrapLoader from "./pages/BootstrapLoader";
import { SkeletonPage } from "./components/shared/States";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Regulations = lazy(() => import("./pages/Regulations"));
const DocumentAnalysis = lazy(() => import("./pages/DocumentAnalysis"));
const ChangeDetection = lazy(() => import("./pages/ChangeDetection"));
const ImpactAnalysis = lazy(() => import("./pages/ImpactAnalysis"));
const AIExplanation = lazy(() => import("./pages/AIExplanation"));
const Reports = lazy(() => import("./pages/Reports"));
const Alerts = lazy(() => import("./pages/Alerts"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const Maps = lazy(() => import("./pages/Maps"));
const AuditReadiness = lazy(() => import("./pages/AuditReadiness"));
const DepartmentRouting = lazy(() => import("./pages/DepartmentRouting"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const EvidenceManagement = lazy(() => import("./pages/EvidenceManagement"));
const OrganizationMembers = lazy(() => import("./pages/OrganizationMembers"));

const queryClient = new QueryClient();

/**
 * SystemCheck intercepts navigation on first load.
 * If the AI model file is not yet downloaded, it redirects to /bootstrap.
 * Once the model is present, it lets the user through normally.
 * If the backend is unreachable (dev mode), it passes through silently.
 */
const SystemCheck = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Only run the check on first mount
    fetch("/api/v1/system/status")
      .then(res => res.json())
      .then(data => {
        if (!data.model_downloaded && location.pathname !== "/bootstrap") {
          navigate("/bootstrap", { replace: true });
        } else if (data.model_downloaded && location.pathname === "/bootstrap") {
          navigate("/auth", { replace: true });
        }
      })
      .catch(() => {
        // Backend unreachable (e.g. dev mode with separate Vite/FastAPI), pass through
      })
      .finally(() => setChecking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) return null;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CopilotProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <OrgProfileProvider>
                <SystemCheck>
                  <Routes>
                    <Route path="/bootstrap" element={<BootstrapLoader />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/pending-approval" element={<Suspense fallback={<SkeletonPage />}><PendingApproval /></Suspense>} />
                    <Route path="/setup" element={<ProtectedRoute><OrgSetup /></ProtectedRoute>} />
                    <Route path="/" element={<Auth />} />
                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      <Route path="/dashboard" element={<Suspense fallback={<SkeletonPage />}><Dashboard /></Suspense>} />
                      <Route path="/regulations" element={<Suspense fallback={<SkeletonPage />}><Regulations /></Suspense>} />
                      <Route path="/document-analysis" element={<Suspense fallback={<SkeletonPage />}><DocumentAnalysis /></Suspense>} />
                      <Route path="/change-detection" element={<Suspense fallback={<SkeletonPage />}><ChangeDetection /></Suspense>} />
                      <Route path="/impact-analysis" element={<Suspense fallback={<SkeletonPage />}><ImpactAnalysis /></Suspense>} />
                      <Route path="/copilot" element={<Suspense fallback={<SkeletonPage />}><AIExplanation /></Suspense>} />
                      <Route path="/maps" element={<Suspense fallback={<SkeletonPage />}><Maps /></Suspense>} />
                      <Route path="/department-routing" element={<Suspense fallback={<SkeletonPage />}><DepartmentRouting /></Suspense>} />
                      <Route path="/audit-readiness" element={<Suspense fallback={<SkeletonPage />}><AuditReadiness /></Suspense>} />
                      <Route path="/reports" element={<Suspense fallback={<SkeletonPage />}><Reports /></Suspense>} />
                      <Route path="/alerts" element={<Suspense fallback={<SkeletonPage />}><Alerts /></Suspense>} />
                      <Route path="/audit-logs" element={<Suspense fallback={<SkeletonPage />}><AuditLogs /></Suspense>} />
                      <Route path="/company-profile" element={<Suspense fallback={<SkeletonPage />}><CompanyProfile /></Suspense>} />
                      <Route path="/evidence-management" element={<Suspense fallback={<SkeletonPage />}><EvidenceManagement /></Suspense>} />
                      <Route path="/organization-members" element={<Suspense fallback={<SkeletonPage />}><OrganizationMembers /></Suspense>} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SystemCheck>
              </OrgProfileProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CopilotProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
