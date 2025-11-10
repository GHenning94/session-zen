import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const AuthConfirm = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const type = params.get('type') as 'signup' | 'recovery' | 'email_change' | 'magiclink' | null
        const tokenHash = params.get('token_hash')
        const nonce = params.get('n')
        const hash = window.location.hash

        console.log('[AuthConfirm] Iniciando confirmação', { 
          type, 
          hasTokenHash: !!tokenHash, 
          hasNonce: !!nonce,
          hasHash: !!hash 
        })

        // FORMATO A: Hash com access_token e refresh_token (retorno oficial do Supabase)
        if (hash && hash.includes('access_token')) {
          console.log('[AuthConfirm] Formato A detectado: hash com access_token')
          
          const hashParams = new URLSearchParams(hash.slice(1))
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')
          
          if (access_token && refresh_token) {
            console.log('[AuthConfirm] Aplicando setSession com tokens do hash...')
            const { error: sessionError } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            })
            
            if (sessionError) {
              throw new Error(`Erro ao criar sessão: ${sessionError.message}`)
            }
            
            // Polling para garantir que sessão está estabelecida
            let sessionEstablished = false
            for (let i = 0; i < 20; i++) {
              await new Promise(resolve => setTimeout(resolve, 500))
              const { data: { session } } = await supabase.auth.getSession()
              
              if (session?.user) {
                console.log('[AuthConfirm] ✅ Sessão estabelecida após', i + 1, 'tentativas')
                sessionEstablished = true
                break
              }
            }

            if (!sessionEstablished) {
              throw new Error('Não foi possível estabelecer a sessão após setSession')
            }

            // Invocar confirm-email-strict
            console.log('[AuthConfirm] Invocando confirm-email-strict...')
            const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
              'confirm-email-strict', 
              { body: { nonce: nonce || null } }
            )

            if (confirmError) {
              console.error('[AuthConfirm] Erro na confirmação strict:', confirmError)
              
              if (confirmError.message?.includes('inválido') || confirmError.message?.includes('expirado')) {
                await supabase.auth.signOut()
                throw new Error(confirmError.message)
              }
              
              throw new Error('Erro ao confirmar e-mail. Tente novamente.')
            }

            if (!confirmData?.success) {
              throw new Error('Falha na confirmação do e-mail')
            }

            console.log('[AuthConfirm] ✅ E-mail confirmado com sucesso!')
            setStatus('success')
            toast.success('Email confirmado com sucesso!')
            return
          }
        }

        // FORMATO B: token_hash na query string (e-mail custom ou link direto)
        if (tokenHash) {
          console.log('[AuthConfirm] Formato B detectado: token_hash na query')
          
          // Tentar tipos possíveis (com alternância signup/magiclink)
          const typesToTry: Array<'signup' | 'magiclink' | 'recovery' | 'email_change'> = []
          
          if (type === 'signup' || type === 'magiclink') {
            typesToTry.push(type)
            // Alternativa
            typesToTry.push(type === 'signup' ? 'magiclink' : 'signup')
          } else if (type === 'recovery' || type === 'email_change') {
            typesToTry.push(type)
          } else {
            // Default: tentar signup e magiclink
            typesToTry.push('magiclink', 'signup')
          }

          let verifiedDirectly = false
          
          // Tentativa 1: verifyOtp direto (nem sempre cria sessão)
          for (const t of typesToTry) {
            try {
              console.log('[AuthConfirm] Tentando verifyOtp com tipo:', t)
              const { error } = await supabase.auth.verifyOtp({ 
                type: t, 
                token_hash: tokenHash 
              })
              
              if (!error) {
                console.log('[AuthConfirm] verifyOtp bem-sucedido com tipo:', t)
                verifiedDirectly = true
                break
              }
              
              console.warn('[AuthConfirm] verifyOtp falhou com tipo:', t, error)
            } catch (e) {
              console.warn('[AuthConfirm] Exceção no verifyOtp com tipo:', t, e)
            }
          }

          // Verificar se sessão foi criada
          await new Promise(resolve => setTimeout(resolve, 1000))
          const { data: { session: checkSession } } = await supabase.auth.getSession()
          
          if (checkSession?.user) {
            console.log('[AuthConfirm] ✅ Sessão criada pelo verifyOtp, invocando confirm-email-strict...')
            
            const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
              'confirm-email-strict',
              { body: { nonce: nonce || null } }
            )

            if (confirmError) {
              console.error('[AuthConfirm] Erro na confirmação strict:', confirmError)
              
              if (confirmError.message?.includes('inválido') || confirmError.message?.includes('expirado')) {
                await supabase.auth.signOut()
                throw new Error(confirmError.message)
              }
              
              throw new Error('Erro ao confirmar e-mail.')
            }

            if (!confirmData?.success) {
              throw new Error('Falha na confirmação do e-mail')
            }

            console.log('[AuthConfirm] ✅ E-mail confirmado!')
            setStatus('success')
            toast.success('Email confirmado com sucesso!')
            return
          }

          // Fallback: redirecionar para endpoint oficial do Supabase
          console.log('[AuthConfirm] verifyOtp não criou sessão, redirecionando para /auth/v1/verify...')
          
          const useType = typesToTry[0] || 'signup'
          const supabaseUrl = 'https://ykwszazxigjivjkagjmf.supabase.co'
          const origin = window.location.origin
          const redirectTo = nonce 
            ? `${origin}/auth-confirm?n=${encodeURIComponent(nonce)}`
            : `${origin}/auth-confirm`
          
          const verifyUrl = `${supabaseUrl}/auth/v1/verify?type=${useType}&token_hash=${encodeURIComponent(tokenHash)}&redirect_to=${encodeURIComponent(redirectTo)}`
          
          console.log('[AuthConfirm] Redirecionando para:', verifyUrl)
          window.location.href = verifyUrl
          return
        }

        // FORMATO C: Erro na URL
        const errorParam = params.get('error')
        if (errorParam) {
          throw new Error(params.get('error_description') || errorParam)
        }

        // Nenhum formato reconhecido
        throw new Error('Link inválido ou expirado')

      } catch (err: any) {
        console.error('[AuthConfirm] Erro na confirmação:', err)
        setErrorMessage(err.message || 'Não foi possível confirmar seu e-mail')
        setStatus('error')
        toast.error(err.message || 'Erro ao confirmar email')
        
        // Limpeza apenas em caso de erro
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k)
          })
          sessionStorage.clear()
          
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k)))
          }
        } catch (cleanupErr) {
          console.warn('[AuthConfirm] Falha ao limpar caches:', cleanupErr)
        }
      }
    }

    confirmEmail()
  }, [])

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/welcome')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [status, navigate])

  const handleRequestNewLink = () => {
    navigate('/login?resend=true')
  }

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
                Sua conta está ativa! Você será redirecionado para escolher seu plano em {countdown} segundo{countdown !== 1 ? 's' : ''}...
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
                {errorMessage || 'Não foi possível confirmar seu e-mail. O link pode ter expirado ou já foi utilizado.'}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        {status === 'error' && (
          <CardContent className="flex flex-col gap-2">
            <Button 
              onClick={handleRequestNewLink}
              className="w-full"
            >
              Solicitar Novo Link
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              variant="outline"
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