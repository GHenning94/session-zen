import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingState } from '@/components/LoadingState'

// Rotas públicas que não devem ser redirecionadas
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/reset-password', '/auth-confirm', '/auth-callback']

const AuthRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Ignorar rotas públicas e rotas de agendamento/registro/admin
      const currentPath = location.pathname
      const isPublicRoute = PUBLIC_ROUTES.includes(currentPath) || 
                           currentPath.startsWith('/agendar/') || 
                           currentPath.startsWith('/register/') ||
                           currentPath === '/admin' ||
                           currentPath.startsWith('/admin/')
      
      if (isPublicRoute) {
        console.log('[AuthRedirect] 🌐 Rota pública detectada, sem redirecionamento')
        setIsProcessing(false)
        return
      }

      console.log('[AuthRedirect] 🚀 Iniciando redirecionamento de autenticação')

      // Verificar se está em processo de confirmação de email
      const isConfirming = sessionStorage.getItem('IS_CONFIRMING_AUTH')
      if (isConfirming === 'true') {
        console.log('[AuthRedirect] ⏸️ Processo de confirmação em andamento, aguardando...')
        setIsProcessing(false)
        return
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[AuthRedirect] ❌ Erro ao obter sessão:', sessionError)
          setIsProcessing(false)
          return
        }

        if (!session?.user) {
          console.log('[AuthRedirect] ❌ Sem sessão ativa, redirecionando para login')
          // Se não for rota pública e não tiver sessão, deve ir para o login
          navigate('/login', { replace: true });
          return
        }

        console.log('[AuthRedirect] ✅ Sessão ativa encontrada, user_id:', session.user.id)

        // Verificar se o email foi confirmado
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email_confirmed_strict, subscription_plan')
          .eq('user_id', session.user.id)
          .single()

        if (profileError) {
          console.error('[AuthRedirect] ❌ Erro ao carregar perfil:', profileError)
          navigate('/login')
          return
        }

        if (!profile?.email_confirmed_strict) {
          console.log('[AuthRedirect] ⚠️ Email não confirmado, redirecionando para login')
          await supabase.auth.signOut()
          navigate('/login', {
            state: {
              message: 'Por favor, confirme seu e-mail antes de fazer login.',
              variant: 'destructive'
            }
          })
          return
        }

        console.log('[AuthRedirect] ✅ Email confirmado')

        // **** CORREÇÃO DA LÓGICA APLICADA AQUI ****

        const subscriptionPlan = profile.subscription_plan

        // CASO 1: Utilizador NÃO TEM plano
        if (!subscriptionPlan || subscriptionPlan === '') {
          // Se não tem plano, DEVE estar na página /welcome
          if (currentPath !== '/welcome') {
            console.log('[AuthRedirect] 📋 Sem plano definido, forçando para /welcome');
            navigate('/welcome', { replace: true });
            return; // Importante
          }
        } 
        // CASO 2: Utilizador TEM plano
        else {
          // Se tem plano, NÃO DEVE estar na página /welcome
          if (currentPath === '/welcome') {
            console.log('[AuthRedirect] 💳 Plano ativo, saindo de /welcome para /dashboard');
            navigate('/dashboard', { replace: true });
            return; // Importante
          }
        }
        
        // Se chegámos aqui, está tudo bem (Ex: tem plano e está em /agenda)
        console.log('[AuthRedirect] ✅ Verificações completas, sem redirecionamento necessário.');

      } catch (error) {
        console.error('[AuthRedirect] ❌ Erro inesperado:', error)
        navigate('/login')
      } finally {
        setIsProcessing(false)
      }
    }

    handleAuthRedirect()
  }, [navigate, location.pathname])

  if (!isProcessing) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingState text="Verificando autenticação..." />
    </div>
  )
}

export default AuthRedirect