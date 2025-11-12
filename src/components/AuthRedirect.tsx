import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

// Rotas públicas que não devem ser redirecionadas
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/reset-password', '/auth-confirm', '/auth-callback']

const AuthRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Ignorar rotas públicas e rotas de agendamento/registro
      const currentPath = location.pathname
      const isPublicRoute = PUBLIC_ROUTES.includes(currentPath) || 
                           currentPath.startsWith('/agendar/') || 
                           currentPath.startsWith('/register/')
      
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
          console.log('[AuthRedirect] ❌ Sem sessão ativa, sem redirecionamento necessário')
          setIsProcessing(false)
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

        // Verificar se o usuário tem plano definido
        const subscriptionPlan = profile.subscription_plan

        if (!subscriptionPlan || subscriptionPlan === '') {
          console.log('[AuthRedirect] 📋 Sem plano definido, redirecionando para Welcome')
          navigate('/welcome', { replace: true })
          return
        }

        console.log('[AuthRedirect] 💳 Plano ativo:', subscriptionPlan, '- redirecionando para Dashboard')
        navigate('/dashboard', { replace: true })

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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Verificando autenticação...</p>
      </div>
    </div>
  )
}

export default AuthRedirect