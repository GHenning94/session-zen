import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Smartphone, Key, Loader2 } from 'lucide-react'; // Adicionado Loader2
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
// Removido useNavigate

interface TwoFactorVerificationProps {
  email: string;
  requiresEmail: boolean;
  requiresAuthenticator: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

// Helper para chamadas AUTENTICADAS (para send-code e verify-code)
const invokeAuthenticatedFunction = async (functionName: string, body: object) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    toast({ title: "Erro de Autenticação", description: "Sua sessão expirou.", variant: "destructive" });
    throw new Error("Usuário não autenticado");
  }
  supabase.functions.setAuth(session.access_token);
  return supabase.functions.invoke(functionName, { body });
};

// Helper para chamadas PÚBLICAS (para request-reset)
const invokePublicFunction = async (functionName: string, body: object) => {
  return supabase.functions.invoke(functionName, { body });
};

export const TwoFactorVerification = ({
  email,
  requiresEmail,
  requiresAuthenticator,
  onVerified,
  onCancel,
}: TwoFactorVerificationProps) => {
  const [emailCode, setEmailCode] = useState('');
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  // Removido navigate

  const sendEmailCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await invokeAuthenticatedFunction('2fa-send-email-code', { email });
      if (error) throw error;
      setEmailCodeSent(true);
      setResendCooldown(60); // 60 segundos de cooldown
      toast({ title: 'Código enviado', description: 'Verifique seu e-mail para o código de verificação' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao enviar código', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
     try {
      setLoading(true);
      const { data, error } = await invokeAuthenticatedFunction('2fa-verify-code', {
        email,
        emailCode: requiresEmail && !useBackupCode ? emailCode : undefined,
        authenticatorCode: requiresAuthenticator && !useBackupCode ? authenticatorCode : undefined,
        backupCode: useBackupCode ? backupCode : undefined,
      });
      if (error) throw error;
      if (data.success) {
        toast({ title: 'Verificação bem-sucedida', description: 'Você será redirecionado em instantes', });
        onVerified();
      } else {
        toast({ title: 'Código(s) inválido(s)', description: data.error || 'Verifique os códigos inseridos e tente novamente', variant: 'destructive', });
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive', });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    setLoadingReset(true);
    try {
      const { data, error } = await invokePublicFunction('twofa-request-reset', {
        email: email,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Verifique seu E-mail',
          description: data.message || 'Um link para redefinir seu 2FA foi enviado.',
          duration: 10000,
        });
        await supabase.auth.signOut(); // Desloga
        onCancel(); // Limpa a UI e volta ao login
      } else {
         toast({
           title: 'Erro ao solicitar redefinição',
           description: data.error || 'Não foi possível iniciar a redefinição.',
           variant: 'destructive',
         });
      }

    } catch (error: any) {
      console.error("Erro ao solicitar reset 2FA:", error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível iniciar a redefinição.',
        variant: 'destructive',
      });
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Verificação de Dois Fatores</CardTitle>
        <CardDescription>
          {useBackupCode
            ? 'Insira um código de backup'
            : `Insira ${requiresEmail && requiresAuthenticator ? 'os códigos' : 'o código'} para continuar`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!useBackupCode ? (
          <>
            {requiresEmail && (
              <div className="space-y-2">
                <Label htmlFor="email-code" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Código do E-mail
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="email-code"
                    type="text"
                    placeholder="000000"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    maxLength={6}
                    disabled={!emailCodeSent}
                  />
                  {!emailCodeSent ? (
                    <Button
                      onClick={sendEmailCode}
                      disabled={loading}
                      variant="outline"
                    >
                      Enviar
                    </Button>
                  ) : (
                    <Button
                      onClick={sendEmailCode}
                      disabled={loading || resendCooldown > 0}
                      variant="outline"
                    >
                      {resendCooldown > 0 ? `${resendCooldown}s` : 'Reenviar'}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {requiresAuthenticator && (
              <div className="space-y-2">
                <Label htmlFor="authenticator-code" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Código do Authenticator
                </Label>
                <Input
                  id="authenticator-code"
                  type="text"
                  placeholder="000000"
                  value={authenticatorCode}
                  onChange={(e) => setAuthenticatorCode(e.target.value)}
                  maxLength={6}
                />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="backup-code" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Código de Backup
            </Label>
            <Input
              id="backup-code"
              type="text"
              placeholder="XXXXXXXX"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
          </div>
        )}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleVerify}
            disabled={loading || loadingReset || (requiresEmail && !emailCodeSent && !useBackupCode)}
            className="w-full"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setUseBackupCode(!useBackupCode)}
            disabled={loadingReset}
            className="w-full"
          >
            {useBackupCode ? 'Usar código normal' : 'Usar código de backup'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel} // Chama a função onCancel (que desloga) do Login.tsx
            disabled={loadingReset}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
        <div className="text-center pt-4">
          <Button
            variant="link"
            className="text-sm text-muted-foreground"
            onClick={handleRequestReset} // Chama a nova função
            disabled={loadingReset}
          >
            {loadingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Perdeu o acesso ao 2FA?
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};