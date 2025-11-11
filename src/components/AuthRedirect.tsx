// src/components/AuthRedirect.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AuthRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('[AuthRedirect] 🔄 Verificando redirecionamento...', {
      path: location.pathname,
      hasUser: !!user,
      loading,
      timestamp: new Date().toISOString()
    });

    // ✅ CORREÇÃO CRÍTICA: Pausar se AuthConfirm estiver trabalhando
    const isConfirming = sessionStorage.getItem('IS_CONFIRMING_AUTH');
    if (isConfirming === 'true') {
      console.log('[AuthRedirect] ⏸️ Pausado - AuthConfirm está processando confirmação');
      return;
    }

    const checkAuthAndRedirect = async () => {
      if (loading) {
        console.log('[AuthRedirect] ⏳ Aguardando autenticação...');
        return;
      }

      const currentPath = location.pathname;
      
      // Rotas protegidas que requerem autenticação
      const protectedRoutes = [
        '/dashboard',
        '/agenda',
        '/clientes',
        '/pagamentos',
        '/configuracoes',
        '/pacotes',
        '/sessoes',
        '/prontuarios',
        '/relatorios'
      ];
      
      const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
      
      // Se não estiver autenticado e tentar acessar rota protegida
      if (!user && isProtectedRoute) {
        console.log('[AuthRedirect] 🚫 Acesso negado - redirecionando para login', { from: currentPath });
        navigate('/login', { replace: true });
        return;
      }

      // Se estiver autenticado, verificar fluxos
      if (user) {
        // Rotas permitidas mesmo sem confirmação de e-mail
        const allowedPaths = [
          '/welcome',
          '/auth-confirm',
          '/reset-password',
          '/upgrade',
          '/auth/callback'
        ];
        
        if (allowedPaths.includes(currentPath)) {
          console.log('[AuthRedirect] ✅ Rota permitida:', currentPath);
          return;
        }

        try {
          // ✅ Verificar confirmação estrita de e-mail
          console.log('[AuthRedirect] 📧 Verificando confirmação de e-mail...');
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email_confirmed_strict, first_login_completed, subscription_plan')
            .eq('user_id', user.id)
            .single();

          if (profileError) {
            console.error('[AuthRedirect] ❌ Erro ao buscar perfil:', profileError.message);
            
            // Se for erro de autenticação, limpar e redirecionar
            if (profileError.code === 'PGRST301' || profileError.message.includes('JWT')) {
              console.log('[AuthRedirect] 🚪 Erro de autenticação - fazendo logout');
              localStorage.clear();
              sessionStorage.clear();
              await supabase.auth.signOut();
              navigate('/login', { replace: true });
              return;
            }
            
            throw profileError;
          }

          // ✅ Se e-mail não confirmado, fazer logout e redirecionar
          if (!profile?.email_confirmed_strict) {
            console.log('[AuthRedirect] ❌ E-mail não confirmado - fazendo logout');
            
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

          console.log('[AuthRedirect] ✅ E-mail confirmado');

          // ✅ Verificar primeiro login
          if (!profile?.first_login_completed) {
            // Se tiver plano pago, permitir acesso ao dashboard
            if (profile?.subscription_plan && profile.subscription_plan !== 'basico') {
              console.log('[AuthRedirect] ✅ Plano pago detectado - permitindo acesso');
              return;
            }
            
            console.log('[AuthRedirect] 🆕 Primeiro login - redirecionando para welcome');
            navigate('/welcome', { replace: true });
            return;
          }

          console.log('[AuthRedirect] ✅ Usuário autenticado e verificado');
          
        } catch (error) {
          console.error('[AuthRedirect] ❌ Erro na verificação:', error);
          
          // Em caso de erro, fazer logout de segurança
          localStorage.clear();
          sessionStorage.clear();
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
        }
      }
    };

    checkAuthAndRedirect();
  }, [user, loading, navigate, location.pathname]);

  return null;
}