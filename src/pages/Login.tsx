import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { TwoFactorVerification } from "@/components/TwoFactorVerification"
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Brain, Heart, Check, X, Loader2 } from "lucide-react"
import "./Login.styles.css" // Importa o CSS isolado para esta página

const TURNSTILE_SITE_KEY = '0x4AAAAAAB43UmamQYOA5yfH'

const Login = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false); // Para o botão "Esqueci senha"
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [pending2FAEmail, setPending2FAEmail] = useState('')
  const [requires2FAEmail, setRequires2FAEmail] = useState(false)
  const [requires2FAAuthenticator, setRequires2FAAuthenticator] = useState(false)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    profession: 'psicologo',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const is2FASuccess = useRef(false);
const loginFormRef = useRef<HTMLFormElement>(null);
const registerFormRef = useRef<HTMLFormElement>(null);

// Controla a aba default via query param (?tab=register)
const [searchParams] = useSearchParams();
const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  // Countdown timer para reenvio de email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Correção do Botão Voltar do Navegador (Já implementada)
  useEffect(() => {
    const cleanup = () => {
        if (show2FA && !is2FASuccess.current) {
            console.log('Login component unmounting while 2FA modal was expected AND NOT successful. Signing out.');
            supabase.auth.signOut().catch(error => {
                console.error("Erro ao deslogar durante unmount do Login:", error);
            });
        } else if (show2FA && is2FASuccess.current) {
             console.log('Login component unmounting after successful 2FA. NOT signing out.');
        }
    };
    return cleanup;
  }, [show2FA]);

  const passwordRequirements = [
    { text: "Pelo menos 8 caracteres", test: (pwd: string) => pwd.length >= 8 },
    { text: "Uma letra maiúscula", test: (pwd: string) => /[A-Z]/.test(pwd) },
    { text: "Uma letra minúscula", test: (pwd: string) => /[a-z]/.test(pwd) },
    { text: "Um número", test: (pwd: string) => /\d/.test(pwd) },
    { text: "Um caractere especial", test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
  ]

  const validatePassword = (password: string) => {
    return passwordRequirements.every(req => req.test(password))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Capturar o token do Turnstile via FormData
    const formDataHtml = new FormData(loginFormRef.current!)
    const captchaToken = (formDataHtml.get('cf-turnstile-response') as string) || ''
    
    if (!captchaToken) {
      toast({
        title: 'Valide o captcha',
        description: 'Por favor, resolva o captcha para continuar',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    let shouldShow2FAModal = false;

    try {
      // Usar a função nativa do Supabase para Login com captchaToken
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
        options: { captchaToken }
      })
      
      // Traduzir erros de autenticação para português
      if (signInError) {
        let errorMessage = 'Erro ao fazer login. Tente novamente.'
        
        try {
          // Verificar se a conta existe para mensagens precisas
          const { data: existsData } = await supabase.functions.invoke('check-email-exists', {
            body: { email: formData.email }
          });
          const accountExists = !!existsData?.exists;

          if (!accountExists) {
            errorMessage = 'Esta conta não existe.';
            // Limpar qualquer cache antigo
            localStorage.clear();
            sessionStorage.clear();
          } else if (signInError.message.includes('Email not confirmed')) {
            errorMessage = 'Confirme seu e-mail para ativar sua conta antes de fazer login.'
          } else if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid email or password')) {
            errorMessage = 'E-mail ou senha incorretos'
          } else if (signInError.message.includes('Network request failed') || signInError.message.includes('network')) {
            errorMessage = 'Erro de conexão. Verifique sua internet.'
          }
        } catch (checkErr) {
          console.warn('Falha ao verificar existência de e-mail, usando mensagem genérica.');
          if (signInError.message.includes('Email not confirmed')) {
            errorMessage = 'Confirme seu e-mail para ativar sua conta antes de fazer login.'
          } else if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid email or password')) {
            errorMessage = 'E-mail ou senha incorretos'
          }
        }
        
        console.error('Erro de Login:', signInError);
        toast({ 
          title: "Erro no login", 
          description: errorMessage, 
          variant: "destructive" 
        })
        return; // Parar aqui no erro
      }

      // Se não houve erro, continuar com a lógica do 2FA
      if (signInData?.user) {
        const { data: settingsArray, error: settingsError } = await supabase
          .from('user_2fa_settings')
          .select('email_2fa_enabled, authenticator_2fa_enabled')
          .eq('user_id', signInData.user.id)
          .limit(1);
        const settings = settingsArray && settingsArray.length > 0 ? settingsArray[0] : null;

        if (settingsError) {
          throw settingsError; // Lançar erro para o catch
        }

        if (settings && (settings.email_2fa_enabled || settings.authenticator_2fa_enabled)) {
          shouldShow2FAModal = true;
          setPending2FAEmail(formData.email)
          setRequires2FAEmail(settings.email_2fa_enabled || false)
          setRequires2FAAuthenticator(settings.authenticator_2fa_enabled || false)
          setShow2FA(true)
          // Intencionalmente NÃO setamos isLoading false aqui
          return
        }
        
        // Se não precisa de 2FA, redirecionar
        toast({ title: "Login realizado com sucesso!", description: "Redirecionando..." })
        navigate("/dashboard", { state: { fromLogin: true } })
      } else {
          // Caso inesperado onde não há erro mas também não há usuário
          throw new Error("Resposta de login inesperada.");
      }
    } catch (error: any) {
      console.error('Erro inesperado no handleLogin:', error);
      toast({ title: "Erro", description: error.message || "Algo deu errado.", variant: "destructive" })
    } finally {
      if (!shouldShow2FAModal) {
        setIsLoading(false);
      }
    }
  }

  const handle2FASuccess = async () => {
    is2FASuccess.current = true; // Sinaliza sucesso para o useEffect de cleanup
    toast({ title: "Login realizado com sucesso!", description: "Redirecionando..." })
    navigate("/dashboard", { state: { fromLogin: true } })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (!validatePassword(formData.password)) {
      toast({ title: "Senha inválida", description: "A senha deve atender a todos os requisitos.", variant: "destructive" })
      return
    }

    // Capturar o token do Turnstile via FormData
    const formDataHtml = new FormData(registerFormRef.current!)
    const captchaToken = (formDataHtml.get('cf-turnstile-response') as string) || ''
    
    if (!captchaToken) {
      toast({
        title: 'Valide o captcha',
        description: 'Por favor, resolva o captcha para continuar',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      // Verificar se o e-mail já está cadastrado
      const { data: checkData } = await supabase.functions.invoke('check-email-exists', {
        body: { email: formData.email }
      })
      
      if (checkData?.exists) {
        toast({
          title: "E-mail já está em uso",
          description: "Esta conta já existe. Por favor, realize o login.",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Criar conta via edge function que envia email pelo SendPulse
      const { data, error } = await supabase.functions.invoke('request-email-confirmation', {
        body: {
          email: formData.email,
          password: formData.password,
          user_metadata: {
            nome: formData.name,
            profissao: formData.profession
          },
          captchaToken
        }
      })

      if (error) {
        console.error('Erro ao chamar edge function:', error);
        throw new Error(error.message || 'Erro ao criar conta. Por favor, tente novamente.');
      }

      if (data?.error) {
        console.error('Erro retornado pela edge function:', data.error);
        throw new Error(data.error);
      }

      if (!data?.success) {
        throw new Error('Falha ao criar conta. Por favor, tente novamente.');
      }

      // Sucesso!
      setAwaitingEmailConfirmation(true)
      setConfirmationEmail(formData.email)
      setResendCooldown(60) // 60 segundos de cooldown
      toast({ title: "Conta criada com sucesso!", description: "Verifique seu email para confirmar a conta." })
      
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast({ 
        title: "Erro no cadastro", 
        description: error.message || "Não foi possível criar a conta", 
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmationEmail = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('request-email-confirmation', {
        body: {
          email: confirmationEmail,
          password: formData.password,
          user_metadata: {
            nome: formData.name,
            profissao: formData.profession
          }
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao reenviar email')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      setResendCooldown(60)
      toast({ 
        title: "Email reenviado!", 
        description: "Verifique sua caixa de entrada novamente." 
      })
    } catch (error: any) {
      toast({ 
        title: "Erro ao reenviar", 
        description: error.message, 
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Lógica do Modal 2FA (Inalterada)
  if (show2FA) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
        <div className="background-animation-container">
          <div className="blob blob-2"></div>
        </div>
        <div className="relative z-10 w-full max-w-md space-y-6">
          <TwoFactorVerification
            email={pending2FAEmail}
            requiresEmail={requires2FAEmail}
            requiresAuthenticator={requires2FAAuthenticator}
            onVerified={handle2FASuccess}
            onCancel={async () => {
              try {
                await supabase.auth.signOut();
              } catch (error) {
                 console.error("Erro ao deslogar no cancelamento do 2FA:", error);
              } finally {
                // Limpa o estado e volta ao login
                setShow2FA(false)
                setPending2FAEmail('')
                setRequires2FAEmail(false)
                setRequires2FAAuthenticator(false)
                setIsLoading(false); // Garante que isLoading seja resetado
                navigate('/login', { replace: true });
              }
            }}
          />
        </div>
      </div>
    );
  }

  // O return principal (quando show2FA é false)
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Blobs */}
      <div className="background-animation-container">
        <div className="blob blob-2"></div>
      </div>
      {/* Conteúdo Central */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header (Logo e Título) */}
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
        {/* Card Principal com Tabs */}
        <Card className="shadow-elegant border-border/50 bg-gradient-card backdrop-blur-sm">
          <Tabs defaultValue={defaultTab} className="w-full">
            <CardHeader className="pb-4 bg-transparent">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="bg-transparent">
              {/* Aba de Login */}
              <TabsContent value="login" className="space-y-4">
                {awaitingEmailConfirmation && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
                    <p className="text-sm font-medium">Email de confirmação enviado para:</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={confirmationEmail} 
                        disabled 
                        className="bg-background"
                      />
                      <Button
                        onClick={handleResendConfirmationEmail}
                        disabled={isLoading || resendCooldown > 0}
                        variant="outline"
                        size="sm"
                      >
                        {resendCooldown > 0 ? `${resendCooldown}s` : 'Reenviar'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Verifique sua caixa de entrada e spam. Clique no link de confirmação para ativar sua conta.
                    </p>
                  </div>
                )}
                <form ref={loginFormRef} onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
                  </div>
                  
                  {/* Turnstile Captcha */}
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onExpire={() => console.log('Turnstile expirou (login)')}
                      onError={() => console.log('Turnstile erro (login)')}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading || isResettingPassword}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary hover:underline px-0"
                      disabled={isLoading || isResettingPassword}
                      onClick={async () => {
                        if (!formData.email) {
                          toast({ title: "Email necessário", description: "Digite seu email primeiro.", variant: "destructive" });
                          return;
                        }

                        // Capturar o token do Turnstile para reset de senha
                        const formDataHtml = new FormData(loginFormRef.current!)
                        const captchaToken = (formDataHtml.get('cf-turnstile-response') as string) || ''
                        
                        if (!captchaToken) {
                          toast({
                            title: 'Valide o captcha',
                            description: 'Por favor, resolva o captcha para continuar',
                            variant: 'destructive'
                          })
                          return
                        }

                        setIsResettingPassword(true);
                        try {
                          // Antes de enviar, confirmar se a conta existe
                          const { data: existsData } = await supabase.functions.invoke('check-email-exists', {
                            body: { email: formData.email }
                          });
                          const accountExists = !!existsData?.exists;

                          if (!accountExists) {
                            toast({ 
                              title: "Esta conta não existe", 
                              description: "Verifique o e-mail digitado ou crie uma conta.", 
                              variant: "destructive" 
                            });
                            return;
                          }

                          const { data: resetData, error: fnError } = await supabase.functions.invoke('request-password-reset', {
                            body: { email: formData.email, captchaToken }
                          });

                          if (fnError) throw fnError;

                          

                          toast({ 
                            title: "E-mail enviado!", 
                            description: "Verifique sua caixa de entrada para redefinir sua senha." 
                          });
                        } catch (err: any) {
                          console.error("Erro ao solicitar redefinição:", err);
                          const errorMsg = err.message || "Não foi possível enviar o email.";
                          const translatedMsg = errorMsg.includes('captcha') 
                            ? 'Falha na verificação do captcha. Tente novamente.' 
                            : errorMsg;
                          toast({ 
                            title: "Erro", 
                            description: translatedMsg, 
                            variant: "destructive" 
                          });
                        } finally {
                          setIsResettingPassword(false);
                        }
                      }}>
                      {isResettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isResettingPassword ? "Enviando..." : "Esqueci minha senha"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              {/* Aba de Registro */}
              <TabsContent value="register" className="space-y-4">
                {awaitingEmailConfirmation && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
                    <p className="text-sm font-medium">Email de confirmação enviado para:</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={confirmationEmail} 
                        disabled 
                        className="bg-background"
                      />
                      <Button
                        onClick={handleResendConfirmationEmail}
                        disabled={isLoading || resendCooldown > 0}
                        variant="outline"
                        size="sm"
                      >
                        {resendCooldown > 0 ? `${resendCooldown}s` : 'Reenviar'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Verifique sua caixa de entrada e spam. Clique no link de confirmação para ativar sua conta.
                    </p>
                  </div>
                )}
                <form ref={registerFormRef} onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome Completo</Label>
                    <Input id="register-name" type="text" placeholder="Seu nome" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-profession">Profissão</Label>
                    <Select value={formData.profession} onValueChange={(value) => handleInputChange('profession', value)} required>
                      <SelectTrigger><SelectValue placeholder="Selecione sua profissão" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="psicologo">Psicólogo(a)</SelectItem>
                        <SelectItem value="psicanalista">Psicanalista</SelectItem>
                        <SelectItem value="terapeuta">Terapeuta</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="psiquiatra">Psiquiatra</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mail</Label>
                    <Input id="register-email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <div className="relative">
                      <Input id="register-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => { handleInputChange('password', e.target.value); setShowPasswordRequirements(e.target.value.length > 0); }} onFocus={() => setShowPasswordRequirements(formData.password.length > 0)} onBlur={() => setShowPasswordRequirements(false)} required />
                      {showPasswordRequirements && (
                        <div className="absolute top-full left-0 mt-2 w-full p-4 bg-background border border-border rounded-lg shadow-lg z-50">
                          <p className="text-sm font-medium text-foreground mb-2">Requisitos da senha:</p>
                          <div className="space-y-1">
                            {passwordRequirements.map((req, index) => {
                              const isValid = req.test(formData.password);
                              return (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  {isValid ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground" />}
                                  <span className={isValid ? "text-green-500" : "text-muted-foreground"}>{req.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Repetir Senha</Label>
                    <Input id="register-confirm-password" type="password" placeholder="Confirme sua senha" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                     {formData.confirmPassword && formData.password !== formData.confirmPassword && (<p className="text-sm text-red-500">As senhas não coincidem</p>)}
                  </div>
                  
                  {/* Turnstile Captcha */}
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onExpire={() => console.log('Turnstile expirou (registro)')}
                      onError={() => console.log('Turnstile erro (registro)')}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-gradient-success hover:opacity-90 transition-opacity" disabled={isLoading || isResettingPassword}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        {/* Footer (Termos) */}
        <p className="text-center text-xs text-muted-foreground">Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade</p>
      </div>
    </div>
  )
}

export default Login