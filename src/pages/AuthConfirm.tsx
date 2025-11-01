import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'

const AuthConfirm = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // 1) Novo fluxo com token_hash e type na query
        const params = new URLSearchParams(window.location.search)
        const type = params.get('type') as 'signup' | 'recovery' | 'email_change' | null
        const tokenHash = params.get('token_hash')

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash
          })
          if (error) throw error

          // NOVO: Se for confirmação de signup, marcar email_confirmed_strict
          if (type === 'signup') {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await supabase
                .from('profiles')
                .update({ email_confirmed_strict: true })
                .eq('user_id', user.id)
            }
          }

          setStatus('success')
        } else {
          // 2) Fallback: algumas confirmações chegam com access_token no hash (#)
          const hash = window.location.hash
          if (hash && hash.includes('access_token')) {
            // Supabase SDK processa automaticamente o hash ao carregar; considerar sucesso
            // Para fallback, verificar se podemos marcar como signup
            const { data: { user } } = await supabase.auth.getUser()
            if (user && type === 'signup') {
              await supabase
                .from('profiles')
                .update({ email_confirmed_strict: true })
                .eq('user_id', user.id)
            }
            setStatus('success')
          } else if (params.get('error')) {
            setStatus('error')
          } else {
            // Sem parâmetros reconhecidos: considerar erro
            setStatus('error')
          }
        }
      } catch (err) {
        console.error('Email confirmation error:', err)
        setStatus('error')
      }
    }

    confirmEmail()

    return () => {}
  }, [navigate])

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/login')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [status, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
              </div>
              <CardTitle>Confirmando E-mail</CardTitle>
              <CardDescription>Aguarde enquanto validamos seu e-mail...</CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle>E-mail Confirmado!</CardTitle>
              <CardDescription>
                Seu e-mail foi confirmado com sucesso. Você será redirecionado para a tela de login em {countdown} segundo{countdown !== 1 ? 's' : ''}...
              </CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle>Erro na Confirmação</CardTitle>
              <CardDescription>
                Não foi possível confirmar seu e-mail. O link pode ter expirado ou já foi utilizado.
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        {status === 'error' && (
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Voltar para o Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default AuthConfirm
