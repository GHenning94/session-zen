import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: subLoading } = useSubscription();
  const location = useLocation();

  // O app está carregando apenas se Auth estiver carregando
  const isLoading = authLoading;

  // --- ESTADO DE CARREGAMENTO INICIAL ---
  if (isLoading) {
    console.log('🔒 ProtectedRoute: Carregando autenticação...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // --- LÓGICA DE REDIRECIONAMENTO ---

  // Se NÃO há usuário -> Redireciona para /login
  if (!user) {
    console.log('🔒 ProtectedRoute: Sem usuário autenticado. Redirecionando para /login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se HÁ usuário válido -> Permite acesso
  console.log('🔒 ProtectedRoute: Acesso permitido para usuário:', user.id);
  return <>{children}</>;
};

export default ProtectedRoute;