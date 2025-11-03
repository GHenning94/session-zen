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
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const type = params.get('type') as 'signup' | 'recovery' | 'email_change' | 'magiclink' | null
        const tokenHash = params.get('token_hash')
        const nonce = params.get('n') // Nonce para validação

        console.log('[AuthConfirm] Iniciando confirmação', { type, hasTokenHash: !!tokenHash, hasNonce: !!nonce })

        // Processar verificação OTP ou hash
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash
          })
          if (error) {
            console.error('[AuthConfirm] Erro no verifyOtp:', error)
            throw error
          }
          console.log('[AuthConfirm] verifyOtp realizado com sucesso')
        } else {
          // Fallback: hash no fragmento
          const hash = window.location.hash
          if (hash && hash.includes('access_token')) {
            console.log('[AuthConfirm] Processando via hash (access_token)')
            // Supabase SDK processa automaticamente
          } else if (params.get('error')) {
            throw new Error(params.get('error_description') || 'Erro desconhecido')
          } else {
            throw new Error('Link inválido ou expirado')
          }
        }

        // Aguardar um pouco para garantir que o SDK processou
        await new Promise(resolve => setTimeout(resolve, 500))

        // Obter usuário autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('[AuthConfirm] Erro ao obter usuário:', userError)
          throw new Error('Não foi possível autenticar. Tente fazer login novamente.')
        }

        console.log('[AuthConfirm] Usuário autenticado:', user.id)

        // Validar nonce se existir
        if (nonce) {
          console.log('[AuthConfirm] Validando nonce...')
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email_confirmation_nonce, email_confirmation_nonce_expires_at')
            .eq('user_id', user.id)
            .single()

          if (profileError) {
            console.error('[AuthConfirm] Erro ao buscar profile:', profileError)
            throw new Error('Erro ao validar confirmação')
          }

          // Verificar se nonce existe e corresponde
          if (!profileData?.email_confirmation_nonce || profileData.email_confirmation_nonce !== nonce) {
            console.error('[AuthConfirm] Nonce inválido ou não encontrado')
            await supabase.auth.signOut()
            setErrorMessage('Este link de confirmação é inválido ou já foi usado. Solicite um novo link.')
            setStatus('error')
            return
          }

          // Verificar expiração
          if (profileData.email_confirmation_nonce_expires_at) {
            const expiresAt = new Date(profileData.email_confirmation_nonce_expires_at)
            if (expiresAt < new Date()) {
              console.error('[AuthConfirm] Nonce expirado')
              await supabase.auth.signOut()
              setErrorMessage('Este link de confirmação expirou. Solicite um novo link.')
              setStatus('error')
              return
            }
          }

          console.log('[AuthConfirm] Nonce válido!')
        } else if (type === 'signup' || type === 'magiclink') {
          // Se não há nonce mas deveria ter (fluxo novo), considerar erro
          console.warn('[AuthConfirm] Link sem nonce detectado (possível link antigo)')
        }

        // Marcar email como confirmado (strict) e limpar nonce
        console.log('[AuthConfirm] Marcando email_confirmed_strict=true')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            email_confirmed_strict: true,
            email_confirmation_nonce: null,
            email_confirmation_nonce_expires_at: null
          })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('[AuthConfirm] Erro ao atualizar profile:', updateError)
          throw new Error('Erro ao confirmar email')
        }

        console.log('[AuthConfirm] Email confirmado com sucesso!')
        setStatus('success')
        toast.success('Email confirmado com sucesso!')

      } catch (err: any) {
        console.error('[AuthConfirm] Erro na confirmação:', err)
        setErrorMessage(err.message || 'Não foi possível confirmar seu e-mail')
        setStatus('error')
        toast.error(err.message || 'Erro ao confirmar email')
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
                Seu e-mail foi confirmado com sucesso. Você será redirecionado para escolher seu plano em {countdown} segundo{countdown !== 1 ? 's' : ''}...
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