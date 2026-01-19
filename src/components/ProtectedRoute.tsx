import { ReactNode, useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
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
  const maxAttempts = 3;

  // ✅ Verificar se está voltando de checkout Stripe
  const searchParams = new URLSearchParams(location.search);
  const isPaymentReturn = searchParams.get('payment') === 'success' || 
                         searchParams.get('payment') === 'cancelled';
  const isStripeCheckoutActive = sessionStorage.getItem('stripe_checkout_active') === 'true';
  const hasPendingCheckout = sessionStorage.getItem('pending_checkout_plan') !== null;

  // ✅ Se voltando de checkout sem sessão, tentar recuperar sessão
  useEffect(() => {
    const checkAndRecoverSession = async () => {
      if (!user && (isPaymentReturn || isStripeCheckoutActive || hasPendingCheckout) && !isCheckingSession) {
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
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error('🔒 ProtectedRoute: Erro ao recuperar sessão:', error);
          }
          
          setIsCheckingSession(false);
        } else {
          console.log('🔒 ProtectedRoute: Máximo de tentativas atingido, limpando flags...');
          // Limpar flags de checkout para evitar loop infinito
          sessionStorage.removeItem('stripe_checkout_active');
          sessionStorage.removeItem('pending_checkout_plan');
        }
      }
    };

    checkAndRecoverSession();
  }, [user, isPaymentReturn, isStripeCheckoutActive, hasPendingCheckout, isCheckingSession]);

  // O app está carregando apenas se Auth estiver carregando
  const isLoading = authLoading;

  // --- ESTADO DE CARREGAMENTO INICIAL ---
  if (isLoading || isCheckingSession) {
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

  // ✅ Se está voltando de checkout Stripe e ainda tentando recuperar sessão, mostrar loading
  if (!user && (isPaymentReturn || isStripeCheckoutActive || hasPendingCheckout) && sessionCheckAttempts.current < maxAttempts) {
    console.log('🔒 ProtectedRoute: Retorno de checkout detectado, aguardando sessão...');
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

  // Se NÃO há usuário -> Redireciona para /login
  if (!user) {
    console.log('🔒 ProtectedRoute: Sem usuário autenticado. Redirecionando para /login.');
    // ✅ Se estava voltando de pagamento bem-sucedido, marcar para sincronizar após login
    if (isPaymentReturn && searchParams.get('payment') === 'success') {
      console.log('🔒 ProtectedRoute: Pagamento bem-sucedido sem sessão, marcando para sincronizar após login...');
      sessionStorage.setItem('payment_success_pending', 'true');
      // Preservar o plano pendente
      const pendingCheckoutPlan = sessionStorage.getItem('pending_checkout_plan');
      if (pendingCheckoutPlan) {
        sessionStorage.setItem('payment_success_plan', pendingCheckoutPlan);
      }
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se HÁ usuário válido -> Permite acesso
  console.log('🔒 ProtectedRoute: Acesso permitido para usuário:', user.id);
  return <>{children}</>;
};

export default ProtectedRoute;