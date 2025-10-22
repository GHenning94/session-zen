import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Smartphone, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TwoFactorVerificationProps {
  email: string;
  requiresEmail: boolean;
  requiresAuthenticator: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

// --- FUNÇÃO HELPER PARA CHAMADAS AUTENTICADAS ---
const invokeAuthenticatedFunction = async (functionName: string, body: object) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    toast({ 
      title: "Erro de Autenticação", 
      description: "Sua sessão expirou. Por favor, tente fazer login novamente.", 
      variant: "destructive" 
    });
    throw new Error("Usuário não autenticado");
  }

  supabase.functions.setAuth(session.access_token);
  return supabase.functions.invoke(functionName, { body });
};

export const TwoFactorVerification = ({ // <-- Export está correto aqui
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
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  const sendEmailCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await invokeAuthenticatedFunction('2fa-send-email-code', {
        email,
      });

      if (error) throw error;

      setEmailCodeSent(true);
      toast({
        title: 'Código enviado',
        description: 'Verifique seu e-mail para o código de verificação',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
        toast({
          title: 'Verificação bem-sucedida',
          description: 'Você será redirecionado em instantes',
        });
        onVerified();
      } else {
        toast({
          title: 'Código(s) inválido(s)',
          description: data.error || 'Verifique os códigos inseridos e tente novamente',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
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
                  {!emailCodeSent && (
                    <Button
                      onClick={sendEmailCode}
                      disabled={loading}
                      variant="outline"
                    >
                      Enviar
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
            disabled={loading || (requiresEmail && !emailCodeSent && !useBackupCode)}
            className="w-full"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setUseBackupCode(!useBackupCode)}
            className="w-full"
          >
            {useBackupCode ? 'Usar código normal' : 'Usar código de backup'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
        <div className="text-center pt-4">
          <Button
            variant="link"
            className="text-sm text-muted-foreground"
            onClick={() => {
              window.location.href = '/reset-2fa';
            }}
          >
            Perdeu o acesso ao 2FA?
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};