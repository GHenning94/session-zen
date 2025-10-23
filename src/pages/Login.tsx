import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { TwoFactorVerification } from "@/components/TwoFactorVerification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Brain, Heart, Check, X, Loader2 } from "lucide-react"
import { Turnstile } from "@marsidev/react-turnstile"
import "./Login.styles.css"

const Login = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)

  const TURNSTILE_SITE_KEY = '0x4AAAAAAB43UmamQYOA5yfH'
  const [show2FA, setShow2FA] = useState(false)
  const [pending2FAEmail, setPending2FAEmail] = useState('')
  const [requires2FAEmail, setRequires2FAEmail] = useState(false)
  const [requires2FAAuthenticator, setRequires2FAAuthenticator] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    profession: 'psicologo',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const is2FASuccess = useRef(false);

  // useEffect Botão Voltar (Mantido)
  useEffect(() => {
    const cleanup = () => {
      if (show2FA && !is2FASuccess.current) {
        console.log('Login component unmounting while 2FA modal was expected AND NOT successful. Signing out.');
        supabase.auth.signOut().catch(error => { console.error("Erro signOut:", error); });
      } else if (show2FA && is2FASuccess.current) {
        console.log('Login component unmounting after successful 2FA. NOT signing out.');
      }
    };
    return cleanup;
  }, [show2FA]);

  // passwordRequirements e validatePassword (Mantidos)
  const passwordRequirements = [
    { text: "Pelo menos 8 caracteres", test: (pwd: string) => pwd.length >= 8 },
    { text: "Uma letra maiúscula", test: (pwd: string) => /[A-Z]/.test(pwd) },
    { text: "Uma letra minúscula", test: (pwd: string) => /[a-z]/.test(pwd) },
    { text: "Um número", test: (pwd: string) => /\d/.test(pwd) },
    { text: "Um caractere especial", test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
  ];
  const validatePassword = (password: string) => passwordRequirements.every(req => req.test(password));

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // handleLogin (Mantido com correção "Verifique e-mail")
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) { toast({ title: "Verificação necessária...", variant: "destructive" }); return; }
    setIsLoading(true);
    let shouldShow2FAModal = false;
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email, password: formData.password, options: { captchaToken: turnstileToken }
      });
      if (signInError) {
        if (signInError.message === 'Email not confirmed') {
          toast({ title: 'Verifique o seu e-mail', description: 'Confirme seu e-mail antes do login.', variant: 'destructive' });
        } else if (signInError.message.includes('captcha')) {
            toast({ title: 'Erro na verificação...', description: 'Recarregue e tente novamente.', variant: 'destructive' });
        } else {
          toast({ title: "Erro no login", description: signInError.message || "Credenciais inválidas.", variant: "destructive" });
        }
        return; // Parar
      }
      if (signInData?.user) {
        // Lógica 2FA (Inalterada)
        const { data: settingsArray } = await supabase.from('user_2fa_settings').select('email_2fa_enabled, authenticator_2fa_enabled').eq('user_id', signInData.user.id).limit(1);
        const settings = settingsArray?.[0];
        if (settings && (settings.email_2fa_enabled || settings.authenticator_2fa_enabled)) {
          shouldShow2FAModal = true;
          setPending2FAEmail(formData.email);
          setRequires2FAEmail(!!settings.email_2fa_enabled);
          setRequires2FAAuthenticator(!!settings.authenticator_2fa_enabled);
          setShow2FA(true);
          return;
        }
        toast({ title: "Login realizado!", description: "Redirecionando..." });
        navigate("/dashboard", { state: { fromLogin: true } });
      } else { throw new Error("Resposta inesperada."); }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Algo deu errado.", variant: "destructive" });
    } finally {
      if (!shouldShow2FAModal) setIsLoading(false);
      setCaptchaKey(prev => prev + 1);
      setTurnstileToken(null);
    }
  };

  // handle2FASuccess (Mantido)
  const handle2FASuccess = async () => {
    is2FASuccess.current = true;
    toast({ title: "Login realizado!", description: "Redirecionando..." });
    navigate("/dashboard", { state: { fromLogin: true } });
  };

  // handleRegister (REVERTIDO para usar supabase.auth.signUp)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) { toast({ title: "Verificação necessária...", variant: "destructive" }); return; }
    if (formData.password !== formData.confirmPassword) { toast({ title: "Erro", description: "Senhas não coincidem.", variant: "destructive" }); return; }
    if (!validatePassword(formData.password)) { toast({ title: "Senha inválida...", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        const { error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/confirm`,
                data: { nome: formData.name, profissao: formData.profession },
                captchaToken: turnstileToken
            }
        });
        if (error) throw error;
        toast({ title: "Verifique seu e-mail", description: "Enviamos um link de confirmação." });
    } catch (error: any) {
        let description = error.message || "Não foi possível criar a conta.";
        if (error.message.includes('User already registered')) {
            description = "Este e-mail já está em uso.";
            toast({ title: "Verifique seu e-mail", description: "Link de confirmação reenviado (conta pode já existir)." });
        } else if (error.message.includes('captcha') || error.message.includes('For security purposes')) {
             description = "Falha na verificação ou muitas tentativas. Aguarde e tente novamente.";
        }
        if (!error.message.includes('User already registered')) {
            toast({ title: "Erro no cadastro", description, variant: "destructive" });
        }
    } finally {
        setIsLoading(false);
        setCaptchaKey(prev => prev + 1);
        setTurnstileToken(null);
    }
  };

  // Modal 2FA (Mantido - Estrutura JSX correta)
  if (show2FA) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
        <div className="background-animation-container"><div className="blob blob-2"></div></div>
        <div className="relative z-10 w-full max-w-md space-y-6">
          <TwoFactorVerification
            email={pending2FAEmail}
            requiresEmail={requires2FAEmail}
            requiresAuthenticator={requires2FAAuthenticator}
            onVerified={handle2FASuccess}
            onCancel={async () => {
              try { await supabase.auth.signOut(); } catch (error) { console.error("Erro signOut:", error); }
              finally {
                setShow2FA(false); setPending2FAEmail(''); setRequires2FAEmail(false); setRequires2FAAuthenticator(false); setIsLoading(false);
                navigate('/login', { replace: true });
              }
            }}
          />
        </div>
      </div>
    );
  }

  // JSX Principal (Estrutura completa e revisada)
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="background-animation-container"><div className="blob blob-2"></div></div>
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</h1>
            <p className="text-muted-foreground">Sistema completo para profissionais da saúde mental</p>
          </div>
        </div>
        {/* Features */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-card/80 rounded-lg border border-border/50 shadow-soft backdrop-blur-sm">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><Brain className="w-4 h-4 text-primary" /></div>
            <div className="text-sm"><p className="font-medium text-foreground">Gestão Completa</p><p className="text-muted-foreground text-xs">Agenda, clientes e pagamentos</p></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card/80 rounded-lg border border-border/50 shadow-soft backdrop-blur-sm">
            <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center"><Heart className="w-4 h-4 text-secondary" /></div>
            <div className="text-sm"><p className="font-medium text-foreground">Foco no Cuidado</p><p className="text-muted-foreground text-xs">Mais tempo para seus pacientes</p></div>
          </div>
        </div>
        {/* Card Principal */}
        <Card className="shadow-elegant border-border/50 bg-gradient-card backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4 bg-transparent">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="bg-transparent">
              {/* Aba Login */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
                  </div>
                  <div className="flex justify-center">
                    <Turnstile key={captchaKey} siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} onError={() => setTurnstileToken(null)} onExpire={() => setTurnstileToken(null)} />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading || isResettingPassword || !turnstileToken}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                  <div className="text-center">
                    <Button type="button" variant="link" className="text-sm text-primary hover:underline px-0" disabled={isLoading || isResettingPassword}
                      onClick={async () => {
                        if (!formData.email) { toast({ title: "Email necessário...", variant: "destructive" }); return; }
                        setIsResettingPassword(true);
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail( formData.email, { redirectTo: `${window.location.origin}/reset-password` } );
                          if (error) throw error;
                          toast({ title: "Verifique seu e-mail", description: "Enviamos um link para redefinir sua senha." });
                        } catch (err: any) {
                          toast({ title: "Erro", description: err.message || "Não foi possível enviar o email.", variant: "destructive" });
                        } finally {
                          setIsResettingPassword(false);
                          setCaptchaKey(prev => prev + 1);
                          setTurnstileToken(null);
                        }
                      }}>
                      {isResettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {isResettingPassword ? "Enviando..." : "Esqueci minha senha"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              {/* Aba Registro */}
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                   <div className="space-y-2"> <Label htmlFor="register-name">Nome Completo</Label> <Input id="register-name" type="text" placeholder="Seu nome" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required /> </div>
                   <div className="space-y-2"> <Label htmlFor="register-profession">Profissão</Label> <Select value={formData.profession} onValueChange={(v) => handleInputChange('profession', v)} required> <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger> <SelectContent> <SelectItem value="psicologo">Psicólogo(a)</SelectItem> <SelectItem value="psicanalista">Psicanalista</SelectItem> <SelectItem value="terapeuta">Terapeuta</SelectItem> <SelectItem value="coach">Coach</SelectItem> <SelectItem value="psiquiatra">Psiquiatra</SelectItem> <SelectItem value="outro">Outro</SelectItem> </SelectContent> </Select> </div>
                   <div className="space-y-2"> <Label htmlFor="register-email">E-mail</Label> <Input id="register-email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required /> </div>
                   <div className="space-y-2"> <Label htmlFor="register-password">Senha</Label> <div className="relative"> <Input id="register-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => { handleInputChange('password', e.target.value); setShowPasswordRequirements(e.target.value.length > 0); }} onFocus={() => setShowPasswordRequirements(formData.password.length > 0)} onBlur={() => setShowPasswordRequirements(false)} required /> {showPasswordRequirements && (<div className="absolute top-full ..."> <p className="text-sm ...">Requisitos:</p> <div className="space-y-1"> {passwordRequirements.map((req, index) => { const isValid = req.test(formData.password); return (<div key={index} className="flex ..."> {isValid ? <Check className="w-4 h-4 ..." /> : <X className="w-4 h-4 ..." />} <span className={isValid ? "..." : "..."}>{req.text}</span> </div>); })} </div> </div>)} </div> </div>
                   <div className="space-y-2"> <Label htmlFor="register-confirm-password">Repetir Senha</Label> <Input id="register-confirm-password" type="password" placeholder="Confirme sua senha" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required /> {formData.confirmPassword && formData.password !== formData.confirmPassword && (<p className="text-sm text-red-500">As senhas não coincidem</p>)} </div>
                   <div className="flex justify-center"> <Turnstile key={captchaKey} siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} onError={() => setTurnstileToken(null)} onExpire={() => setTurnstileToken(null)} /> </div>
                   <Button type="submit" className="w-full bg-gradient-success hover:opacity-90 transition-opacity" disabled={isLoading || isResettingPassword || !turnstileToken}>
                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {isLoading ? "Criando conta..." : "Criar Conta"}
                   </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade</p>
      </div>
    </div>
  );
};

export default Login;