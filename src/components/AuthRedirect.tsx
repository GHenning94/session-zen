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
      // Prioriza a sessão do hook se já estiver atualizada
      if (user && authSession) {
        const userAal = (authSession.user as any)?.aal;
        // Se a sessão do hook ainda mostra aal1, busca de novo para pegar a mais recente
        if (userAal === 'aal1') {
           console.log('🔀 AuthRedirect: AuthSession shows aal1, fetching latest session...');
           const { data } = await supabase.auth.getSession();
           const latestAal = (data.session?.user as any)?.aal;
           setCurrentAal(latestAal);
           console.log('🔀 AuthRedirect: AAL fetched manually after hook showed aal1:', latestAal);
        } else {
          setCurrentAal(userAal);
          console.log('🔀 AuthRedirect: AAL from authSession:', userAal);
        }
      } else if (user && !authSession) {
         const { data } = await supabase.auth.getSession();
         const userAal = (data.session?.user as any)?.aal;
         setCurrentAal(userAal);
         console.log('🔀 AuthRedirect: AAL fetched manually (no authSession):', userAal);
      } else {
        setCurrentAal(null);
      }
    };
    fetchAal();
  }, [user, authSession]);


  useEffect(() => {
    console.log('🔀 AuthRedirect: checking auth state', { user: !!user, loading, pathname: location.pathname, currentAal });

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
      // E ESTIVER TENTANDO ACESSAR UMA ROTA PROTEGIDA DIRETAMENTE
      // REMOVIDO o signOut daqui. Apenas redireciona.
      if (currentAal === 'aal1' && location.pathname !== '/login') { // Simplificado: Se AAL1 e não está no login, volta pro login
        console.log('🔀 AuthRedirect: User needs 2FA (aal1) but is not on /login. Redirecting to /login.');
        // supabase.auth.signOut().catch(e => console.error("Error signing out in AuthRedirect:", e)); // <-- REMOVIDO
        navigate('/login', { replace: true });
        return;
      }
      // --- FIM DA CORREÇÃO ---

      // REGRA 3b: Totalmente autenticado e tenta acessar '/', vá para /dashboard.
      if (currentAal !== 'aal1' && location.pathname === '/') {
         console.log('🔀 AuthRedirect: Fully logged in user landed on /. Redirecting to /dashboard.');
         navigate('/dashboard', { replace: true });
         return;
      }
    }

    console.log('🔀 AuthRedirect: User is logged in, no special redirect needed from:', location.pathname);

  }, [user, loading, location.pathname, navigate, currentAal, authSession]); // Removido location.state que não era necessário aqui

  return null;
}