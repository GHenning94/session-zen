import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Smartphone, Key, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TwoFactorActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  actionDescription: string;
  email: string;
}

// Helper para chamadas AUTENTICADAS
const invokeAuthenticatedFunction = async (functionName: string, body: object) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    toast({ title: "Erro de Autenticação", description: "Sua sessão expirou.", variant: "destructive" });
    throw new Error("Usuário não autenticado");
  }
  supabase.functions.setAuth(session.access_token);
  return supabase.functions.invoke(functionName, { body });
};

export const TwoFactorActionModal = ({
  open,
  onOpenChange,
  onVerified,
  actionDescription,
  email,
}: TwoFactorActionModalProps) => {
  const [emailCode, setEmailCode] = useState('');
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [requiresEmail, setRequiresEmail] = useState(false);
  const [requiresAuthenticator, setRequiresAuthenticator] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Preservar estado do modal durante mudanças de aba
  useEffect(() => {
    if (open) {
      // Marcar que modal 2FA está ativo (para evitar que useAuth limpe estado)
      sessionStorage.setItem('2FA_ACTION_MODAL_ACTIVE', 'true');
    } else {
      sessionStorage.removeItem('2FA_ACTION_MODAL_ACTIVE');
    }
    
    return () => {
      sessionStorage.removeItem('2FA_ACTION_MODAL_ACTIVE');
    };
  }, [open]);

  // Restaurar estado de emailCodeSent do sessionStorage ao abrir modal
  useEffect(() => {
    if (open) {
      const wasEmailCodeSent = sessionStorage.getItem('2FA_EMAIL_CODE_SENT') === 'true';
      if (wasEmailCodeSent) {
        setEmailCodeSent(true);
        // Restaurar cooldown se ainda houver
        const cooldownEndTime = sessionStorage.getItem('2FA_COOLDOWN_END');
        if (cooldownEndTime) {
          const remaining = Math.max(0, Math.floor((parseInt(cooldownEndTime) - Date.now()) / 1000));
          if (remaining > 0) {
            setResendCooldown(remaining);
          }
        }
      }
    }
  }, [open]);

  // Carregar configurações de 2FA do usuário
  useEffect(() => {
    if (open) {
      loadTwoFactorSettings();
      // Reset apenas campos de código, não o estado de emailCodeSent
      setEmailCode('');
      setAuthenticatorCode('');
      setBackupCode('');
      setUseBackupCode(false);
      
      // Verificar se já enviou código anteriormente (para restaurar estado após mudar de aba)
      const wasEmailCodeSent = sessionStorage.getItem('2FA_EMAIL_CODE_SENT') === 'true';
      if (!wasEmailCodeSent) {
        setEmailCodeSent(false);
        setResendCooldown(0);
      }
    }
  }, [open]);

  const loadTwoFactorSettings = async () => {
    try {
      setLoadingSettings(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('email_2fa_enabled, authenticator_2fa_enabled')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading 2FA settings:', error);
        return;
      }

      setRequiresEmail(data?.email_2fa_enabled || false);
      setRequiresAuthenticator(data?.authenticator_2fa_enabled || false);
    } catch (error) {
      console.error('Error loading 2FA settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const sendEmailCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await invokeAuthenticatedFunction('twofa-send-email-code', { email });
      if (error) throw error;
      setEmailCodeSent(true);
      setResendCooldown(60);
      
      // Persistir estado no sessionStorage para restaurar ao voltar de outra aba
      sessionStorage.setItem('2FA_EMAIL_CODE_SENT', 'true');
      sessionStorage.setItem('2FA_COOLDOWN_END', String(Date.now() + 60000));
      
      toast({ title: 'Código enviado', description: 'Verifique seu e-mail para o código de verificação' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao enviar código', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer - também atualiza sessionStorage
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        const newCooldown = resendCooldown - 1;
        setResendCooldown(newCooldown);
        if (newCooldown === 0) {
          sessionStorage.removeItem('2FA_COOLDOWN_END');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    try {
      setLoading(true);
      const { data, error } = await invokeAuthenticatedFunction('twofa-verify-code', {
        email,
        emailCode: requiresEmail && !useBackupCode ? emailCode : undefined,
        authenticatorCode: requiresAuthenticator && !useBackupCode ? authenticatorCode : undefined,
        backupCode: useBackupCode ? backupCode : undefined,
      });
      
      // Tratar resposta da edge function
      if (error) {
        // Erro de edge function - mostrar mensagem amigável
        console.error('Erro na verificação 2FA:', error);
        toast({ 
          title: 'Código incorreto', 
          description: 'Verifique o código inserido e tente novamente.', 
          variant: 'destructive' 
        });
        return;
      }
      
      // Verificar se há erro no payload da resposta
      if (data?.error) {
        toast({ 
          title: 'Código incorreto', 
          description: 'Verifique o código inserido e tente novamente.', 
          variant: 'destructive' 
        });
        return;
      }
      
      if (data?.success) {
        // Limpar estado do sessionStorage ao sucesso
        sessionStorage.removeItem('2FA_EMAIL_CODE_SENT');
        sessionStorage.removeItem('2FA_COOLDOWN_END');
        sessionStorage.removeItem('2FA_ACTION_MODAL_ACTIVE');
        
        toast({ title: 'Verificação bem-sucedida' });
        onOpenChange(false);
        onVerified();
      } else {
        toast({ 
          title: 'Código incorreto', 
          description: 'Verifique o código inserido e tente novamente.', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      console.error('Exceção na verificação 2FA:', error);
      toast({ 
        title: 'Código incorreto', 
        description: 'Verifique o código inserido e tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Limpar estado do sessionStorage ao cancelar
    sessionStorage.removeItem('2FA_EMAIL_CODE_SENT');
    sessionStorage.removeItem('2FA_COOLDOWN_END');
    sessionStorage.removeItem('2FA_ACTION_MODAL_ACTIVE');
    onOpenChange(false);
  };

  if (loadingSettings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verificação de Dois Fatores
          </DialogTitle>
          <DialogDescription>
            Para {actionDescription}, confirme sua identidade com seu código 2FA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              disabled={loading || (requiresEmail && !emailCodeSent && !useBackupCode)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Confirmar'
              )}
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
              onClick={handleCancel}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
