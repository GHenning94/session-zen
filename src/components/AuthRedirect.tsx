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
        // Não verificar se já está em /welcome
        if (location.pathname === '/welcome') {
          console.log('🔀 AuthRedirect: Já está em /welcome');
          return;
        }

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_login_completed')
            .eq('user_id', user.id)
            .single();

          // Se não completou primeiro login e está tentando ir para dashboard/agenda -> Welcome
          if (!profile?.first_login_completed && 
              (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/agenda'))) {
            console.log('🔀 AuthRedirect: Primeiro login não completado. Redirecionando para /welcome');
            navigate('/welcome', { replace: true });
            return;
          }

          console.log('🔀 AuthRedirect: Usuário existe e completou onboarding.');
        } catch (error) {
          console.error('🔀 AuthRedirect: Erro ao verificar profile:', error);
        }
      }
    };

    checkFirstLogin();
  }, [user, loading, location.pathname, navigate]);

  return null;
}