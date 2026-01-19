import { ReactNode, useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: subLoading } = useSubscription();
  const location = useLocation();
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const sessionCheckAttempts = useRef(0);
  const maxAttempts = 5; // Aumentar tentativas

  // ✅ Verificar se está voltando de checkout Stripe - verificar AMBOS os storages
  const searchParams = new URLSearchParams(location.search);
  const isPaymentReturn = searchParams.get('payment') === 'success' || 
                         searchParams.get('payment') === 'cancelled';
  const isStripeCheckoutActive = localStorage.getItem('stripe_checkout_active') === 'true' ||
                                  sessionStorage.getItem('stripe_checkout_active') === 'true';
  const hasPendingCheckout = localStorage.getItem('pending_checkout_plan') !== null ||
                              sessionStorage.getItem('pending_checkout_plan') !== null;
  const hasPendingTierUpgrade = localStorage.getItem('pending_tier_upgrade') !== null ||
                                 sessionStorage.getItem('pending_tier_upgrade') !== null;

  // ✅ Condição combinada para detectar checkout pendente
  const hasPendingCheckoutData = isPaymentReturn || isStripeCheckoutActive || hasPendingCheckout || hasPendingTierUpgrade;

  // ✅ Se voltando de checkout sem sessão, tentar recuperar sessão
  useEffect(() => {
    const checkAndRecoverSession = async () => {
      if (!user && hasPendingCheckoutData && !isCheckingSession) {
        sessionCheckAttempts.current++;
        
        if (sessionCheckAttempts.current <= maxAttempts) {
          setIsCheckingSession(true);
          console.log(`🔒 ProtectedRoute: Tentativa ${sessionCheckAttempts.current}/${maxAttempts} de recuperar sessão...`);
          
          try {
            // Tentar obter sessão novamente
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
              console.log('🔒 ProtectedRoute: Sessão recuperada com sucesso!');
              // A sessão foi recuperada, o useAuth vai atualizar o user
            } else {
              console.log('🔒 ProtectedRoute: Sessão ainda não disponível, aguardando...');
              // Aguardar um pouco e o useEffect vai tentar novamente
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } catch (error) {
            console.error('🔒 ProtectedRoute: Erro ao recuperar sessão:', error);
          }
          
          setIsCheckingSession(false);
        } else {
          console.log('🔒 ProtectedRoute: Máximo de tentativas atingido, limpando flags...');
          // Limpar flags de checkout para evitar loop infinito
          localStorage.removeItem('stripe_checkout_active');
          sessionStorage.removeItem('stripe_checkout_active');
          localStorage.removeItem('pending_checkout_plan');
          sessionStorage.removeItem('pending_checkout_plan');
          localStorage.removeItem('pending_tier_upgrade');
          sessionStorage.removeItem('pending_tier_upgrade');
        }
      }
    };

    checkAndRecoverSession();
  }, [user, hasPendingCheckoutData, isCheckingSession]);

  // O app está carregando apenas se Auth estiver carregando
  const isLoading = authLoading;

  // --- ESTADO DE CARREGAMENTO INICIAL ---
  if (isLoading || isCheckingSession) {
    // ✅ Se há checkout pendente, mostrar loading dedicado "Ativando seu plano"
    if (hasPendingCheckoutData) {
      console.log('🔒 ProtectedRoute: Carregando com checkout pendente, mostrando loading dedicado...');
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">Ativando seu plano...</h2>
            <p className="text-muted-foreground mt-1">Aguarde enquanto confirmamos seu pagamento</p>
          </div>
        </div>
      );
    }
    
    console.log('🔒 ProtectedRoute: Carregando autenticação...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md px-4">
          <div className="space-y-2">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // --- LÓGICA DE REDIRECIONAMENTO ---

  // ✅ Se está voltando de checkout Stripe e ainda tentando recuperar sessão, mostrar loading dedicado
  if (!user && hasPendingCheckoutData && sessionCheckAttempts.current < maxAttempts) {
    console.log('🔒 ProtectedRoute: Retorno de checkout detectado, mostrando loading dedicado...');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Ativando seu plano...</h2>
          <p className="text-muted-foreground mt-1">Aguarde enquanto confirmamos seu pagamento</p>
        </div>
      </div>
    );
  }

  // Se NÃO há usuário -> Redireciona para /login
  if (!user) {
    console.log('🔒 ProtectedRoute: Sem usuário autenticado. Redirecionando para /login.');
    // ✅ Se estava voltando de pagamento bem-sucedido, marcar para sincronizar após login
    if (isPaymentReturn && searchParams.get('payment') === 'success') {
      console.log('🔒 ProtectedRoute: Pagamento bem-sucedido sem sessão, marcando para sincronizar após login...');
      // Usar localStorage para persistir entre sessões
      localStorage.setItem('payment_success_pending', 'true');
      // Preservar o plano pendente (já está no localStorage)
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se HÁ usuário válido -> Permite acesso
  console.log('🔒 ProtectedRoute: Acesso permitido para usuário:', user.id);
  return <>{children}</>;
};

export default ProtectedRoute;