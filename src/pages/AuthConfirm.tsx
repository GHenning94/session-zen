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
        // Removido: limpeza preventiva para evitar apagar sessão durante verify

      try {
        const params = new URLSearchParams(window.location.search)
        const type = params.get('type') as 'signup' | 'recovery' | 'email_change' | 'magiclink' | null
        const tokenHash = (params.get('token_hash') || params.get('token') || params.get('hash'))
        const nonce = params.get('n') // Nonce para validação
        const vt = params.get('vt') as 'sg' | 'ml' | null // tentativa anterior (signup=sg, magiclink=ml)

        console.log('[AuthConfirm] Iniciando confirmação', { type, hasTokenHash: !!tokenHash, hasNonce: !!nonce, vt })

        // Processar verificação via endpoint oficial do Supabase para garantir criação de sessão
        if (tokenHash) {
          const supabaseUrl = 'https://ykwszazxigjivjkagjmf.supabase.co';
          // Definir tipo a partir da URL ou alternar com marcador vt (sg/ml)
          let nextType: 'signup' | 'magiclink';
          if (type === 'signup' || type === 'magiclink') {
            nextType = type;
          } else {
            nextType = vt === 'sg' ? 'magiclink' : 'signup';
          }
          const nextVt = nextType === 'signup' ? 'sg' : 'ml';
          const redirectBase = `${window.location.origin}/auth-confirm${nonce ? `?n=${encodeURIComponent(nonce)}&vt=${nextVt}` : `?vt=${nextVt}`}`;

          // Redireciona para o verificador oficial do Supabase, que retorna com #access_token
          const verifyUrl = `${supabaseUrl}/auth/v1/verify?type=${nextType}&token_hash=${encodeURIComponent(tokenHash)}&redirect_to=${encodeURIComponent(redirectBase)}`;
          console.log('[AuthConfirm] Redirecionando para Supabase verify...', { nextType, redirectBase });
          window.location.href = verifyUrl;
          return;
        } else {
          // Fallback: hash no fragmento
          const hash = window.location.hash
          if (hash && hash.includes('access_token')) {
            console.log('[AuthConfirm] Processando via hash (access_token)');
            // Força setSession a partir do hash para garantir persistência
            try {
              const hashParams = new URLSearchParams(hash.slice(1));
              const access_token = hashParams.get('access_token');
              const refresh_token = hashParams.get('refresh_token');
              if (access_token && refresh_token) {
                await supabase.auth.setSession({ access_token, refresh_token });
                console.log('[AuthConfirm] setSession aplicado a partir do hash');
              }
            } catch (e) {
              console.warn('[AuthConfirm] Falha ao aplicar setSession via hash', e);
            }
          } else if (params.get('error')) {
            throw new Error(params.get('error_description') || 'Erro desconhecido');
          } else {
            throw new Error('Link inválido ou expirado');
          }
        }

        console.log('[AuthConfirm] Aguardando sessão ser estabelecida...')
        
        // Poll para obter a sessão (pode demorar alguns ms)
        let sessionEstablished = false;
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession?.user) {
            console.log('[AuthConfirm] ✅ Sessão estabelecida após', i + 1, 'tentativas');
            sessionEstablished = true;
            break;
          }
        }

        if (!sessionEstablished) {
          throw new Error('Não foi possível estabelecer a sessão. Tente novamente.');
        }

        // Invocar edge function para confirmar email de forma atômica
        console.log('[AuthConfirm] Invocando confirm-email-strict...');
        
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirm-email-strict', {
          body: { nonce: nonce || null }
        });

        if (confirmError) {
          console.error('[AuthConfirm] Erro na confirmação strict:', confirmError);
          
          // Se for erro de nonce/expiração, fazer signOut e mostrar erro
          if (confirmError.message?.includes('inválido') || confirmError.message?.includes('expirado')) {
            await supabase.auth.signOut();
            throw new Error(confirmError.message);
          }
          
          throw new Error('Erro ao confirmar e-mail. Tente novamente.');
        }

        if (!confirmData?.success) {
          throw new Error('Falha na confirmação do e-mail');
        }

        console.log('[AuthConfirm] ✅ E-mail confirmado com sucesso (GoTrue + profiles)');
        setStatus('success')
        toast.success('Email confirmado com sucesso!')

      } catch (err: any) {
        console.error('[AuthConfirm] Erro na confirmação:', err)
        setErrorMessage(err.message || 'Não foi possível confirmar seu e-mail')
        setStatus('error')
        toast.error(err.message || 'Erro ao confirmar email')
        // Limpeza de possíveis caches/sessões inconsistentes
        try {
          // Limpa tokens supabase persistidos
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k)
          })
          sessionStorage.clear()
          // Limpa caches do Service Worker
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