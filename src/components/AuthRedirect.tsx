import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AuthRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // **** NOVO TESTE DE VERIFICAÇÃO DE DEPLOY ****
    console.log('--- AUTH-REDIRECT v3 (FLAG-CHECKER) ESTÁ NO AR ---');

    // **** CORREÇÃO DA RACE CONDITION (PASSO 3) ****
    // Verificar se a página AuthConfirm está a trabalhar
    const isConfirming = sessionStorage.getItem('IS_CONFIRMING_AUTH');
    if (isConfirming) {
      console.log('[AuthRedirect] Pausado: AuthConfirm está a trabalhar.');
      return; // Parar imediatamente e não fazer nada
    }

    const checkFirstLogin = async () => {
      if (loading) return;

      const currentPath = location.pathname;
      
      const protectedRoutes = ['/dashboard', '/agenda', '/clientes', '/pagamentos', '/configuracoes', '/pacotes', '/sessoes', '/prontuarios', '/relatorios'];
      const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
      
      if (!user && isProtectedRoute) {
        console.log('[AuthRedirect] User not authenticated, redirecting to login from:', currentPath);
        navigate('/login', { replace: true });
        return;
      }

      if (user) {
        const allowedPaths = ['/welcome', '/auth-confirm', '/reset-password', '/upgrade'];
        if (allowedPaths.includes(currentPath)) {
          return;
        }

        // Esta é a lógica que estava a falhar (o signOut prematuro)
        // Agora só corre se a bandeira 'IS_CONFIRMING_AUTH' não existir
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_confirmed_strict')
          .eq('user_id', user.id)
          .single();

        if (!profile?.email_confirmed_strict) {
          console.log('[AuthRedirect] Email não confirmado (strict), signing out and redirecting to login');
          await supabase.auth.signOut();
          navigate('/login', { 
            state: { 
              message: 'Por favor, confirme seu e-mail antes de acessar a plataforma. Verifique sua caixa de entrada.',
              variant: 'destructive'
            },
            replace: true 
          });
          return;
        }


        try {
          // A verificação de 'profile' já foi feita acima,
          // mas esta busca 'first_login_completed'
          const { data: profileLogin, error } = await supabase
            .from('profiles')
            .select('first_login_completed, subscription_plan')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('[AuthRedirect] Error fetching profile:', error);
            localStorage.clear();
            await supabase.auth.signOut();
            navigate('/', { replace: true });
            return;
          }

          if (!profileLogin?.first_login_completed) {
            if (profileLogin?.subscription_plan && profileLogin.subscription_plan !== 'basico') {
              console.log('[AuthRedirect] Has paid plan, allowing dashboard access');
              return;
            }
            
            console.log('[AuthRedirect] First login not completed, redirecting to welcome');
            navigate('/welcome', { replace: true });
          }
        } catch (error) {
          console.error('[AuthRedirect] Error in checkFirstLogin:', error);
        }
      }
    };

    checkFirstLogin();
  }, [user, loading, navigate, location.pathname]);

  return null;
}