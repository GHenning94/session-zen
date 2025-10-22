import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const AuthRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔀 AuthRedirect: checking auth state', { user: !!user, loading, pathname: location.pathname });

    if (loading) {
      console.log('🔀 AuthRedirect: still loading, waiting...');
      return;
    }

    // --- LÓGICA FINAL ---

    // REGRA 1: Se estiver na página de Login, NÃO FAÇA NADA. Deixe Login.tsx controlar.
    if (location.pathname === '/login') {
      console.log('🔀 AuthRedirect: On /login page. Doing nothing, letting Login.tsx handle flow.');
      return;
    }

    // REGRA 2: Se NÃO estiver logado E tentar acessar rota protegida, vá para /login.
    if (!user) {
      // (Adicione mais rotas protegidas se necessário)
      if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/agenda')) {
        console.log('🔀 AuthRedirect: No user, accessing protected route. Redirecting to /login.');
        navigate('/login', { replace: true });
        return;
      }
      console.log('🔀 AuthRedirect: No user, staying on public route:', location.pathname);
      return;
    }

    // REGRA 3: Se ESTIVER logado E tentar acessar '/' (landing page), vá para /dashboard.
    // (Isso assume que usuários logados não devem ver a landing page)
    if (user && location.pathname === '/') {
       console.log('🔀 AuthRedirect: User is logged in and landed on /. Redirecting to /dashboard.');
       navigate('/dashboard', { replace: true });
       return;
    }

    // Em todos os outros casos (logado no dashboard, etc.), deixe onde está.
    console.log('🔀 AuthRedirect: User is logged in, no special redirect needed from:', location.pathname);

  }, [user, loading, location.pathname, navigate]); // Removido location.state

  return null;
}