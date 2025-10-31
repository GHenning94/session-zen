import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import './Login.styles.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyToken = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!tokenHash || type !== 'recovery') {
        setStatus('error');
        return;
      }

      try {
        // Verificar se o token é válido
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery'
        });

        if (error) {
          console.error('Token inválido:', error);
          setStatus('error');
        } else {
          setStatus('ready');
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        setStatus('error');
      }
    };

    verifyToken();
  }, [searchParams]);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }

    if (countdown === 0) {
      navigate('/login');
    }
  }, [status, countdown, navigate]);

  const validatePassword = (password: string) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(newPassword)) {
      toast({
        title: 'Senha inválida',
        description: 'A senha não atende aos requisitos mínimos',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas são diferentes',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Forçar logout para garantir nova autenticação
      await supabase.auth.signOut();

      setStatus('success');
      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'Você será redirecionado para o login em alguns segundos',
      });
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      
      // Traduzir mensagens de erro comuns do Supabase
      let errorMessage = 'Tente novamente mais tarde';
      
      if (error.message?.includes('New password should be different')) {
        errorMessage = 'A nova senha deve ser diferente da senha antiga';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'A senha deve ter no mínimo 8 caracteres';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Erro ao redefinir senha',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Blobs - Matching Login page */}
      <div className="background-animation-container">
        <div className="blob blob-2"></div>
      </div>
      <Card className="w-full max-w-md shadow-elegant border-border/50 bg-gradient-card backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <CardTitle>Verificando link</CardTitle>
              <CardDescription>Aguarde enquanto validamos seu link de redefinição...</CardDescription>
            </>
          )}

          {status === 'ready' && (
            <>
              <CardTitle>Redefinir Senha</CardTitle>
              <CardDescription>Digite sua nova senha abaixo</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Senha Redefinida!</CardTitle>
              <CardDescription>
                Sua senha foi alterada com sucesso.
                <br />
                Redirecionando para o login em {countdown} segundos...
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
              <CardTitle>Link Inválido ou Expirado</CardTitle>
              <CardDescription>
                O link de redefinição não é válido ou já expirou.
                <br />
                Por favor, solicite um novo link de redefinição de senha.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <PasswordRequirements password={newPassword} />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !validatePassword(newPassword) || newPassword !== confirmPassword}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </form>
          )}

          {status === 'error' && (
            <Button
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Voltar ao Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
