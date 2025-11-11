import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
// Removida a importação de AuthTokenResponsePassword, pois não é estritamente necessária

const AuthConfirm = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash'); // FORMATO B (da nossa Edge Function)
        const type = params.get('type');             // FORMATO B
        const nonce = params.get('n');               // Nosso nonce
        const hash = window.location.hash;           // FORMATO A (OAuth/MagicLink padrão)

        console.log('[AuthConfirm] Iniciando confirmação', { 
          type, 
          hasTokenHash: !!tokenHash, 
          hasNonce: !!nonce,
          hasHash: !!hash 
        });

        // FLAG para saber se a sessão foi estabelecida
        let sessionEstablished = false;

        // FORMATO B: token_hash na query string (Vindo da nossa Edge Function)
        if (tokenHash && type) {
          console.log('[AuthConfirm] Formato B: token_hash detectado. Verificando OTP...');
          
          // @ts-ignore
          const { data, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type, // 'signup' ou 'magiclink'
          });

          if (otpError) {
            console.error('[AuthConfirm] Erro no verifyOtp:', otpError.message);
            throw new Error('Link inválido, expirado ou já utilizado.');
          }
          
          // **** CORREÇÃO APLICADA AQUI ****
          // Se o verifyOtp retornou uma sessão, confiamos nela.
          if (data?.session && data?.user) {
            console.log('[AuthConfirm] ✅ Sessão estabelecida via OTP');
            sessionEstablished = true;
          } else {
             throw new Error('Não foi possível estabelecer a sessão com este link.');
          }
        }
        // FORMATO A: Hash com access_token (Vindo de OAuth, como Google)
        else if (hash && hash.includes('access_token')) {
          console.log('[AuthConfirm] Formato A: tokens no hash');
          
          const hashParams = new URLSearchParams(hash.slice(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            console.log('[AuthConfirm] Aplicando setSession...');
            const { error: sessionError } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            });
            
            if (sessionError) {
              throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
            }
            
            console.log('[AuthConfirm] ✅ Sessão estabelecida via setSession');
            sessionEstablished = true;
          } else {
             throw new Error('Tokens de sessão ausentes no link.');
          }
        }
        // FORMATO C: Erro explícito na URL
        else if (params.get('error')) {
          throw new Error(params.get('error_description') || params.get('error') || 'Erro desconhecido no link.');
        }
        // Nenhum formato reconhecido
        else {
          throw new Error('Link inválido ou expirado. Solicite um novo link de confirmação.');
        }

        // ---- SE CHEGOU AQUI, O USUÁRIO DEVE ESTAR LOGADO (Via Formato A ou B) ----
        
        if (!sessionEstablished) {
          // Fallback final, caso algo estranho aconteça
          throw new Error('Não foi possível autenticar com o link fornecido.');
        }

        // **** CORREÇÃO APLICADA AQUI ****
        // O loop de polling foi removido.
        // A sessão já foi estabelecida pelo verifyOtp ou setSession.
        // Vamos direto para a confirmação estrita.

        // Invocar confirm-email-strict (a nossa função de perfil)
        console.log('[AuthConfirm] Invocando confirm-email-strict com nonce:', nonce);
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
          'confirm-email-strict', 
          { body: { nonce: nonce || null } }
        );

        if (confirmError) {
          console.error('[AuthConfirm] Erro na confirmação estrita:', confirmError);
          // Se o nonce for inválido, deslogar e mostrar erro
          if (confirmError.message?.includes('inválido') || confirmError.message?.includes('expirado')) {
            await supabase.auth.signOut();
            throw new Error(confirmError.message);
          }
          // Outros erros (ex: falha de rede) podem não exigir logout
          throw new Error('Erro ao finalizar a confirmação e-mail. Tente novamente.');
        }

        if (!confirmData?.success) {
          throw new Error('Falha na resposta da confirmação do e-mail');
        }

        console.log('[AuthConfirm] ✅ E-mail confirmado (strict)!');
        toast.success('Email confirmado com sucesso!');
        setStatus('success'); // Ativa o countdown
        return;

      } catch (err: any) {
        console.error('[AuthConfirm] Erro no fluxo de confirmação:', err);
        setErrorMessage(err.message || 'Não foi possível confirmar seu e-mail');
        setStatus('error');
        toast.error(err.message || 'Erro ao confirmar email');
        
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
  }, [navigate]) // Adicionado navigate como dependência

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