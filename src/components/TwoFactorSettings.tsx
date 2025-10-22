import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Smartphone, Key, Copy, Download } from 'lucide-react';
import { use2FA } from '@/hooks/use2FA';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const TwoFactorSettings = () => {
  const {
    settings,
    loading,
    backupCodes,
    toggleEmail2FA,
    generateAuthenticator,
    verifyAndEnableAuthenticator,
    disableAuthenticator,
    generateBackupCodes,
  } = use2FA();

  const [showAuthenticatorSetup, setShowAuthenticatorSetup] = useState(false);
  const [qrCodeURL, setQrCodeURL] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const handleEmail2FAToggle = async (checked: boolean) => {
    await toggleEmail2FA(checked);
  };

  const handleAuthenticatorSetup = async () => {
    const data = await generateAuthenticator();
    if (data) {
      setQrCodeURL(data.qrCodeURL);
      setSecret(data.secret);
      setShowAuthenticatorSetup(true);
    }
  };

  const handleVerifyAuthenticator = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite um código de 6 dígitos',
        variant: 'destructive',
      })
      return
    }

    const success = await verifyAndEnableAuthenticator(verificationCode);
    if (success) {
      setShowAuthenticatorSetup(false);
      setQrCodeURL(null);
      setSecret(null);
      setVerificationCode('');
      
      // Auto-generate backup codes after successful activation
      const codes = await generateBackupCodes();
      if (codes.length > 0) {
        setGeneratedCodes(codes);
        setShowBackupCodes(true);
      }
    }
  };

  const handleGenerateNewBackupCodes = async () => {
    const codes = await generateBackupCodes();
    if (codes.length > 0) {
      setGeneratedCodes(codes);
      setShowBackupCodes(true);
    }
  };

  // --- INÍCIO DA CORREÇÃO (Numerar Códigos) ---
  const getNumberedCodes = (codes: string[]) => {
    return codes.map((code, index) => `${index + 1}. ${code}`);
  };

  const copyBackupCodes = () => {
    const numberedCodes = getNumberedCodes(generatedCodes).join('\n');
    navigator.clipboard.writeText(numberedCodes);
    toast({
      title: 'Copiado!',
      description: 'Códigos de backup copiados para a área de transferência',
    });
  };

  const downloadBackupCodes = () => {
    const numberedCodes = getNumberedCodes(generatedCodes).join('\n');
    const blob = new Blob([numberedCodes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'therapypro-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  // --- FIM DA CORREÇÃO ---

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
          </div>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email 2FA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Verificação por E-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba um código de verificação por e-mail
                  </p>
                </div>
              </div>
              <Switch
                checked={settings?.email_2fa_enabled || false}
                onCheckedChange={handleEmail2FAToggle}
              />
            </div>
            {settings?.email_2fa_enabled && (
              <Alert>
                <AlertDescription>
                  Ativo: Você receberá um código por e-mail a cada login
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Authenticator 2FA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Google Authenticator</Label>
                  <p className="text-sm text-muted-foreground">
                    Use um aplicativo de autenticação
                  </p>
                </div>
              </div>
              {settings?.authenticator_2fa_enabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disableAuthenticator()}
                >
                  Desativar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAuthenticatorSetup}
                >
                  Configurar
                </Button>
              )}
            </div>
            {settings?.authenticator_2fa_enabled && (
              <Alert>
                <AlertDescription>
                  Ativo: Use o Google Authenticator para gerar códigos
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Backup Codes */}
          {(settings?.email_2fa_enabled || settings?.authenticator_2fa_enabled) && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Códigos de Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Para usar caso perca acesso ao 2FA
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateNewBackupCodes}
                >
                  Gerar Novos Códigos
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authenticator Setup Dialog */}
      <Dialog open={showAuthenticatorSetup} onOpenChange={setShowAuthenticatorSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Google Authenticator</DialogTitle>
            <DialogDescription>
              Configure o Google Authenticator ou outro aplicativo TOTP para autenticação de dois fatores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              1. Instale um aplicativo autenticador (Google Authenticator, Authy, etc.)
            </p>
            
            {qrCodeURL && (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg border-2 border-muted">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeURL)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                
                <p className="text-sm text-muted-foreground">
                  2. Escaneie o QR code acima com seu aplicativo
                </p>
                
                <div className="w-full">
                  <p className="text-sm text-muted-foreground mb-2">
                    Ou digite manualmente esta chave:
                  </p>
                  <code className="block p-3 bg-muted rounded text-sm break-all font-mono select-all">
                    {secret}
                  </code>
                </div>
              </div>
            )}
            
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="verification-code">3. Digite o código do aplicativo</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite o código de 6 dígitos exibido no seu aplicativo
                </p>
              </div>
              
              <Button 
                onClick={handleVerifyAuthenticator} 
                className="w-full"
                disabled={verificationCode.length !== 6}
              >
                Verificar e Ativar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Códigos de Backup</DialogTitle>
            <DialogDescription>
              Guarde estes códigos em um local seguro. Cada código pode ser usado apenas uma vez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* --- INÍCIO DA CORREÇÃO (Numerar Códigos) --- */}
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {generatedCodes.map((code, index) => (
                <code key={index} className="text-sm font-mono flex gap-2">
                  <span className="flex-shrink-0 w-6 text-right text-muted-foreground">{index + 1}.</span>
                  <span className="font-semibold">{code}</span>
                </code>
              ))}
            </div>
            {/* --- FIM DA CORREÇÃO --- */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={copyBackupCodes}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadBackupCodes}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};