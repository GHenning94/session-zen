import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { RealtimeSyncProvider } from "@/hooks/useRealtimeSync";
import { Suspense, lazy } from "react";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthRedirect } from "@/components/AuthRedirect";

// Lazy load pages that are accessed after authentication
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Upgrade = lazy(() => import("@/pages/Upgrade"));
const Agenda = lazy(() => import("@/pages/Agenda"));
const Clientes = lazy(() => import("@/pages/Clientes"));
const Pagamentos = lazy(() => import("@/pages/Pagamentos"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const Eventos = lazy(() => import("@/pages/Eventos"));
const Prontuarios = lazy(() => import("@/pages/Prontuarios"));
const Sessoes = lazy(() => import("@/pages/Sessoes"));
const Estudos = lazy(() => import("@/pages/Estudos"));
const RedesSociais = lazy(() => import("@/pages/RedesSociais"));
const ProgramaIndicacao = lazy(() => import("@/pages/ProgramaIndicacao"));
const BookingPage = lazy(() => import("@/pages/BookingPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

// Loading component for code splitting
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
                <Route path="/upgrade" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoading />}>
                      <Upgrade />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoading />}>
                      <Dashboard />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/agenda" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoading />}>
                      <Agenda />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/clientes" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoading />}>
                      <Clientes />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/pagamentos" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoading />}>
                      <Pagamentos />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/relatorios" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoading />}>
                      <Relatorios />
                    </Suspense>
                  </ProtectedRoute>
                } />
              <Route path="/eventos" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoading />}>
                    <Eventos />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/prontuarios" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoading />}>
                    <Prontuarios />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/sessoes" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoading />}>
                    <Sessoes />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/estudos" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoading />}>
                    <Estudos />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/redes-sociais" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoading />}>
                    <RedesSociais />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/programa-indicacao" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoading />}>
                    <ProgramaIndicacao />
                  </Suspense>
                </ProtectedRoute>
              } />
                <Route path="/configuracoes" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoading />}>
                      <Configuracoes />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/agendar/:userId" element={
                  <Suspense fallback={<PageLoading />}>
                    <BookingPage />
                  </Suspense>
                } />
                <Route path="/agendar/slug/:slug" element={
                  <Suspense fallback={<PageLoading />}>
                    <BookingPage />
                  </Suspense>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <Suspense fallback={<PageLoading />}>
                    <NotFound />
                  </Suspense>
                } />
              </Routes>
            </BrowserRouter>
          </RealtimeSyncProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;