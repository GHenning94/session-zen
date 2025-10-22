import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const AuthRedirect = () => {
  const { user, loading } = useAuth(); // Só precisamos saber se há um usuário ou não
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔀 AuthRedirect (Simplificado): Verificando estado', { user: !!user, loading, pathname: location.pathname });

    if (loading) {
      console.log('🔀 AuthRedirect (Simplificado): Aguardando carregamento...');
      return;
    }

    // REGRA 1: Se NÃO há usuário E está tentando acessar rota protegida -> Manda para /login
    if (!user && (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/agenda'))) {
      // Adicione outras rotas protegidas aqui se necessário
      console.log('🔀 AuthRedirect (Simplificado): Sem usuário, acessando rota protegida. Redirecionando para /login.');
      navigate('/login', { replace: true });
      return;
    }

    // REGRA 2: Se HÁ usuário -> NÃO FAZ NADA AQUI.
    if (user) {
        console.log('🔀 AuthRedirect (Simplificado): Usuário existe. Nenhuma ação de redirecionamento necessária a partir daqui.');
        return;
    }

    // Se não caiu em nenhuma regra acima (ex: não logado em página pública), não faz nada.
    console.log('🔀 AuthRedirect (Simplificado): Nenhuma regra de redirecionamento acionada.');

  }, [user, loading, location.pathname, navigate]);

  return null;
}