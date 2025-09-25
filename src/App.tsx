import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/hooks/useAuth'
import { SubscriptionProvider } from '@/hooks/useSubscription'
import { RealtimeSyncProvider } from '@/hooks/useRealtimeSync'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { Suspense, lazy } from "react";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthRedirect } from "@/components/AuthRedirect";

// Importações diretas para páginas principais (sem loading)
import Dashboard from "@/pages/Dashboard";
import Agenda from "@/pages/Agenda";
import Clientes from "@/pages/Clientes";
import Pagamentos from "@/pages/Pagamentos";
import Configuracoes from "@/pages/Configuracoes";
import Relatorios from "@/pages/Relatorios";
import Sessoes from "@/pages/Sessoes";
import PaginaPublica from "@/pages/PaginaPublica";
import Integracoes from "@/pages/Integracoes";

// Importações diretas para todas as páginas principais
import Upgrade from "@/pages/Upgrade";
import Eventos from "@/pages/Eventos";
import Prontuarios from "@/pages/Prontuarios";
import Estudos from "@/pages/Estudos";
import RedesSociais from "@/pages/RedesSociais";
import ProgramaIndicacao from "@/pages/ProgramaIndicacao";
import Suporte from "@/pages/Suporte";
const BookingPage = lazy(() => import("@/pages/BookingPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

// Loading component for code splitting
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Analytics wrapper to track page views
const AnalyticsWrapper = ({ children }: { children: React.ReactNode }) => {
  useGoogleAnalytics()
  return <>{children}</>
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="theme"
      disableTransitionOnChange
    >
      <TooltipProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <RealtimeSyncProvider>
              <BrowserRouter>
                <AnalyticsWrapper>
                  <AuthRedirect />
                  <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/agenda" element={
                    <ProtectedRoute>
                      <Agenda />
                    </ProtectedRoute>
                  } />
                  <Route path="/clientes" element={
                    <ProtectedRoute>
                      <Clientes />
                    </ProtectedRoute>
                  } />
                  <Route path="/pagamentos" element={
                    <ProtectedRoute>
                      <Pagamentos />
                    </ProtectedRoute>
                  } />
                  <Route path="/relatorios" element={
                    <ProtectedRoute>
                      <Relatorios />
                    </ProtectedRoute>
                  } />
                  <Route path="/sessoes" element={
                    <ProtectedRoute>
                      <Sessoes />
                    </ProtectedRoute>
                  } />
                  <Route path="/configuracoes" element={
                    <ProtectedRoute>
                      <Configuracoes />
                    </ProtectedRoute>
                  } />
                  <Route path="/upgrade" element={
                    <ProtectedRoute>
                      <Upgrade />
                    </ProtectedRoute>
                  } />
                  <Route path="/eventos" element={
                    <ProtectedRoute>
                      <Eventos />
                    </ProtectedRoute>
                  } />
                  <Route path="/prontuarios" element={
                    <ProtectedRoute>
                      <Prontuarios />
                    </ProtectedRoute>
                  } />
                  <Route path="/estudos" element={
                    <ProtectedRoute>
                      <Estudos />
                    </ProtectedRoute>
                  } />
                  <Route path="/redes-sociais" element={
                    <ProtectedRoute>
                      <RedesSociais />
                    </ProtectedRoute>
                  } />
                  <Route path="/programa-indicacao" element={
                    <ProtectedRoute>
                      <ProgramaIndicacao />
                    </ProtectedRoute>
                  } />
                  <Route path="/pagina-publica" element={
                    <ProtectedRoute>
                      <PaginaPublica />
                    </ProtectedRoute>
                  } />
                  <Route path="/integracoes" element={
                    <ProtectedRoute>
                      <Integracoes />
                    </ProtectedRoute>
                  } />
                  <Route path="/suporte" element={
                    <ProtectedRoute>
                      <Suporte />
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
                </AnalyticsWrapper>
              </BrowserRouter>
              <Toaster />
              <Sonner />
            </RealtimeSyncProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;