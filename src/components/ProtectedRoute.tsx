import { ReactNode, useState, useEffect, useRef } from 'react'; // Adicionado useRef
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
  // --- NOVA FLAG com useRef ---
  // useRef persiste entre renders. Usamos para "lembrar" se acabámos de vir do login.
  const justLoggedInRef = useRef(location.state?.fromLogin === true);
  // --- FIM DA NOVA FLAG ---

  // Verifica o nível AAL de forma assíncrona
  useEffect(() => {
    const checkAal = async () => {
      if (!user) {
        setAalStatus('aal2+');
        setInitialCheckComplete(true);
        return;
      }
      // Não reinicia para 'loading' aqui para evitar piscar
      try {
        const { data, error } = await supabase.auth.getSession(); // Busca sempre a sessão mais recente
        if (error) throw error;
        const currentAal = (data.session?.user as any)?.aal;
        console.log('🔒 ProtectedRoute: AAL Check (background):', currentAal);
        setAalStatus(currentAal === 'aal1' ? 'aal1' : 'aal2+');

        // Se o AAL agora é aal2+, resetamos a flag justLoggedInRef
        // para que futuras verificações apliquem a segurança normal
        if (currentAal !== 'aal1') {
          justLoggedInRef.current = false;
        }

      } catch (error) {
        console.error("🔒 ProtectedRoute: Erro ao buscar sessão para verificar AAL:", error);
        setAalStatus('aal1'); // Assume aal1 em caso de erro
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
  }, [user, authLoading]);

  // --- ATUALIZA A FLAG justLoggedInRef QUANDO location.state MUDA ---
  // Isso garante que capturamos a flag na primeira renderização após o redirect
  useEffect(() => {
    if (location.state?.fromLogin === true) {
      console.log("🔒 ProtectedRoute: Flag 'fromLogin' detetada no estado da localização.");
      justLoggedInRef.current = true;
      // Limpa o estado da localização para não ficar preso
      const state = { ...location.state };
      delete state.fromLogin;
      window.history.replaceState(state, '');
    }
  }, [location.state]);
  // --- FIM DA ATUALIZAÇÃO DA FLAG ---


  // --- ESTADO DE CARREGAMENTO INICIAL ---
  if (authLoading || !initialCheckComplete) {
     console.log('🔒 ProtectedRoute: Initial Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- LÓGICA DE REDIRECIONAMENTO ---

  // PRIORIDADE MÁXIMA: Usamos a flag persistente justLoggedInRef.current
  if (justLoggedInRef.current === true) {
    console.log('🔒 ProtectedRoute: Acesso Permitido (Just Logged In Ref).', { user: !!user, aalStatus });
    // Não resetamos a flag aqui ainda, esperamos o AAL confirmar aal2+ no useEffect
    return <>{children}</>;
  }

  // Se NÃO veio do login (ou a flag já foi resetada), aplicamos as verificações normais:

  // 1. NÃO há utilizador? -> Redireciona para /login
  if (!user) {
    console.log(`🔒 ProtectedRoute: Acesso negado (No User). Redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. HÁ utilizador, MAS AAL ainda é 'aal1'? -> Redireciona para /login
  if (aalStatus === 'aal1') {
     console.log(`🔒 ProtectedRoute: Acesso negado (AAL1 detected, not immediately after login). Redirecionando para /login.`);
     return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se chegou aqui: utilizador existe, não veio do login direto (ou já estabilizou), e AAL não é aal1 -> Permite acesso
  console.log('🔒 ProtectedRoute: Acesso Permitido (Existing valid session).', { user: !!user, aalStatus });
  return <>{children}</>;
};

export default ProtectedRoute;