import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[AuthCallback] Processando callback...')
        
        // Extrair tokens do hash fragment
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        
        // Extrair nonce da query string (se existir)
        const queryParams = new URLSearchParams(window.location.search)
        const nonce = queryParams.get('n')
        
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Tokens encontrados, criando sessão...')
          
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('[AuthCallback] Erro ao criar sessão:', error)
            navigate(`/login?error=session`)
            return
          }

          console.log('[AuthCallback] Sessão criada, redirecionando para auth-confirm...')
          
          // Redirecionar para auth-confirm com nonce (se existir)
          navigate(nonce ? `/auth-confirm?n=${nonce}` : '/auth-confirm')
        } else {
          console.warn('[AuthCallback] Tokens não encontrados no hash')
          navigate('/login?error=missing-tokens')
        }
      } catch (error) {
        console.error('[AuthCallback] Erro no processamento:', error)
        navigate('/login?error=callback')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Processando autenticação...</p>
      </div>
    </div>
  )
}

export default AuthCallback
