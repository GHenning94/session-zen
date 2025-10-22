import { useState, useEffect } from "react" // Adicionado useEffect
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { TwoFactorVerification } from "@/components/TwoFactorVerification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Brain, Heart, Check, X } from "lucide-react"
import { Turnstile } from "@marsidev/react-turnstile"
import "./Login.styles.css"

const Login = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
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

  useEffect(() => {
    let isMounted = true;
    const cleanup = () => {
      if (show2FA) {
        console.log('Login component unmounting while 2FA modal was expected. Signing out.');
        supabase.auth.signOut().catch(error => {
           console.error("Erro ao deslogar durante unmount do Login:", error);
        });
      }
    };
    return () => {
      isMounted = false;
      cleanup();
    };
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

    if (!turnstileToken) {
      toast({ title: "Verificação necessária", description: "Complete a verificação de segurança.", variant: "destructive" })
      return
    }

    setIsLoading(true)

    try {
      console.log('Tentando login para:', formData.email);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
        options: {
          captchaToken: turnstileToken
        }
      })

      if (signInError?.message?.includes('captcha')) {
        console.error('Erro de Captcha:', signInError);
        toast({
          title: 'Erro na verificação de segurança',
          description: 'Por favor, recarregue a verificação e tente novamente',
          variant: 'destructive',
        })
        setCaptchaKey(prev => prev + 1)
        setTurnstileToken(null)
        setIsLoading(false); // Seta loading false aqui
        return
      }

      console.log('Resultado do Login:', { signInData, signInError });

      if (!signInError && signInData?.user) {
        console.log('Login bem-sucedido, verificando configurações 2FA para user ID:', signInData.user.id);

        const { data: settingsArray, error: settingsError } = await supabase
          .from('user_2fa_settings')
          .select('email_2fa_enabled, authenticator_2fa_enabled')
          .eq('user_id', signInData.user.id)
          .limit(1);

        const settings = settingsArray && settingsArray.length > 0 ? settingsArray[0] : null;
        console.log('Resultado da consulta user_2fa_settings:', { settings, settingsError });


        if (settingsError) {
          console.error('Erro ao buscar configurações 2FA:', settingsError);
          toast({ title: "Erro", description: "Não foi possível verificar as configurações de segurança.", variant: "destructive" });
          setIsLoading(false); // Seta loading false aqui
          return;
        }

        if (settings && (settings.email_2fa_enabled || settings.authenticator_2fa_enabled)) {
          console.log('2FA está ATIVO. Mostrando modal.');
          setPending2FAEmail(formData.email)
          setRequires2FAEmail(settings.email_2fa_enabled || false)
          setRequires2FAAuthenticator(settings.authenticator_2fa_enabled || false)
          setShow2FA(true)
          // Intencionalmente NÃO setamos isLoading false aqui, pois a UI vai mudar
          return
        }

        console.log('2FA está INATIVO ou não encontrado. Redirecionando para dashboard.');
        toast({ title: "Login realizado com sucesso!", description: "Redirecionando para o dashboard..." })
        navigate("/dashboard", { state: { fromLogin: true } })
        // Não precisamos setar isLoading false aqui, pois a navegação desmontará o componente

      } else if (signInError) {
        console.error('Erro de Login:', signInError);
        toast({ title: "Erro no login", description: signInError.message || "Credenciais inválidas", variant: "destructive" })
        setIsLoading(false); // Seta loading false aqui
      } else {
        console.error('Login não retornou erro nem usuário.');
        toast({ title: "Erro no login", description: "Credenciais inválidas", variant: "destructive" })
        setIsLoading(false); // Seta loading false aqui
      }
    } catch (error: any) {
      console.error('Erro inesperado no handleLogin:', error);
      toast({ title: "Erro", description: error.message || "Algo deu errado. Tente novamente.", variant: "destructive" })
      setIsLoading(false); // Seta loading false no catch geral
    } finally {
      // --- CORREÇÃO ---
      // Removida a lógica complexa que causava erro de escopo.
      // setIsLoading(false) agora é tratado nos blocos try/catch acima.
      // --- FIM DA CORREÇÃO ---
    }
  }

  const handle2FASuccess = async () => {
    console.log('handle2FASuccess chamado. Redirecionando para dashboard.');
    toast({ title: "Login realizado com sucesso!", description: "Redirecionando para o dashboard..." })
    navigate("/dashboard", { state: { fromLogin: true } })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!turnstileToken) {
      toast({ title: "Verificação necessária", description: "Complete a verificação de segurança.", variant: "destructive" })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (!validatePassword(formData.password)) {
      toast({ title: "Senha inválida", description: "A senha deve atender a todos os requisitos listados.", variant: "destructive" })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await signUp(formData.email, formData.password, { nome: formData.name, profissao: formData.profession }, turnstileToken || undefined)

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast({
            title: "E-mail já está em uso",
            description: "Este e-mail já possui uma conta cadastrada. Tente fazer login ou use outro e-mail.",
            variant: "destructive"
          })
        } else if (error.message.includes('captcha')) {
          toast({
            title: 'Erro na verificação de segurança',
            description: 'Por favor, recarregue a verificação e tente novamente',
            variant: 'destructive',
          })
          setCaptchaKey(prev => prev + 1)
          setTurnstileToken(null)
        } else {
          toast({ title: "Erro no cadastro", description: error.message || "Não foi possível criar a conta", variant: "destructive" })
        }
      } else {
        toast({ title: "Conta criada com sucesso!", description: "Verifique seu email para confirmar a conta." })
      }
    } catch (error) {
      toast({ title: "Erro", description: "Algo deu errado. Tente novamente.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

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
                toast({
                  title: 'Login cancelado',
                  description: 'Você precisa completar a verificação 2FA para entrar.',
                });
              } catch (error) {
                 console.error("Erro ao deslogar no cancelamento do 2FA:", error);
              } finally {
                setShow2FA(false)
                setPending2FAEmail('')
                setRequires2FAEmail(false)
                setRequires2FAAuthenticator(false)
                setIsLoading(false); // Garante que botão Entrar não fique travado
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="background-animation-container">
        <div className="blob blob-2"></div>
      </div>
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</h1>
            <p className="text-muted-foreground">Sistema completo para profissionais da saúde mental</p>
          </div>
        </div>
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
        <Card className="shadow-elegant border-border/50 bg-gradient-card backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4 bg-transparent">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="bg-transparent">
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
                  </div>
                  <div className="flex justify-center">
                    <Turnstile
                      key={captchaKey}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => {
                        console.debug('Turnstile error')
                        setTurnstileToken(null)
                      }}
                      onExpire={() => setTurnstileToken(null)}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading || !turnstileToken}>{isLoading ? "Entrando..." : "Entrar"}</Button>
                  <div className="text-center">
                    <button type="button" className="text-sm text-primary hover:underline" onClick={async () => {
                      if (!formData.email) {
                        toast({ title: "Email necessário", description: "Digite seu email primeiro para recuperar a senha.", variant: "destructive" });
                        return;
                      }
                      try {
                        const { supabase } = await import("@/integrations/supabase/client");
                        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, { redirectTo: `${window.location.origin}/reset-password` });
                        if (error) {
                          toast({ title: "Erro", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Email enviado", description: "Verifique sua caixa de entrada para redefinir sua senha." });
                        }
                      } catch (error) {
                        toast({ title: "Erro", description: "Não foi possível enviar o email de recuperação.", variant: "destructive" });
                      }
                    }}>Esqueci minha senha</button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Formulário de Registro (Inalterado) */}
                   <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" type="text" placeholder="Seu nome" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profissão</Label>
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
                    <Label htmlFor="confirm-password">Repetir Senha</Label>
                    <Input id="confirm-password" type="password" placeholder="Confirme sua senha" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (<p className="text-sm text-red-500">As senhas não coincidem</p>)}
                  </div>
                  <div className="flex justify-center">
                    <Turnstile
                      key={captchaKey}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => {
                        console.debug('Turnstile error')
                        setTurnstileToken(null)
                      }}
                      onExpire={() => setTurnstileToken(null)}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-success hover:opacity-90 transition-opacity" disabled={isLoading || !turnstileToken}>{isLoading ? "Criando conta..." : "Criar Conta"}</Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        <p className="text-center text-xs text-muted-foreground">Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade</p>
      </div>
    </div>
  )
}

export default Login