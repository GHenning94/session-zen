import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth(); // Não precisamos mais da session aqui
  const location = useLocation();
  const [aalStatus, setAalStatus] = useState<'loading' | 'aal1' | 'aal2+'>('loading');
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  useEffect(() => {
    // Verifica o nível AAL de forma assíncrona
    const checkAal = async () => {
      setAalStatus('loading'); // Reinicia a verificação
      if (!user) {
        setAalStatus('aal2+'); // Sem user, não há AAL
        setInitialCheckComplete(true);
        return;
      }

      try {
        // Busca a sessão MAIS RECENTE para obter o AAL
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentAal = (data.session?.user as any)?.aal;
        console.log('🔒 ProtectedRoute: AAL Check:', currentAal);

        if (currentAal === 'aal1') {
          setAalStatus('aal1');
        } else {
          setAalStatus('aal2+'); // aal2 ou null/undefined
        }
      } catch (error) {
        console.error("🔒 ProtectedRoute: Erro ao buscar sessão para verificar AAL:", error);
        // Em caso de erro, assume aal1 por segurança para forçar login
        setAalStatus('aal1');
      } finally {
         setInitialCheckComplete(true);
      }
    };

    if (!authLoading) {
      checkAal();
    } else {
      setInitialCheckComplete(false);
      setAalStatus('loading');
    }
  // Re-verifica se o user ou authLoading mudam
  }, [user, authLoading]); // Removido authSession e location.pathname daqui

  // --- ESTADO DE CARREGAMENTO ---
  if (authLoading || !initialCheckComplete) {
    console.log('🔒 ProtectedRoute: Loading...', { authLoading, initialCheckComplete });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- LÓGICA DE REDIRECIONAMENTO ---

  // 1. Se NÃO há usuário -> Redireciona para /login
  if (!user) {
    console.log(`🔒 ProtectedRoute: Acesso negado (No User). Redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- CORREÇÃO DEFINITIVA ---
  // 2. Se HÁ usuário, verificamos se o acesso é permitido:
  //    Permitido se:
  //    a) O AAL NÃO é 'aal1' (ou seja, já está totalmente autenticado)
  //    OU
  //    b) Acabou de vir do processo de login bem-sucedido (flag fromLogin)
  const isFullyAuthenticated = aalStatus !== 'aal1';
  const justLoggedIn = location.state?.fromLogin === true;

  if (isFullyAuthenticated || justLoggedIn) {
    console.log('🔒 ProtectedRoute: Acesso Permitido.', { user: !!user, aalStatus, justLoggedIn });
    // Limpa o estado 'fromLogin' para evitar problemas se o usuário navegar
    // de volta para cá sem passar pelo login novamente (opcional, mas boa prática)
    if (justLoggedIn) {
        const state = { ...location.state };
        delete state.fromLogin;
        // eslint-disable-next-line react-hooks/exhaustive-deps
        history.replaceState(state, ''); // Usando history API diretamente ou via hook do router
    }
    return <>{children}</>;
  } else {
    // Se chegou aqui, significa que: user existe, AAL é 'aal1', E NÃO veio do login.
    console.log(`🔒 ProtectedRoute: Acesso negado (AAL1 detected, not immediately after login). Redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // --- FIM DA CORREÇÃO ---
};

export default ProtectedRoute;