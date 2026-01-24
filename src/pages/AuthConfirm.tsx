import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

const AuthConfirm = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    console.log('[AuthConfirm] 🚩 Ativando flag IS_CONFIRMING_AUTH');
    sessionStorage.setItem('IS_CONFIRMING_AUTH', 'true');

    const confirmEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        const nonce = params.get('n');
        const hash = window.location.hash;

        console.log('[AuthConfirm] 📧 Iniciando confirmação', { 
          type, 
          hasTokenHash: !!tokenHash, 
          hasNonce: !!nonce,
          hasHash: !!hash
        });

        let userId = null;

        if (tokenHash && type) {
          console.log('[AuthConfirm] 🔐 Formato B - Validando token_hash...');
          
          const { data, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (otpError) {
            console.error('[AuthConfirm] ❌ Erro OTP:', otpError.message);
            throw new Error('Link inválido, expirado ou já utilizado.');
          }
          
          if (!data?.user) {
            throw new Error('Não foi possível validar o link.');
          }
          
          userId = data.user.id;
          console.log('[AuthConfirm] ✅ OTP validado, user_id:', userId);
        }
        else if (hash && hash.includes('access_token')) {
          console.log('[AuthConfirm] 🔐 Formato A - Tokens no hash');
          
          const hashParams = new URLSearchParams(hash.slice(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          
          if (!access_token || !refresh_token) {
            throw new Error('Tokens ausentes no link.');
          }
          
          const { data, error: sessionError } = await supabase.auth.setSession({ 
            access_token, 
            refresh_token 
          });
          
          if (sessionError || !data?.user) {
            throw new Error('Erro ao criar sessão.');
          }
          
          userId = data.user.id;
          console.log('[AuthConfirm] ✅ Sessão criada, user_id:', userId);
        }
        else if (params.get('error')) {
          throw new Error(params.get('error_description') || 'Erro no link.');
        }
        // Tratamento específico para mudança de email com nonce customizado
        else if (type === 'email_change' && nonce) {
          console.log('[AuthConfirm] 🔄 Mudança de email com nonce customizado');
          
          // Chamar diretamente a edge function confirm-email-change
          const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
            'confirm-email-change',
            { body: { nonce } }
          );

          if (confirmError) {
            console.error('[AuthConfirm] ❌ Erro na confirmação:', confirmError.message);
            throw new Error(confirmError.message || 'Erro ao alterar e-mail.');
          }

          if (!confirmData?.success) {
            throw new Error('Falha na alteração do e-mail.');
          }

          console.log('[AuthConfirm] ✅ E-mail alterado com sucesso!');
          toast.success('E-mail alterado com sucesso! Faça login com seu novo e-mail.');
          setStatus('success');
          
          sessionStorage.removeItem('IS_CONFIRMING_AUTH');
          return;
        }
        else {
          throw new Error('Link inválido ou expirado.');
        }

        console.log('[AuthConfirm] ⏳ Aguardando 1500ms...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Detectar se é mudança de email ou confirmação de cadastro
        const isEmailChange = type === 'email_change';
        const functionName = isEmailChange ? 'confirm-email-change' : 'confirm-email-strict';
        
        console.log(`[AuthConfirm] 📨 Invocando ${functionName}...`);
        
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
          functionName,
          { 
            body: isEmailChange 
              ? { nonce: nonce || null }
              : { nonce: nonce || null, user_id: userId }
          }
        );

        if (confirmError) {
          console.error('[AuthConfirm] ❌ Erro na função:', confirmError.message);
          throw new Error(confirmError.message || `Erro ao ${isEmailChange ? 'alterar' : 'confirmar'} e-mail.`);
        }

        if (!confirmData?.success) {
          throw new Error(`Falha na ${isEmailChange ? 'alteração' : 'confirmação'} do e-mail.`);
        }

        console.log(`[AuthConfirm] ✅ E-mail ${isEmailChange ? 'alterado' : 'confirmado'}!`);
        
        // ✅ CRÍTICO: Preservar plano pendente antes do logout
        // Verificar múltiplas fontes para garantir que o plano não seja perdido
        const pendingPlan = localStorage.getItem('pending_plan') || 
                           sessionStorage.getItem('pending_plan_backup') ||
                           sessionStorage.getItem('pending_checkout_plan');
        const pendingBilling = localStorage.getItem('pending_billing') || 
                               sessionStorage.getItem('pending_billing_backup') || 
                               'monthly';
        
        console.log('[AuthConfirm] 💾 Preservando plano pendente antes do logout:', { 
          pendingPlan, 
          pendingBilling,
          localStorage: localStorage.getItem('pending_plan'),
          sessionStorage: sessionStorage.getItem('pending_plan_backup')
        });
        
        // ✅ USAR sessionStorage como backup (não é afetado por localStorage.clear ou signOut)
        if (pendingPlan && pendingPlan !== 'basico') {
          sessionStorage.setItem('pending_plan_backup', pendingPlan);
          sessionStorage.setItem('pending_billing_backup', pendingBilling);
          console.log('[AuthConfirm] ✅ Backup criado no sessionStorage');
        }
        
        console.log('[AuthConfirm] 🚪 Fazendo logout para forçar novo login...');
        await supabase.auth.signOut();
        
        // ✅ Restaurar plano após logout (já que signOut pode limpar localStorage)
        if (pendingPlan && pendingPlan !== 'basico') {
          console.log('[AuthConfirm] 💾 Restaurando plano pendente após logout:', pendingPlan);
          localStorage.setItem('pending_plan', pendingPlan);
          localStorage.setItem('pending_billing', pendingBilling);
          
          // Garantir que o backup também está atualizado
          sessionStorage.setItem('pending_plan_backup', pendingPlan);
          sessionStorage.setItem('pending_billing_backup', pendingBilling);
        }
        
        toast.success('E-mail confirmado com sucesso! Faça login para continuar.');
        setStatus('success');
        
        sessionStorage.removeItem('IS_CONFIRMING_AUTH');
        return;

      } catch (err: any) {
        console.error('[AuthConfirm] ❌ Erro:', err.message);
        
        setErrorMessage(err.message || 'Não foi possível confirmar seu e-mail');
        setStatus('error');
        toast.error(err.message || 'Erro ao confirmar e-mail');

        sessionStorage.removeItem('IS_CONFIRMING_AUTH');
        
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('sb-') || k.includes('supabase')) {
              localStorage.removeItem(k);
            }
          });
        } catch {}
      }
    }

    confirmEmail()
  }, [navigate]) 

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/login?confirmed=true')
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Blob azul no canto direito */}
      <div className="background-animation-container">
        <div className="blob blob-1"></div>
      </div>
      
      <Card className="w-full max-w-md shadow-xl relative z-10">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 mx-auto" />
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
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
                Sua conta está ativa! Redirecionando para o login em {countdown}s...
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
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        {status === 'error' && (
          <CardContent className="flex flex-col gap-2">
            <Button onClick={handleRequestNewLink} className="w-full">
              Solicitar Novo Link
            </Button>
            <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
              Voltar para o Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default AuthConfirm