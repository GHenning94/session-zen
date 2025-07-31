import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { RealtimeSyncProvider } from "@/hooks/useRealtimeSync";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Upgrade from "@/pages/Upgrade";
import Signup from "@/pages/Signup";
import Agenda from "@/pages/Agenda";
import Clientes from "@/pages/Clientes";
import Pagamentos from "@/pages/Pagamentos";
import Configuracoes from "@/pages/Configuracoes";
import Relatorios from "@/pages/Relatorios";
import Estudos from "@/pages/Estudos";
import Eventos from "@/pages/Eventos";
import Prontuarios from "@/pages/Prontuarios";
import Sessoes from "@/pages/Sessoes";
import BookingPage from "@/pages/BookingPage";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthRedirect } from "@/components/AuthRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <RealtimeSyncProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthRedirect />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                <Route path="/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              <Route path="/estudos" element={<ProtectedRoute><Estudos /></ProtectedRoute>} />
              <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
              <Route path="/prontuarios" element={<ProtectedRoute><Prontuarios /></ProtectedRoute>} />
              <Route path="/sessoes" element={<ProtectedRoute><Sessoes /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/agendar/:userId" element={<BookingPage />} />
                <Route path="/agendar/slug/:slug" element={<BookingPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </RealtimeSyncProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;