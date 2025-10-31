import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AuthRedirect = () => {
  const { user, loading } = useAuth(); // Só precisamos saber se há um usuário ou não
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkFirstLogin = async () => {
      if (loading) return;

      const currentPath = location.pathname;
      
      // Rotas protegidas que requerem login
      const protectedRoutes = ['/dashboard', '/agenda', '/clientes', '/pagamentos', '/configuracoes', '/pacotes', '/sessoes', '/prontuarios', '/relatorios'];
      const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
      
      // Se não está logado e tenta acessar rota protegida, redireciona para login
      if (!user && isProtectedRoute) {
        console.log('[AuthRedirect] User not authenticated, redirecting to login from:', currentPath);
        navigate('/login', { replace: true });
        return;
      }

      // Se está logado, verifica autenticação completa
      if (user) {
        // CRÍTICO: Verificar se o e-mail foi confirmado
        if (!user.email_confirmed_at) {
          console.log('[AuthRedirect] Email not confirmed, signing out and redirecting to login');
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

        // Permitir acesso direto a algumas páginas específicas sem verificar onboarding
        const allowedPaths = ['/welcome', '/auth-confirm', '/reset-password', '/upgrade'];
        if (allowedPaths.includes(currentPath)) {
          return;
        }

        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_login_completed, subscription_plan')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('[AuthRedirect] Error fetching profile:', error);
            // Se o perfil não existe, limpa o cache e desloga
            localStorage.clear();
            await supabase.auth.signOut();
            navigate('/', { replace: true });
            return;
          }

          // Se não completou o primeiro login/onboarding, redireciona para welcome
          // EXCETO se já tem um plano pago ativo (significa que pagou mas webhook ainda não processou)
          if (!profile?.first_login_completed) {
            // Se tem plano pago, deixa entrar no dashboard (webhook vai processar em breve)
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