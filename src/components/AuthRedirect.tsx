import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AuthRedirect = () => {
  const { user, loading, session: authSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentAal, setCurrentAal] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const fetchAal = async () => {
      // Tenta obter o AAL da forma mais atualizada possível
      let latestAal: string | null | undefined = undefined;
      const { data } = await supabase.auth.getSession(); // Busca sempre a sessão mais recente
      latestAal = (data.session?.user as any)?.aal;

      // Se a sessão mais recente não tiver AAL (ex: após verifyOtp), verifica a do hook
      if (latestAal === undefined && authSession) {
         latestAal = (authSession.user as any)?.aal;
      }

      setCurrentAal(latestAal);
      console.log('🔀 AuthRedirect: AAL determined:', latestAal);
    };

    if (user) { // Só busca AAL se houver usuário
      fetchAal();
    } else {
      setCurrentAal(null); // Limpa AAL se não há usuário
    }
  }, [user, authSession]); // Reavalia AAL quando user ou authSession mudam


  useEffect(() => {
    console.log('🔀 AuthRedirect: checking auth state', { user: !!user, loading, pathname: location.pathname, currentAal, fromLogin: location.state?.fromLogin });

    // Espera carregar user E AAL ter um valor definido
    if (loading || currentAal === undefined) {
      console.log('🔀 AuthRedirect: still loading user or AAL, waiting...');
      return;
    }

    // REGRA 1: Se estiver na página de Login, NÃO FAÇA NADA.
    if (location.pathname === '/login') {
      console.log('🔀 AuthRedirect: On /login page. Doing nothing.');
      return;
    }

    // REGRA 2: Se NÃO estiver logado E tentar acessar rota protegida, vá para /login.
    if (!user) {
      if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/agenda')) {
        console.log('🔀 AuthRedirect: No user, accessing protected route. Redirecting to /login.');
        navigate('/login', { replace: true });
        return;
      }
      console.log('🔀 AuthRedirect: No user, staying on public route:', location.pathname);
      return;
    }

    // REGRA 3: Se ESTIVER logado...
    if (user) {
      // --- CORREÇÃO DA REGRA 3a ---
      // Redireciona para /login se precisar de 2FA (aal1)
      // E NÃO estiver vindo diretamente do processo de login (fromLogin)
      if (currentAal === 'aal1' && !location.state?.fromLogin) {
        console.log('🔀 AuthRedirect: User needs 2FA (aal1), not coming from login. Redirecting to /login.');
        // Não precisamos deslogar aqui, apenas redirecionar
        navigate('/login', { replace: true });
        return;
      }
      // Se currentAal é 'aal1' MAS location.state.fromLogin é TRUE,
      // significa que estamos INDO para o dashboard logo após o 2FA.
      // Neste caso, NÃO fazemos nada e permitimos o acesso.
      // --- FIM DA CORREÇÃO ---


      // REGRA 3b: Totalmente autenticado e tenta acessar '/', vá para /dashboard.
      if (currentAal !== 'aal1' && location.pathname === '/') {
         console.log('🔀 AuthRedirect: Fully logged in user landed on /. Redirecting to /dashboard.');
         navigate('/dashboard', { replace: true });
         return;
      }
    }

    console.log('🔀 AuthRedirect: User is logged in, no special redirect needed from:', location.pathname);

  }, [user, loading, location.pathname, navigate, currentAal, authSession, location.state]); // Adicionado location.state

  return null;
}