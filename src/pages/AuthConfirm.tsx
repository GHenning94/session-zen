import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { createClient, SupabaseClient } from '@supabase/supabase-js' // Importar createClient

const AuthConfirm = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Avisar ao AuthRedirect para não interferir
    console.log('[AuthConfirm] Setting IS_CONFIRMING flag');
    sessionStorage.setItem('IS_CONFIRMING_AUTH', 'true');

    const confirmEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const nonce = params.get('n');
        const hash = window.location.hash;

        console.log('[AuthConfirm] Iniciando confirmação', { 
          type, 
          hasTokenHash: !!tokenHash, 
          hasNonce: !!nonce,
          hasHash: !!hash 
        });

        let accessToken: string | null = null;
        let sessionEstablished = false;

        // FORMATO B: token_hash (Da nossa Edge Function)
        if (tokenHash && type) {
          console.log('[AuthConfirm] Formato B: token_hash detectado. Verificando OTP...');
          // @ts-ignore
          const { data, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type,
          });

          if (otpError) throw new Error('Link inválido, expirado ou já utilizado.');
          if (!data?.session) throw new Error('Não foi possível estabelecer a sessão com este link.');
          
          accessToken = data.session.access_token; // <-- Capturamos o token!
          console.log('[AuthConfirm] ✅ Sessão estabelecida via OTP');
          sessionEstablished = true;
        }
        // FORMATO A: access_token (OAuth)
        else if (hash && hash.includes('access_token')) {
          console.log('[AuthConfirm] Formato A: tokens no hash');
          const hashParams = new URLSearchParams(hash.slice(1));
          accessToken = hashParams.get('access_token'); // <-- Capturamos o token!
          const refresh_token = hashParams.get('refresh_token');
          
          if (accessToken && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            });
            if (sessionError) throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
            console.log('[AuthConfirm] ✅ Sessão estabelecida via setSession');
            sessionEstablished = true;
          } else {
             throw new Error('Tokens de sessão ausentes no link.');
          }
        }
        // ... (outros formatos de erro)
        
        if (!sessionEstablished || !accessToken) {
          throw new Error('Não foi possível autenticar com o link fornecido.');
        }

        // **** A CORREÇÃO "BALA DE PRATA" ESTÁ AQUI ****
        //
        // O cliente 'supabase' global está a ser "envenenado" pelo evento
        // SIGNED_OUT (causado pela falha do WebSocket).
        //
        // Vamos criar um NOVO cliente, que não está envenenado,
        // e passar-lhe o token de acesso que acabámos de obter.
        //
        console.log('[AuthConfirm] Criando cliente Supabase temporário e autenticado...');
        
        const tempSupabaseClient: SupabaseClient = createClient(
          // Obter as variáveis de ambiente (isto é seguro no frontend)
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}` // Injetar o token manualmente
              }
            }
          }
        );

        // Agora usamos o 'tempSupabaseClient' para a chamada
        // **** FIM DA CORREÇÃO ****

        // Invocar confirm-email-strict
        console.log('[AuthConfirm] Invocando confirm-email-strict com nonce:', nonce);
        const { data: confirmData, error: confirmError } = await tempSupabaseClient.functions.invoke(
          'confirm-email-strict', 
          { body: { nonce: nonce || null } }
        );

        if (confirmError) {
          // O 401 NÃO DEVE ACONTECER MAIS.
          // Se o 401 acontecer agora, é um problema de CORS ou do deploy da função.
          console.error('[AuthConfirm] Erro ao invocar função:', confirmError);
          if (confirmError.message?.includes('inválido') || confirmError.message?.includes('expirado')) {
            await supabase.auth.signOut(); // Usar o global para deslogar
            throw new Error(confirmError.message);
          }
          throw new Error('Erro ao finalizar a confirmação e-mail. Tente novamente.');
        }

        if (!confirmData?.success) {
          throw new Error('Falha na resposta da confirmação do e-mail');
        }

        console.log('[AuthConfirm] ✅ E-mail confirmado (strict)!');
        toast.success('Email confirmado com sucesso!');
        setStatus('success');
        
        // Remover a bandeira ANTES de navegar
        console.log('[AuthConfirm] Removing IS_CONFIRMING flag (Success)');
        sessionStorage.removeItem('IS_CONFIRMING_AUTH');
        return;

      } catch (err: any) {
        console.error('[AuthConfirm] Erro no fluxo de confirmação:', err);
        setErrorMessage(err.message || 'Não foi possível confirmar seu e-mail');
        setStatus('error');
        toast.error(err.message || 'Erro ao confirmar email');

        // Remover a bandeira em caso de erro
        console.log('[AuthConfirm] Removing IS_CONFIRMING flag (Error)');
        sessionStorage.removeItem('IS_CONFIRMING_AUTH');
        
        // Limpeza (já existia)
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k)
          })
          sessionStorage.clear()
        } catch (cleanupErr) {
          console.warn('[AuthConfirm] Falha ao limpar caches:', cleanupErr)
        }
      }
    }

    confirmEmail()
  }, [navigate]) 

  // O resto do seu código (useEffect do countdown e JSX) permanece idêntico...
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