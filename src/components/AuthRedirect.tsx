import { useEffect, useState } from 'react'; // Adicionado useState
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

export const AuthRedirect = () => {
  const { user, loading, session: authSession } = useAuth(); // Pegar session do hook
  const navigate = useNavigate();
  const location = useLocation();
  const [currentAal, setCurrentAal] = useState<string | null | undefined>(undefined); // Estado para AAL

  useEffect(() => {
    // Busca o AAL quando a sessão muda ou ao carregar
    const fetchAal = async () => {
      if (user && authSession) { // Usa a sessão do hook se disponível
         // Usando 'as any' para acessar 'aal'
        const userAal = (authSession.user as any)?.aal;
        setCurrentAal(userAal);
        console.log('🔀 AuthRedirect: AAL from authSession:', userAal);
      } else if (user && !authSession) {
         // Se temos user mas não sessão (pode acontecer brevemente), busca sessão
         const { data } = await supabase.auth.getSession();
         const userAal = (data.session?.user as any)?.aal;
         setCurrentAal(userAal);
         console.log('🔀 AuthRedirect: AAL fetched manually:', userAal);
      } else {
        setCurrentAal(null); // Sem usuário, AAL é null
      }
    };
    fetchAal();
  }, [user, authSession]); // Depende de user e authSession


  useEffect(() => {
    // Lógica de redirecionamento agora usa currentAal
    console.log('🔀 AuthRedirect: checking auth state', { user: !!user, loading, pathname: location.pathname, currentAal });

    if (loading || currentAal === undefined) { // Espera carregar user E AAL
      console.log('🔀 AuthRedirect: still loading user or AAL, waiting...');
      return;
    }

    // REGRA 1: Se estiver na página de Login, NÃO FAÇA NADA. Deixe Login.tsx controlar.
    if (location.pathname === '/login') {
      console.log('🔀 AuthRedirect: On /login page. Doing nothing.');
      return;
    }

    // REGRA 2: Se NÃO estiver logado E tentar acessar rota protegida, vá para /login.
    if (!user) {
      if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/agenda')) { // Adicione suas rotas protegidas
        console.log('🔀 AuthRedirect: No user, accessing protected route. Redirecting to /login.');
        navigate('/login', { replace: true });
        return;
      }
      console.log('🔀 AuthRedirect: No user, staying on public route:', location.pathname);
      return;
    }

    // REGRA 3: Se ESTIVER logado...
    if (user) {
      // REGRA 3a: ...mas AINDA PRECISA de 2FA (aal1) e NÃO está em /login, mande para /login.
      if (currentAal === 'aal1') {
        console.log('🔀 AuthRedirect: User needs 2FA (aal1) but is not on /login. Redirecting to /login.');
        // Forçar signOut aqui pode ser uma segurança extra, caso o cleanup do Login falhe
        supabase.auth.signOut().catch(e => console.error("Error signing out in AuthRedirect:", e));
        navigate('/login', { replace: true });
        return;
      }

      // REGRA 3b: ...e está totalmente autenticado (aal2 ou null/undefined após aal1) E tenta acessar '/', vá para /dashboard.
      if (currentAal !== 'aal1' && location.pathname === '/') {
         console.log('🔀 AuthRedirect: Fully logged in user landed on /. Redirecting to /dashboard.');
         navigate('/dashboard', { replace: true });
         return;
      }
    }

    // Em todos os outros casos (logado e em /dashboard, etc.), deixe onde está.
    console.log('🔀 AuthRedirect: User is logged in, no special redirect needed from:', location.pathname);

  }, [user, loading, location.pathname, navigate, currentAal, authSession]); // Adicionado authSession como dependência também

  return null;
}