import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [aalStatus, setAalStatus] = useState<'loading' | 'aal1' | 'aal2+'>('loading');
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Verifica o nível AAL de forma assíncrona, apenas como verificação secundária
  useEffect(() => {
    const checkAal = async () => {
      if (!user) {
        setAalStatus('aal2+'); // Sem user, não há AAL
        setInitialCheckComplete(true);
        return;
      }
      // Não reinicia para 'loading' aqui para evitar piscar
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const currentAal = (data.session?.user as any)?.aal;
        console.log('🔒 ProtectedRoute: AAL Check (background):', currentAal);
        setAalStatus(currentAal === 'aal1' ? 'aal1' : 'aal2+');
      } catch (error) {
        console.error("🔒 ProtectedRoute: Erro ao buscar sessão para verificar AAL:", error);
        setAalStatus('aal1'); // Assume aal1 em caso de erro por segurança
      } finally {
         setInitialCheckComplete(true);
      }
    };

    // Só começa a verificar AAL depois que useAuth carregou
    if (!authLoading) {
      checkAal();
    } else {
      // Enquanto useAuth carrega, marca como não completo e aal loading
      setInitialCheckComplete(false);
      setAalStatus('loading');
    }
  }, [user, authLoading]);

  // --- ESTADO DE CARREGAMENTO INICIAL ---
  // Mostra loading apenas enquanto o useAuth carrega pela primeira vez
  if (authLoading && !initialCheckComplete) {
     console.log('🔒 ProtectedRoute: Initial Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- LÓGICA DE REDIRECIONAMENTO ---

  // PRIORIDADE MÁXIMA: Acabou de vir do processo de login bem-sucedido?
  const justLoggedIn = location.state?.fromLogin === true;
  if (justLoggedIn) {
    console.log('🔒 ProtectedRoute: Acesso Permitido (Just Logged In).', { user: !!user, aalStatus });
    // Opcional: Limpar o estado 'fromLogin' para futuras navegações
    // const state = { ...location.state };
    // delete state.fromLogin;
    // window.history.replaceState(state, ''); // Usar API de histórico
    return <>{children}</>;
  }

  // Se NÃO veio do login, aplicamos as verificações normais:

  // 1. NÃO há utilizador? -> Redireciona para /login
  if (!user) {
    console.log(`🔒 ProtectedRoute: Acesso negado (No User). Redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. HÁ utilizador, MAS AAL ainda é 'aal1'? -> Redireciona para /login
  //    (Isso só deve acontecer se o utilizador tentar aceder diretamente via URL com sessão aal1)
  if (aalStatus === 'aal1') {
     console.log(`🔒 ProtectedRoute: Acesso negado (AAL1 detected, not immediately after login). Redirecionando para /login.`);
     return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se chegou aqui: utilizador existe, não veio do login direto, e AAL não é aal1 -> Permite acesso
  console.log('🔒 ProtectedRoute: Acesso Permitido (Existing valid session).', { user: !!user, aalStatus });
  return <>{children}</>;
};

export default ProtectedRoute;