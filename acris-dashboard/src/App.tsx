import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Dashboard from "./pages/Dashboard";
import Regulations from "./pages/Regulations";
import DocumentAnalysis from "./pages/DocumentAnalysis";
import ChangeDetection from "./pages/ChangeDetection";
import ImpactAnalysis from "./pages/ImpactAnalysis";
import AIExplanation from "./pages/AIExplanation";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import AuditLogs from "./pages/AuditLogs";
import CompanyProfile from "./pages/CompanyProfile";
import Maps from "./pages/Maps";
import AuditReadiness from "./pages/AuditReadiness";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/setup" element={<ProtectedRoute><OrgSetup /></ProtectedRoute>} />
                  <Route path="/" element={<Landing />} />
                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/regulations" element={<Regulations />} />
                    <Route path="/document-analysis" element={<DocumentAnalysis />} />
                    <Route path="/change-detection" element={<ChangeDetection />} />
                    <Route path="/impact-analysis" element={<ImpactAnalysis />} />
                    <Route path="/copilot" element={<AIExplanation />} />
                    <Route path="/maps" element={<Maps />} />
                    <Route path="/audit-readiness" element={<AuditReadiness />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/company-profile" element={<CompanyProfile />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </OrgProfileProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CopilotProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
