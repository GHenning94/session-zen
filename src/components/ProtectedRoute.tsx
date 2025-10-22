import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
// Não precisamos mais do supabase client aqui

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  // --- ESTADO DE CARREGAMENTO INICIAL ---
  if (authLoading) {
    console.log('🔒 ProtectedRoute (Ultra Simples): Loading...');
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
    // Guarda a página original para redirecionar de volta depois
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Se HÁ usuário -> Permite acesso
  //    Confiamos que o Login.tsx só nos enviou para cá APÓS completar o 2FA.
  console.log('🔒 ProtectedRoute (Ultra Simples): Acesso Permitido (User exists).');
  return <>{children}</>;

};

export default ProtectedRoute;