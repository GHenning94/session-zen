import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

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
    console.log(`🔒 ProtectedRoute: Acesso negado (No User). Redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. NOVO: Verificar confirmação de e-mail estrita
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const checkEmailConfirmation = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email_confirmed_strict')
        .eq('user_id', user.id)
        .single();

      if (!profile?.email_confirmed_strict) {
        console.log('🔒 ProtectedRoute: Email não confirmado (strict), bloqueando acesso');
        await supabase.auth.signOut();
        setEmailVerified(false);
      } else {
        setEmailVerified(true);
      }
    };

    checkEmailConfirmation();
  }, [user]);

  // Aguardar verificação de e-mail
  if (emailVerified === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se e-mail não confirmado, redirecionar
  if (emailVerified === false) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          message: 'Por favor, confirme seu e-mail antes de acessar a plataforma. Verifique sua caixa de entrada.',
          variant: 'destructive'
        }} 
        replace 
      />
    );
  }

  // 3. Se HÁ usuário e e-mail confirmado -> Permite acesso
  console.log('🔒 ProtectedRoute: Acesso Permitido (User exists & email confirmed).');
  return <>{children}</>;

};

export default ProtectedRoute;