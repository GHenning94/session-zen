// src/pages/Login.tsx
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
// import { useAuth } from "@/hooks/useAuth" // Não precisamos mais do signUp
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { TwoFactorVerification } from "@/components/TwoFactorVerification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Brain, Heart, Check, X, Loader2 } from "lucide-react" // Adicionado Loader2
import { Turnstile } from "@marsidev/react-turnstile"
import "./Login.styles.css"

const Login = () => {
  const navigate = useNavigate()
  // const { signUp } = useAuth() // Removido
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false); // Para o botão "Esqueci senha"
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)

  const TURNSTILE_SITE_KEY = '0x4AAAAAAB43UmamQYOA5yfH' // A sua Site Key (correta)
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

  // Correção do Botão Voltar do Navegador (Já implementada)
  useEffect(() => {
    const cleanup = () => {
        if (show2FA && !is2FASuccess.current) {
            console.log('Login component unmounting while 2FA modal was expected AND NOT successful. Signing out.');
            supabase.auth.signOut().catch(error => {
                console.error("Erro ao deslogar durante unmount do Login:", error);
            });
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

    if (!turnstileToken) {
      toast({ title: "Verificação necessária", description: "Complete a verificação de segurança.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    let shouldShow2FAModal = false;

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
        options: {
          captchaToken: turnstileToken
        }
      })
      
      // --- INÍCIO DA CORREÇÃO (Erro "Verifique o e-mail") ---
      // Tratar o erro de e-mail não confirmado
      if (signInError) {
        if (signInError.message === 'Email not confirmed') {
          toast({
            title: 'Verifique o seu e-mail',
            description: 'Você precisa confirmar seu e-mail antes de fazer o login.',
            variant: 'destructive',
          });
        } else {
          console.error('Erro de Login:', signInError);
          toast({ title: "Erro no login", description: signInError.message || "Credenciais inválidas", variant: "destructive" })
        }
        setCaptchaKey(prev => prev + 1); // Recarregar captcha no erro
        setTurnstileToken(null);
        return; 
      }
      // --- FIM DA CORREÇÃO ---

      if (signInData?.user) {
        // ... (Lógica do 2FA - Inalterada)
        const { data: settingsArray, error: settingsError } = await supabase
          .from('user_2fa_settings')
          .select('email_2fa_enabled, authenticator_2fa_enabled')
          .eq('user_id', signInData.user.id)
          .limit(1);
        const settings = settingsArray && settingsArray.length > 0 ? settingsArray[0] : null;

        if (settingsError) {
          throw settingsError;
        }

        if (settings && (settings.email_2fa_enabled || settings.authenticator_2fa_enabled)) {
          shouldShow2FAModal = true;
          setPending2FAEmail(formData.email)
          setRequires2FAEmail(settings.email_2fa_enabled || false)
          setRequires2FAAuthenticator(settings.authenticator_2fa_enabled || false)
          setShow2FA(true)
          return
        }
        
        toast({ title: "Login realizado com sucesso!", description: "Redirecionando..." })
        navigate("/dashboard", { state: { fromLogin: true } })
      }
    } catch (error: any) {
      console.error('Erro inesperado no handleLogin:', error);
      toast({ title: "Erro", description: error.message || "Algo deu errado.", variant: "destructive" })
    } finally {
      if (!shouldShow2FAModal) {
        setIsLoading(false);
      }
      // Sempre recarregar o captcha após uma tentativa de login
      setCaptchaKey(prev => prev + 1);
      setTurnstileToken(null);
    }
  }

  const handle2FASuccess = async () => {
    is2FASuccess.current = true;
    toast({ title: "Login realizado com sucesso!", description: "Redirecionando..." })
    navigate("/dashboard", { state: { fromLogin: true } })
  }

  // --- CORREÇÃO (Cadastro Personalizado) ---
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
      toast({ title: "Senha inválida", description: "A senha deve atender a todos os requisitos.", variant: "destructive" })
      return
    }

    setIsLoading(true)

    try {
      // Chamar a nossa nova Edge Function
      const { data, error } = await supabase.functions.invoke('custom-signup', {
        body: {
          email: formData.email,
          password: formData.password,
          metadata: { nome: formData.name, profissao: formData.profession },
          captchaToken: turnstileToken
        }
      })

      if (error) throw new Error(error.message); // Erros de rede/função
      if (data.error) throw new Error(data.error); // Erros da nossa lógica

      toast({ title: "Conta criada com sucesso!", description: "Verifique seu email para confirmar a conta." })
      
    } catch (error: any) {
      if (error.message.includes('Conta já existente')) {
        toast({
          title: "E-mail já está em uso",
          description: "Esta conta já existe. Por favor, realize o login.",
          variant: "destructive"
        })
      } else if (error.message.includes('captcha')) {
        toast({
          title: 'Erro na verificação de segurança',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({ title: "Erro no cadastro", description: error.message || "Não foi possível criar a conta", variant: "destructive" })
      }
    } finally {
      setIsLoading(false)
      setCaptchaKey(prev => prev + 1) // Recarregar o captcha
      setTurnstileToken(null)
    }
  }
  // --- FIM DA CORREÇÃO ---

  // ... (Lógica do Modal 2FA - Inalterada)
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
                setShow2FA(false)
                setPending2FAEmail('')
                setRequires2FAEmail(false)
                setRequires2FAAuthenticator(false)
                setIsLoading(false);
                navigate('/login', { replace: true });
              }
            }}
          />
        </div>
      </div>
    );
  }

  // ... (JSX do formulário principal)
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* ... (Divs de background) ... */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* ... (Header e Features) ... */}
        <Card className="shadow-elegant border-border/50 bg-gradient-card backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4 bg-transparent">
              {/* ... (TabsList) ... */}
            </CardHeader>
            <CardContent className="bg-transparent">
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* ... (Campos de Email e Senha) ... */}
                  <div className="flex justify-center">
                    <Turnstile
                      key={captchaKey}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => setTurnstileToken(null)}
                      onExpire={() => setTurnstileToken(null)}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading || isResettingPassword || !turnstileToken}>{isLoading ? "Entrando..." : "Entrar"}</Button>
                  
                  {/* --- CORREÇÃO (Esqueci minha senha) --- */}
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary hover:underline px-0"
                      disabled={isLoading || isResettingPassword} // Desabilitar enquanto reseta
                      onClick={async () => {
                        if (!formData.email) {
                          toast({ title: "Email necessário", description: "Digite seu email primeiro para recuperar a senha.", variant: "destructive" });
                          return;
                        }
                        if (!turnstileToken) {
                          toast({ title: "Verificação necessária", description: "Complete a verificação de segurança.", variant: "destructive" });
                          return;
                        }

                        setIsResettingPassword(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('request-password-reset', {
                            body: {
                              email: formData.email,
                              captchaToken: turnstileToken,
                            }
                          });

                          if (error) throw new Error(error.message);
                          if (data.error) throw new Error(data.error); // Erro da nossa função

                          toast({ title: "Verifique seu e-mail", description: data.message });
                          
                        } catch (err: any) {
                          console.error("Erro ao solicitar redefinição:", err);
                          toast({ title: "Erro", description: err.message || "Não foi possível enviar o email de recuperação.", variant: "destructive" });
                        } finally {
                          setIsResettingPassword(false);
                          setCaptchaKey(prev => prev + 1); // Recarregar o captcha
                          setTurnstileToken(null);
                        }
                      }}>
                      {isResettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Esqueci minha senha"}
                    </Button>
                  </div>
                  {/* --- FIM DA CORREÇÃO --- */}
                  
                </form>
              </TabsContent>
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* ... (Formulário de Registro - Inalterado) ... */}
                  <div className="flex justify-center">
                    <Turnstile
                      key={captchaKey}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => setTurnstileToken(null)}
                      onExpire={() => setTurnstileToken(null)}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-success hover:opacity-90 transition-opacity" disabled={isLoading || isResettingPassword || !turnstileToken}>{isLoading ? "Criando conta..." : "Criar Conta"}</Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        {/* ... (Footer) ... */}
      </div>
    </div>
  )
}

export default Login