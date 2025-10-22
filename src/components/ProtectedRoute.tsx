import { ReactNode, useState, useEffect } from 'react'; // Adicionado useState, useEffect
import { Navigate, useLocation } from 'react-router-dom'; // Adicionado useLocation
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client'; // Importar supabase

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading, session: authSession } = useAuth(); // Usar a sessão do hook
  const location = useLocation();
  const [aalStatus, setAalStatus] = useState<'loading' | 'aal1' | 'aal2+'>('loading');

  useEffect(() => {
    // Verifica o nível AAL quando o utilizador ou a sessão mudam
    const checkAal = async () => {
      setAalStatus('loading'); // Começa a verificar
      if (!user) {
        setAalStatus('aal2+'); // Se não há utilizador, não precisa de 2FA (será redirecionado de qualquer forma)
        return;
      }

      // Tenta obter a sessão mais recente para o AAL mais atualizado
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentAal = (data.session?.user as any)?.aal;
        console.log('🔒 ProtectedRoute: AAL Check:', currentAal);

        if (currentAal === 'aal1') {
          setAalStatus('aal1'); // Utilizador logado mas 2FA pendente
        } else {
          setAalStatus('aal2+'); // Utilizador totalmente autenticado (aal2 ou sem aal)
        }
      } catch (error) {
        console.error("🔒 ProtectedRoute: Erro ao buscar sessão para verificar AAL:", error);
        // Em caso de erro, por segurança, assume que precisa verificar (força login)
        // ou poderia tentar usar o authSession como fallback
         const fallbackAal = (authSession?.user as any)?.aal;
         if (fallbackAal === 'aal1') {
           setAalStatus('aal1');
         } else {
           // Se der erro e o fallback não for aal1, permite o acesso (com um aviso)
           console.warn("🔒 ProtectedRoute: Permitindo acesso apesar do erro na busca de sessão.");
           setAalStatus('aal2+');
           // Alternativamente, poderia redirecionar para login aqui por segurança total
           // setAalStatus('aal1'); // Forçaria login
         }
      }
    };

    if (!authLoading) { // Só verifica AAL depois que o useAuth carregou
      checkAal();
    }

  }, [user, authLoading, authSession, location.pathname]); // Re-verifica se a rota mudar

  // Estado de Carregamento (do useAuth ou da verificação AAL)
  if (authLoading || aalStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não há utilizador OU se precisa de 2FA -> Redireciona para /login
  if (!user || aalStatus === 'aal1') {
    console.log(`🔒 ProtectedRoute: Acesso negado. Redirecionando para /login. User: ${!!user}, AAL Status: ${aalStatus}`);
    // Guarda a página que o utilizador tentou aceder para redirecionar de volta após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se chegou aqui, o utilizador existe e está totalmente autenticado
  console.log('🔒 ProtectedRoute: Acesso permitido.');
  return <>{children}</>;
};

export default ProtectedRoute;