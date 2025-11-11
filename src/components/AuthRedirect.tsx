import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AuthRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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

        // **** CORREÇÃO CRÍTICA ESTÁ AQUI ****
        // Dar tempo à base de dados para atualizar após a confirmação.
        // Se o utilizador foi criado nos últimos 2 minutos, não o deslogue
        // por "email_confirmed_strict = false", porque ele está NO MEIO do fluxo.
        const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
        if (user.created_at > twoMinutesAgo && currentPath !== '/login') {
            console.log('[AuthRedirect] Novo usuário detectado (criado < 2 min), pulando verificação estrita temporariamente.');
            // Se for um utilizador novo, o fluxo de onboarding (welcome) vai apanhá-lo.
            // Não precisamos de fazer nada aqui, apenas NÃO o deslogar.
        } else {
            // Se for um utilizador antigo (> 2 min), corra a verificação estrita
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
        }
        // **** FIM DA CORREÇÃO ****


        try {
          const { data: profile, error } = await supabase
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

          if (!profile?.first_login_completed) {
            if (profile?.subscription_plan && profile.subscription_plan !== 'basico') {
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