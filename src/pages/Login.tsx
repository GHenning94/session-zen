import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { TwoFactorVerification } from "@/components/TwoFactorVerification"
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Heart, Check, X, Loader2 } from "lucide-react"

const TURNSTILE_SITE_KEY = '0x4AAAAAAB43UmamQYOA5yfH'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
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

  const is2FASuccess = useRef(false)
  const loginFormRef = useRef<HTMLFormElement>(null)
  const registerFormRef = useRef<HTMLFormElement>(null)

  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login'

  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    
    if (confirmed === 'true') {
      toast.success('E-mail confirmado! Sua conta está ativa. Faça login para continuar.')
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  useEffect(() => {
    const stateMessage = location.state?.message
    const stateVariant = location.state?.variant
    if (stateMessage) {
      if (stateVariant === 'destructive') {
        toast.error(stateMessage)
      } else {
        toast.success(stateMessage)
      }
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    const cleanup = () => {
      if (show2FA && !is2FASuccess.current) {
        console.log('Login component unmounting while 2FA modal was expected AND NOT successful. Signing out.')
        supabase.auth.signOut().catch(error => {
          console.error("Erro ao deslogar durante unmount do Login:", error)
        })
      } else if (show2FA && is2FASuccess.current) {
        console.log('Login component unmounting after successful 2FA. NOT signing out.')
      }
    }
    return cleanup
  }, [show2FA])

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

    const formDataHtml = new FormData(loginFormRef.current!)
    const captchaToken = (formDataHtml.get('cf-turnstile-response') as string) || ''
    
    if (!captchaToken) {
      toast.error('Por favor, resolva o captcha para continuar')
      return
    }

    setIsLoading(true)
    let shouldShow2FAModal = false

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
        options: { captchaToken }
      })
      
      if (signInError) {
        let errorMessage = 'Erro ao fazer login. Tente novamente.'
        
        try {
          const { data: existsData } = await supabase.functions.invoke('check-email-exists', {
            body: { email: formData.email }
          })
          const accountExists = !!existsData?.exists

          if (!accountExists) {
            errorMessage = 'Esta conta não existe.'
            localStorage.clear()
            sessionStorage.clear()
          } else if (signInError.message.includes('Email not confirmed')) {
            errorMessage = 'Confirme seu e-mail para ativar sua conta antes de fazer login.'
          } else if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid email or password')) {
            errorMessage = 'E-mail ou senha incorretos'
          } else if (signInError.message.includes('Network request failed') || signInError.message.includes('network')) {
            errorMessage = 'Erro de conexão. Verifique sua internet.'
          }
        } catch (checkErr) {
          console.warn('Falha ao verificar existência de e-mail, usando mensagem genérica.')
          if (signInError.message.includes('Email not confirmed')) {
            errorMessage = 'Confirme seu e-mail para ativar sua conta antes de fazer login.'
          } else if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid email or password')) {
            errorMessage = 'E-mail ou senha incorretos'
          }
        }
        
        console.error('Erro de Login:', signInError)
        toast.error(errorMessage)
        return
      }

      if (signInData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_confirmed_strict')
          .eq('user_id', signInData.user.id)
          .single()

        if (!profile?.email_confirmed_strict) {
          console.log('🔒 Login: Email não confirmado (strict), bloqueando acesso')
          
          await supabase.auth.signOut()
          
          setAwaitingEmailConfirmation(true)
          setConfirmationEmail(formData.email)
          
          toast.error('Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada.')

          try {
            const { error: autoResendError } = await supabase.functions.invoke('resend-confirmation-email', {
              body: { email: formData.email }
            })
            if (autoResendError) {
              console.warn('Falha no reenvio automático:', autoResendError)
            } else {
              setResendCooldown(60)
            }
          } catch (autoErr) {
            console.warn('Falha no reenvio automático:', autoErr)
          }
          
          setIsLoading(false)
          return
        }

        console.log('🔒 Login: Email confirmado (strict) ✅')

        const { data: settingsArray, error: settingsError } = await supabase
          .from('user_2fa_settings')
          .select('email_2fa_enabled, authenticator_2fa_enabled')
          .eq('user_id', signInData.user.id)
          .limit(1)
        const settings = settingsArray && settingsArray.length > 0 ? settingsArray[0] : null

        if (settingsError) {
          throw settingsError
        }

        if (settings && (settings.email_2fa_enabled || settings.authenticator_2fa_enabled)) {
          shouldShow2FAModal = true
          setPending2FAEmail(formData.email)
          setRequires2FAEmail(settings.email_2fa_enabled || false)
          setRequires2FAAuthenticator(settings.authenticator_2fa_enabled || false)
          setShow2FA(true)
          return
        }
        
        toast.success('Login realizado com sucesso! Redirecionando...')
        navigate("/dashboard", { state: { fromLogin: true } })
      } else {
        throw new Error("Resposta de login inesperada.")
      }
    } catch (error: any) {
      console.error('Erro inesperado no handleLogin:', error)
      toast.error(error.message || "Algo deu errado.")
    } finally {
      if (!shouldShow2FAModal) {
        setIsLoading(false)
      }
    }
  }

  const handle2FASuccess = async () => {
    is2FASuccess.current = true
    toast.success('Login realizado com sucesso! Redirecionando...')
    navigate("/dashboard", { state: { fromLogin: true } })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (!validatePassword(formData.password)) {
      toast.error('A senha deve atender a todos os requisitos.')
      return
    }

    const formDataHtml = new FormData(registerFormRef.current!)
    const captchaToken = (formDataHtml.get('cf-turnstile-response') as string) || ''
    
    if (!captchaToken) {
      toast.error('Por favor, resolva o captcha para continuar')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('request-email-confirmation', {
        body: {
          email: formData.email,
          password: formData.password,
          user_metadata: {
            nome: formData.name,
            profissao: formData.profession
          },
          captchaToken,
          redirect_to: 'https://therapypro.app.br/auth-confirm'
        }
      })

      if (error) {
        console.error('Erro ao chamar edge function:', error)
        throw new Error(error.message || 'Erro ao criar conta. Por favor, tente novamente.')
      }

      if (data?.error) {
        console.error('Erro retornado pela edge function:', data.error)
        throw new Error(data.error)
      }

      if (!data?.success) {
        throw new Error('Falha ao criar conta. Por favor, tente novamente.')
      }

      setAwaitingEmailConfirmation(true)
      setConfirmationEmail(formData.email)
      setResendCooldown(60)
      
      toast.success('Conta criada! Verifique seu e-mail para confirmar sua conta.')
    } catch (error: any) {
      console.error('Erro no registro:', error)
      toast.error(error.message || 'Tente novamente mais tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    try {
      const { error } = await supabase.functions.invoke('resend-confirmation-email', {
        body: { email: confirmationEmail }
      })

      if (error) throw error

      setResendCooldown(60)
      toast.success('Email reenviado! Verifique sua caixa de entrada.')
    } catch (error: any) {
      toast.error(error.message || 'Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Digite seu email no campo acima primeiro.')
      return
    }

    setIsResettingPassword(true)
    try {
      const { error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: formData.email }
      })

      if (error) throw error

      toast.success('Email enviado! Verifique sua caixa de entrada para redefinir sua senha.')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email de recuperação.')
    } finally {
      setIsResettingPassword(false)
    }
  }

  if (awaitingEmailConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Confirme seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para <strong>{confirmationEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Clique no link enviado para ativar sua conta e fazer login.
            </p>
            <Button
              onClick={handleResendConfirmation}
              disabled={resendCooldown > 0 || isLoading}
              variant="outline"
              className="w-full"
            >
              {resendCooldown > 0 
                ? `Reenviar em ${resendCooldown}s` 
                : isLoading 
                  ? 'Enviando...' 
                  : 'Reenviar e-mail'}
            </Button>
            <Button
              onClick={() => {
                setAwaitingEmailConfirmation(false)
                setConfirmationEmail('')
              }}
              variant="ghost"
              className="w-full"
            >
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (show2FA) {
    return (
      <TwoFactorVerification
        email={pending2FAEmail}
        requiresEmail={requires2FAEmail}
        requiresAuthenticator={requires2FAAuthenticator}
        onSuccess={handle2FASuccess}
        onCancel={() => {
          setShow2FA(false)
          setIsLoading(false)
          supabase.auth.signOut()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">TherapyPro</CardTitle>
          <CardDescription>Gerencie sua prática terapêutica</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form ref={loginFormRef} onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-center">
                  <Turnstile siteKey={TURNSTILE_SITE_KEY} />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? 'Enviando...' : 'Esqueci minha senha'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form ref={registerFormRef} onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nome Completo</Label>
                  <Input
                    id="register-name"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-profession">Profissão</Label>
                  <Select value={formData.profession} onValueChange={(v) => handleInputChange('profession', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="psicologo">Psicólogo(a)</SelectItem>
                      <SelectItem value="psicanalista">Psicanalista</SelectItem>
                      <SelectItem value="terapeuta">Terapeuta</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="psiquiatra">Psiquiatra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">E-mail</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onFocus={() => setShowPasswordRequirements(true)}
                    required
                  />
                  {showPasswordRequirements && (
                    <ul className="text-xs space-y-1 mt-2">
                      {passwordRequirements.map((req, idx) => {
                        const isValid = req.test(formData.password)
                        return (
                          <li key={idx} className={`flex items-center gap-1 ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {req.text}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirmar Senha</Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-center">
                  <Turnstile siteKey={TURNSTILE_SITE_KEY} />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</> : 'Criar conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login