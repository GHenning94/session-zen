import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
// Não precisamos mais do supabase client aqui

export const AuthRedirect = () => {
  const { user, loading } = useAuth(); // Só precisamos saber se há um usuário
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔀 AuthRedirect: checking auth state', { user: !!user, loading, pathname: location.pathname });

    if (loading) {
      console.log('🔀 AuthRedirect: still loading, waiting...');
      return;
    }

    // --- LÓGICA SIMPLIFICADA ---

    // CASO 1: Usuário NÃO está logado
    if (!user) {
      // Se ele tentar acessar uma rota protegida (ex: /dashboard), mande para /login
      // (Você pode adicionar mais rotas protegidas aqui se precisar)
      if (location.pathname.startsWith('/dashboard')) {
        console.log('🔀 AuthRedirect: No user, accessing protected route. Redirecting to /login.');
        navigate('/login', { replace: true });
        return;
      }
      // Se não está logado e não está em rota protegida, deixe onde está.
      console.log('🔀 AuthRedirect: No user, staying on public route:', location.pathname);
      return;
    }

    // CASO 2: Usuário ESTÁ logado
    if (user) {
      // Se ele está logado e tenta ir para /login (ex: digitou URL, clicou Voltar)
      // E NÃO está vindo imediatamente do processo de login (para evitar conflito com 2FA)
      // Mandamos ele para o dashboard.
      // A checagem !location.state?.fromLogin previne o redirect logo após o signInWithPassword
      if (location.pathname === '/login' && !location.state?.fromLogin) {
         console.log('🔀 AuthRedirect: User is logged in and landed on /login. Redirecting to /dashboard.');
         navigate('/dashboard', { replace: true });
         return;
      }

      // Se ele está logado e acabou de fazer login vindo da Landing Page ('/')
      // Mandamos ele para o dashboard.
      if (location.pathname === '/' && location.state?.fromLogin) {
        console.log('🔀 AuthRedirect: user just logged in from Landing Page, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }

       // Em todos os outros casos (logado no dashboard, logado no /login esperando 2FA, etc.)
       // Deixe o usuário onde está. O Login.tsx cuidará do fluxo pós-login/2FA.
       console.log('🔀 AuthRedirect: User is logged in, no redirect needed from:', location.pathname);
    }

  }, [user, loading, location.pathname, location.state, navigate]); // Removido authSession

  return null;
}