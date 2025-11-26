import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingState } from '@/components/LoadingState'

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <LoadingState text="Processando autenticação..." />
    </div>
  )
}

export default AuthCallback
