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
      console.log('🔀 AuthRedirect: Verificando estado', { user: !!user, loading, pathname: location.pathname });

      if (loading) {
        console.log('🔀 AuthRedirect: Aguardando carregamento...');
        return;
      }

      // REGRA 1: Se NÃO há usuário E está tentando acessar rota protegida -> Manda para /login
      if (!user && (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/agenda'))) {
        console.log('🔀 AuthRedirect: Sem usuário, acessando rota protegida. Redirecionando para /login.');
        navigate('/login', { replace: true });
        return;
      }

      // REGRA 2: Se HÁ usuário, verificar se completou primeiro login
      if (user) {
        // Não verificar se já está em /welcome ou /auth-confirm
        if (location.pathname === '/welcome' || location.pathname === '/auth-confirm' || location.pathname === '/reset-password') {
          console.log('🔀 AuthRedirect: Já está em página permitida:', location.pathname);
          return;
        }

        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_login_completed')
            .eq('user_id', user.id)
            .single();

          // NOVO: Detectar se a conta foi deletada
          if (profileError || !profile) {
            console.error('🔀 AuthRedirect: Profile não encontrado. Usuário pode ter sido deletado.', profileError);
            
            // Limpar TUDO do localStorage
            localStorage.clear();
            sessionStorage.clear();
            
            // Forçar logout
            await supabase.auth.signOut();
            
            // Redirecionar para landing page
            navigate('/', { replace: true });
            
            return;
          }

          // Se não completou primeiro login -> Redirecionar IMEDIATAMENTE para /welcome
          if (!profile.first_login_completed) {
            console.log('🔀 AuthRedirect: Primeiro login não completado. Redirecionando para /welcome');
            navigate('/welcome', { replace: true });
            return;
          }

          console.log('🔀 AuthRedirect: Usuário existe e completou onboarding.');
        } catch (error) {
          console.error('🔀 AuthRedirect: Erro crítico ao verificar profile:', error);
          
          // Em caso de erro crítico, também limpar tudo
          localStorage.clear();
          sessionStorage.clear();
          await supabase.auth.signOut();
          navigate('/', { replace: true });
        }
      }
    };

    checkFirstLogin();
  }, [user, loading, location.pathname, navigate]);

  return null;
}