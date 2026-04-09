import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Regulations from "./pages/Regulations";
import ChangeDetection from "./pages/ChangeDetection";
import ImpactAnalysis from "./pages/ImpactAnalysis";
import AIExplanation from "./pages/AIExplanation";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import AuditLogs from "./pages/AuditLogs";
import CompanyProfile from "./pages/CompanyProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/regulations" element={<Regulations />} />
            <Route path="/change-detection" element={<ChangeDetection />} />
            <Route path="/impact-analysis" element={<ImpactAnalysis />} />
            <Route path="/ai-explanation" element={<AIExplanation />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/company-profile" element={<CompanyProfile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
