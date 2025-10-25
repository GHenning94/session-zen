import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription'; 

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: subLoading } = useSubscription(); // Carrega em paralelo, não bloqueia UI
  const location = useLocation();

  // O app está carregando apenas se Auth estiver carregando (subscription não bloqueia)
  const isLoading = authLoading;

  // --- ESTADO DE CARREGAMENTO INICIAL ---
  if (isLoading) {
    console.log('🔒 ProtectedRoute: Loading auth or subscription...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- LÓGICA DE REDIRECIONAMENTO ---

  // 1. Se NÃO há usuário -> Redireciona para /login
  if (!user) {
    console.log(`🔒 ProtectedRoute (Ultra Simples): Acesso negado (No User). Redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Se HÁ usuário -> Permite acesso
  console.log('🔒 ProtectedRoute (Ultra Simples): Acesso Permitido (User exists & subscription loaded).');
  return <>{children}</>;

};

export default ProtectedRoute;