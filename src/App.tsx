import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/hooks/useAuth'
import { SubscriptionProvider } from '@/hooks/useSubscription'
import { RealtimeSyncProvider } from '@/hooks/useRealtimeSync'
import { TerminologyProvider } from '@/hooks/useTerminology'
import { ProfileModalProvider } from '@/contexts/ProfileModalContext'
import { NotificationProvider, useNotificationContext } from '@/contexts/NotificationContext'
import { NotificationToast } from '@/components/NotificationToast'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { GlobalRealtimeProvider } from '@/hooks/useGlobalRealtime'
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton"
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Welcome from "@/pages/Welcome";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthRedirect from "@/components/AuthRedirect";
import { BackNavigationGuard } from "@/components/BackNavigationGuard";
import ErrorBoundary from "@/components/ErrorBoundary";

import { CheckoutRedirect } from "@/components/CheckoutRedirect";

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
import Pacotes from "@/pages/Pacotes";
import SessoesRecorrentes from "@/pages/SessoesRecorrentes";

// Importações diretas para todas as páginas principais
import Upgrade from "@/pages/Upgrade";
import Eventos from "@/pages/Eventos";
import Prontuarios from "@/pages/Prontuarios";
import Estudos from "@/pages/Estudos";
import RedesSociais from "@/pages/RedesSociais";
import ProgramaIndicacao from "@/pages/ProgramaIndicacao";
import Suporte from "@/pages/Suporte";
import Documentacao from "@/pages/Documentacao";
import Metas from "@/pages/Metas";
import TermosIndicacao from "@/pages/TermosIndicacao";
import PublicRegistration from "@/pages/PublicRegistration";
import ConviteIndicacao from "@/pages/ConviteIndicacao";
import AuthConfirm from "@/pages/AuthConfirm";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import EmailChangeConfirmation from "@/pages/EmailChangeConfirmation";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminSecurity from "@/pages/admin/AdminSecurity";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminContent from "@/pages/admin/AdminContent";
import AdminLogs from "@/pages/admin/AdminLogs";
import AdminSystemConfig from "@/pages/admin/AdminSystemConfig";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminActivity from "@/pages/admin/AdminActivity";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminRevenue from "@/pages/admin/AdminRevenue";
import AdminSessions from "@/pages/admin/AdminSessions";
import AdminClients from "@/pages/admin/AdminClients";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminHealth from "@/pages/admin/AdminHealth";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
const BookingPage = lazy(() => import("@/pages/BookingPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Não recarregar ao voltar para a aba
      refetchOnReconnect: false,   // Não recarregar ao reconectar
      staleTime: 5 * 60 * 1000,    // Dados ficam frescos por 5 minutos
    },
  },
});

// Loading component for code splitting
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-12 rounded-full mx-auto" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
      </div>
    </div>
  </div>
);

const ThemeTransitionOverlay = () => (
  <div className="theme-transition-overlay">
    <div className="theme-transition-spinner" />
  </div>
);

// Analytics wrapper to track page views
const AnalyticsWrapper = ({ children }: { children: React.ReactNode }) => {
  useGoogleAnalytics()
  return <>{children}</>
}

// Global notification toast component
const GlobalNotificationToast = () => {
  const { incomingNotification, clearIncomingNotification } = useNotificationContext()
  
  return (
    <NotificationToast 
      notification={incomingNotification}
      onAnimationComplete={clearIncomingNotification}
    />
  )
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        storageKey="theme"
        disableTransitionOnChange
      >
        <ThemeTransitionOverlay />
        <TooltipProvider>
          <AuthProvider>
            <GlobalRealtimeProvider>
              <NotificationProvider>
                <GlobalNotificationToast />
                <SubscriptionProvider>
                  <TerminologyProvider>
                    <RealtimeSyncProvider>
                      <ProfileModalProvider>
                    <BrowserRouter>
                      <AnalyticsWrapper>
                        <AuthRedirect />
                        <BackNavigationGuard />
                        <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/checkout-redirect" element={<ProtectedRoute><CheckoutRedirect /></ProtectedRoute>} />
                  <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
          <Route path="/auth-confirm" element={<AuthConfirm />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/email-change-confirmation" element={<EmailChangeConfirmation />} />
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
                  <Route path="/pacotes" element={
                    <ProtectedRoute>
                      <Pacotes />
                    </ProtectedRoute>
                  } />
                  <Route path="/sessoes-recorrentes" element={
                    <ProtectedRoute>
                      <SessoesRecorrentes />
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
                  <Route path="/metas" element={
                    <ProtectedRoute>
                      <Metas />
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
                  <Route path="/documentacao" element={
                    <ProtectedRoute>
                      <Documentacao />
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
                  <Route path="/register/:token" element={<PublicRegistration />} />
                  <Route path="/convite/:code" element={<ConviteIndicacao />} />
                  <Route path="/termos-indicacao" element={<TermosIndicacao />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route 
                    path="/admin" 
                    element={
                      <AdminProtectedRoute>
                        <AdminDashboard />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/dashboard" 
                    element={
                      <AdminProtectedRoute>
                        <AdminDashboard />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/security" 
                    element={
                      <AdminProtectedRoute>
                        <AdminSecurity />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/users" 
                    element={
                      <AdminProtectedRoute>
                        <AdminUsers />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/payments" 
                    element={
                      <AdminProtectedRoute>
                        <AdminPayments />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/analytics" 
                    element={
                      <AdminProtectedRoute>
                        <AdminAnalytics />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/content" 
                    element={
                      <AdminProtectedRoute>
                        <AdminContent />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/logs" 
                    element={
                      <AdminProtectedRoute>
                        <AdminLogs />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/config" 
                    element={
                      <AdminProtectedRoute>
                        <AdminSystemConfig />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/notifications" 
                    element={
                      <AdminProtectedRoute>
                        <AdminNotifications />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/activity" 
                    element={
                      <AdminProtectedRoute>
                        <AdminActivity />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/roles" 
                    element={
                      <AdminProtectedRoute>
                        <AdminRoles />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/settings" 
                    element={
                      <AdminProtectedRoute>
                        <AdminSettings />
                      </AdminProtectedRoute>
                    } 
                  />
                  <Route path="/admin/revenue" element={<AdminProtectedRoute><AdminRevenue /></AdminProtectedRoute>} />
                  <Route path="/admin/sessions" element={<AdminProtectedRoute><AdminSessions /></AdminProtectedRoute>} />
                  <Route path="/admin/clients" element={<AdminProtectedRoute><AdminClients /></AdminProtectedRoute>} />
                  <Route path="/admin/referrals" element={<AdminProtectedRoute><AdminReferrals /></AdminProtectedRoute>} />
                  <Route path="/admin/health" element={<AdminProtectedRoute><AdminHealth /></AdminProtectedRoute>} />
                  
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
                </ProfileModalProvider>
              </RealtimeSyncProvider>
                  </TerminologyProvider>
            </SubscriptionProvider>
              </NotificationProvider>
            </GlobalRealtimeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;