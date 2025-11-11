// src/pages/AuthConfirm.tsx
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
    // ✅ CORREÇÃO CRÍTICA: Ativar flag para evitar race condition
    console.log('[AuthConfirm] 🚩 Ativando flag IS_CONFIRMING_AUTH');
    sessionStorage.setItem('IS_CONFIRMING_AUTH', 'true');

    const confirmEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const nonce = params.get('n');
        const hash = window.location.hash;

        console.log('[AuthConfirm] 📧 Iniciando confirmação de e-mail', { 
          type, 
          hasTokenHash: !!tokenHash, 
          hasNonce: !!nonce,
          hasHash: !!hash,
          timestamp: new Date().toISOString()
        });

        let sessionEstablished = false;

        // FORMATO B: token_hash (Link de confirmação da Edge Function)
        if (tokenHash && type) {
          console.log('[AuthConfirm] 🔐 Formato B detectado - Validando token_hash via OTP...');
          
          const { data, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (otpError) {
            console.error('[AuthConfirm] ❌ Erro na verificação OTP:', otpError.message);
            throw new Error('Link inválido, expirado ou já utilizado.');
          }
          
          if (!data?.session) {
            console.error('[AuthConfirm] ❌ Sessão não estabelecida após OTP');
            throw new Error('Não foi possível estabelecer a sessão com este link.');
          }
          
          console.log('[AuthConfirm] ✅ Sessão estabelecida via OTP');
          sessionEstablished = true;
        }
        // FORMATO A: access_token (OAuth/Magic Link)
        else if (hash && hash.includes('access_token')) {
          console.log('[AuthConfirm] 🔐 Formato A detectado - Tokens no hash');
          
          const hashParams = new URLSearchParams(hash.slice(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          
          if (!access_token || !refresh_token) {
            console.error('[AuthConfirm] ❌ Tokens ausentes no hash');
            throw new Error('Tokens de sessão ausentes no link.');
          }
          
          const { error: sessionError } = await supabase.auth.setSession({ 
            access_token, 
            refresh_token 
          });
          
          if (sessionError) {
            console.error('[AuthConfirm] ❌ Erro ao criar sessão:', sessionError.message);
            throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
          }
          
          console.log('[AuthConfirm] ✅ Sessão estabelecida via setSession');
          sessionEstablished = true;
        }
        // FORMATO C: Erro explícito na URL
        else if (params.get('error')) {
          const errorType = params.get('error');
          const errorDesc = params.get('error_description');
          console.error('[AuthConfirm] ❌ Erro explícito na URL:', errorType, errorDesc);
          throw new Error(errorDesc || errorType || 'Erro desconhecido no link.');
        }
        // Nenhum formato reconhecido
        else {
          console.error('[AuthConfirm] ❌ Formato de link não reconhecido');
          throw new Error('Link inválido ou expirado. Solicite um novo link de confirmação.');
        }
        
        if (!sessionEstablished) {
          console.error('[AuthConfirm] ❌ Sessão não foi estabelecida');
          throw new Error('Não foi possível autenticar com o link fornecido.');
        }

        // ✅ Validar usuário após estabelecer sessão
        console.log('[AuthConfirm] 👤 Validando dados do usuário...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('[AuthConfirm] ❌ Erro ao verificar usuário:', userError?.message);
          throw new Error('Não foi possível verificar os dados do usuário após a confirmação.');
        }
        
        console.log('[AuthConfirm] ✅ Usuário verificado:', user.email);

        // ✅ Pausa para estabilização da sessão (necessária para evitar 401)
        console.log('[AuthConfirm] ⏳ Aguardando 1000ms para estabilizar sessão...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[AuthConfirm] ⏳ Pausa concluída');

        // ✅ Invocar Edge Function para confirmar e-mail
        console.log('[AuthConfirm] 📨 Invocando confirm-email-strict...', { nonce });
        
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
          'confirm-email-strict', 
          { body: { nonce: nonce || null } }
        );

        if (confirmError) {
          console.error('[AuthConfirm] ❌ Erro na Edge Function:', confirmError.message);
          
          // Se o erro for de token inválido/expirado, fazer logout
          if (confirmError.message?.includes('inválido') || confirmError.message?.includes('expirado')) {
            await supabase.auth.signOut();
            throw new Error(confirmError.message);
          }
          
          throw new Error('Erro ao finalizar a confirmação do e-mail. Tente novamente.');
        }

        if (!confirmData?.success) {
          console.error('[AuthConfirm] ❌ Resposta de falha da Edge Function:', confirmData);
          throw new Error('Falha na confirmação do e-mail. Por favor, tente novamente.');
        }

        console.log('[AuthConfirm] ✅ E-mail confirmado com sucesso!');
        toast.success('E-mail confirmado com sucesso!');
        setStatus('success');
        
        // ✅ Remover flag ANTES de navegar
        console.log('[AuthConfirm] 🚩 Removendo flag IS_CONFIRMING_AUTH (sucesso)');
        sessionStorage.removeItem('IS_CONFIRMING_AUTH');
        return;

      } catch (err: any) {
        console.error('[AuthConfirm] ❌ Erro no fluxo de confirmação:', err.message);
        
        setErrorMessage(err.message || 'Não foi possível confirmar seu e-mail');
        setStatus('error');
        toast.error(err.message || 'Erro ao confirmar e-mail');

        // ✅ Remover flag em caso de erro
        console.log('[AuthConfirm] 🚩 Removendo flag IS_CONFIRMING_AUTH (erro)');
        sessionStorage.removeItem('IS_CONFIRMING_AUTH');
        
        // Limpar caches em caso de erro
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('sb-') || k.includes('supabase')) {
              localStorage.removeItem(k);
            }
          });
          sessionStorage.clear();
          console.log('[AuthConfirm] 🧹 Cache limpo após erro');
        } catch (cleanupErr) {
          console.warn('[AuthConfirm] ⚠️ Falha ao limpar cache:', cleanupErr);
        }
      }
    }

    confirmEmail()
  }, [navigate]) 

  // Contador regressivo para redirecionamento
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
    console.log('[AuthConfirm] 📧 Solicitando novo link de confirmação');
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
              <CardDescription>
                Aguarde enquanto validamos seu e-mail...
              </CardDescription>
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
                Sua conta está ativa! Você será redirecionado para escolher seu plano em{' '}
                <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}...
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
              <CardDescription className="text-left mt-4">
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