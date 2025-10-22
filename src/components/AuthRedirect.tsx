import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

export const AuthRedirect = () => {
  const { user, loading, session: authSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      console.log('🔀 AuthRedirect: checking auth state', { user: !!user, loading, pathname: location.pathname });

      if (loading) {
        console.log('🔀 AuthRedirect: still loading, waiting...');
        return;
      }

      let currentSession = authSession;
      if (!currentSession && user) {
        const { data } = await supabase.auth.getSession();
        currentSession = data.session;
        console.log('🔀 AuthRedirect: Fetched session manually', { currentSession });
      }

      const userAal = (currentSession?.user as any)?.aal;
      const needs2FA = userAal === 'aal1';
      console.log('🔀 AuthRedirect: Needs 2FA check:', { needs2FA, aal: userAal });

      // --- LOG ADICIONAL PARA VERIFICAR A LÓGICA DE REDIRECIONAMENTO ---
      if (user && location.pathname === '/login') {
          console.log('🔀 AuthRedirect: Verificando /login redirect.', { needs2FA });
          if (needs2FA) {
              console.log('🔀 AuthRedirect: DECISÃO -> Ficar no /login por causa do needs2FA.');
          } else {
              console.log('🔀 AuthRedirect: DECISÃO -> Redirecionar para /dashboard porque needs2FA é false.');
          }
      }
      // --- FIM DO LOG ADICIONAL ---


      if (user && location.pathname === '/' && location.state?.fromLogin && !needs2FA) {
        console.log('🔀 AuthRedirect: user logged in on landing page, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }

      if (user && location.pathname === '/login' && !needs2FA) {
        console.log('🔀 AuthRedirect: user logged in on login page (fully authenticated), redirecting to dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }

      if (user && location.pathname === '/login' && needs2FA) {
        console.log('🔀 AuthRedirect: user logged in on login page but needs 2FA, staying on login page to show modal');
        return;
      }

      if (!user && !loading) {
        console.log('🔀 AuthRedirect: no user detected, staying on current page:', location.pathname);
      }
    };

    checkAuthAndRedirect();

  }, [user, loading, authSession, location.pathname, location.state, navigate]);

  return null;
}