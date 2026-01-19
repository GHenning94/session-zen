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
  const maxAttempts = 15; // ✅ Aumentar tentativas para dar mais tempo à recuperação de sessão
  const [forceShowLoading, setForceShowLoading] = useState(false);

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
  const hasPaymentSuccessPending = localStorage.getItem('payment_success_pending') === 'true';

  // ✅ Condição combinada para detectar checkout pendente
  const hasPendingCheckoutData = isPaymentReturn || isStripeCheckoutActive || hasPendingCheckout || hasPendingTierUpgrade || hasPaymentSuccessPending;

  // ✅ Se retornando de checkout, forçar estado de loading por tempo adequado
  useEffect(() => {
    if (hasPendingCheckoutData && !user) {
      setForceShowLoading(true);
      // Forçar loading por pelo menos 30 segundos enquanto tenta recuperar sessão
      const timeout = setTimeout(() => {
        setForceShowLoading(false);
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [hasPendingCheckoutData, user]);

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
              setForceShowLoading(false);
              // A sessão foi recuperada, o useAuth vai atualizar o user
            } else {
              console.log('🔒 ProtectedRoute: Sessão ainda não disponível, aguardando...');
              // ✅ Aumentar delay para dar mais tempo ao Supabase
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error('🔒 ProtectedRoute: Erro ao recuperar sessão:', error);
          }
          
          setIsCheckingSession(false);
        } else {
          console.log('🔒 ProtectedRoute: Máximo de tentativas atingido, redirecionando para login...');
          // ✅ Só limpar flags DEPOIS de esgotar todas tentativas
          // Manter payment_success_pending para o Login saber sincronizar depois
          localStorage.setItem('payment_success_pending', 'true');
          localStorage.removeItem('stripe_checkout_active');
          sessionStorage.removeItem('stripe_checkout_active');
          setForceShowLoading(false);
        }
      }
    };

    checkAndRecoverSession();
  }, [user, hasPendingCheckoutData, isCheckingSession]);

  // O app está carregando apenas se Auth estiver carregando
  const isLoading = authLoading;

  // --- ESTADO DE CARREGAMENTO INICIAL ---
  if (isLoading || isCheckingSession || forceShowLoading) {
    // ✅ Se há checkout pendente, mostrar loading dedicado "Ativando seu plano"
    if (hasPendingCheckoutData) {
      console.log('🔒 ProtectedRoute: Carregando com checkout pendente, mostrando loading dedicado...');
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">Ativando seu plano...</h2>
            <p className="text-muted-foreground mt-1">Aguarde enquanto processamos seu pagamento.</p>
            <p className="text-muted-foreground text-sm mt-2">Isso pode levar alguns segundos.</p>
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
          <p className="text-muted-foreground mt-1">Aguarde enquanto processamos seu pagamento.</p>
          <p className="text-muted-foreground text-sm mt-2">Isso pode levar alguns segundos.</p>
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