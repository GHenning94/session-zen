import { useState, useEffect, useRef, useCallback } from "react"
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
import "./Login.styles.css"

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
  const loginTurnstileRef = useRef<any>(null)
  const registerTurnstileRef = useRef<any>(null)
  const [loginCaptchaReady, setLoginCaptchaReady] = useState(false)
  const [registerCaptchaReady, setRegisterCaptchaReady] = useState(false)
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
  
  // Ref para verificar se componente ainda está montado (previne erro removeChild)
  const isMountedRef = useRef(true)
  
  // MOBILE FIX: Forçar tema claro na página de login
  useEffect(() => {
    // Forçar tema claro imediatamente
    const root = document.documentElement
    root.classList.remove('dark')
    root.classList.add('light')
    root.setAttribute('data-theme', 'light')
    
    // Limpar next-themes storage para evitar conflitos
    localStorage.setItem('user-platform-theme', 'light')
    
    return () => {
      // Não restaurar o tema ao sair - deixar a plataforma gerenciar
    }
  }, [])
  
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login'

  // Capturar plano da URL e salvar no localStorage
  useEffect(() => {
    const plan = searchParams.get('plan')
    const billing = searchParams.get('billing')
    
    if (plan && plan !== 'basico') {
      console.log('[Login] 💾 Salvando plano no localStorage:', { plan, billing })
      localStorage.setItem('pending_plan', plan)
      if (billing) {
        localStorage.setItem('pending_billing', billing)
      }
    }
    
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
    
    if (!captchaToken || !loginCaptchaReady) {
      toast.error('Por favor, resolva o CAPTCHA para continuar')
      return
    }

    setIsLoading(true)
    setLoginCaptchaReady(false)
    let shouldShow2FAModal = false

    try {
      // Verificar se é email de admin
      const { data: adminCheckData } = await supabase.functions.invoke('check-admin-email', {
        body: { email: formData.email }
      })

      // Verificar se componente ainda está montado
      if (!isMountedRef.current) return

      if (adminCheckData?.isAdmin) {
        toast.error('E-mail ou senha incorretos')
        setIsLoading(false)
        return
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
        options: { captchaToken }
      })
      
      // Verificar se componente ainda está montado após operação assíncrona
      if (!isMountedRef.current) return
      
      if (signInError) {
        let errorMessage = 'Erro ao fazer login. Tente novamente.'
        
        if (signInError.message.includes('captcha') || signInError.message.includes('timeout-or-duplicate')) {
          errorMessage = 'Erro de verificação. Por favor, resolva o CAPTCHA novamente.'
          console.error('Erro de Login:', signInError)
          toast.error(errorMessage)
          if (isMountedRef.current) setIsLoading(false)
          return
        } else if (signInError.message.includes('Email not confirmed')) {
          // Email não confirmado - mostrar modal de reenvio
          setAwaitingEmailConfirmation(true)
          setConfirmationEmail(formData.email)
          toast.info('Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada.')
          
          // Tentar reenviar automaticamente
          try {
            const { error: autoResendError } = await supabase.functions.invoke('resend-confirmation-email', {
              body: { email: formData.email }
            })
            if (!isMountedRef.current) return
            if (!autoResendError) {
              setResendCooldown(60)
            }
          } catch (autoErr) {
            console.warn('Falha no reenvio automático:', autoErr)
          }
          
          if (isMountedRef.current) setIsLoading(false)
          return
        } else if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid email or password')) {
          // Verificar se o email existe e se está confirmado
          const { data: emailCheck } = await supabase.functions.invoke('check-email-exists', {
            body: { email: formData.email }
          })
          
          if (!isMountedRef.current) return
          
          if (emailCheck?.exists === false) {
            errorMessage = 'Esta conta não existe. Verifique o e-mail ou crie uma nova conta.'
          } else if (emailCheck?.exists === true && emailCheck?.emailConfirmed === false) {
            // Email existe mas não está confirmado - mostrar modal de reenvio
            setAwaitingEmailConfirmation(true)
            setConfirmationEmail(formData.email)
            toast.info('Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada.')
            
            // Tentar reenviar automaticamente
            try {
              const { error: autoResendError } = await supabase.functions.invoke('resend-confirmation-email', {
                body: { email: formData.email }
              })
              if (!isMountedRef.current) return
              if (!autoResendError) {
                setResendCooldown(60)
              }
            } catch (autoErr) {
              console.warn('Falha no reenvio automático:', autoErr)
            }
            
            if (isMountedRef.current) setIsLoading(false)
            return
          } else {
            errorMessage = 'Senha incorreta. Tente novamente ou redefina sua senha.'
          }
        } else if (signInError.message.includes('Network request failed') || signInError.message.includes('network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.'
        }
        
        console.error('Erro de Login:', signInError)
        toast.error(errorMessage)
        if (isMountedRef.current) setIsLoading(false)
        return
      }

      if (signInData?.user) {
        // Verificar montagem antes de continuar
        if (!isMountedRef.current) return
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_confirmed_strict')
          .eq('user_id', signInData.user.id)
          .single()
        
        // Verificar montagem novamente
        if (!isMountedRef.current) return

        if (!profile?.email_confirmed_strict) {
          console.log('🔒 Login: Email não confirmado (strict), bloqueando acesso')
          
          await supabase.auth.signOut()
          
          if (!isMountedRef.current) return
          
          setAwaitingEmailConfirmation(true)
          setConfirmationEmail(formData.email)
          
          toast.error('Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada.')

          try {
            const { error: autoResendError } = await supabase.functions.invoke('resend-confirmation-email', {
              body: { email: formData.email }
            })
            if (!isMountedRef.current) return
            if (autoResendError) {
              console.warn('Falha no reenvio automático:', autoResendError)
            } else {
              setResendCooldown(60)
            }
          } catch (autoErr) {
            console.warn('Falha no reenvio automático:', autoErr)
          }
          
          if (isMountedRef.current) setIsLoading(false)
          return
        }

        console.log('🔒 Login: Email confirmado (strict) ✅')

        const { data: settingsArray, error: settingsError } = await supabase
          .from('user_2fa_settings')
          .select('email_2fa_enabled, authenticator_2fa_enabled')
          .eq('user_id', signInData.user.id)
          .limit(1)
        
        if (!isMountedRef.current) return
        
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
        
        // ✅ Verificar se há plano pendente no localStorage, sessionStorage ou pending_checkout_plan
        const pendingPlan = localStorage.getItem('pending_plan') || 
                            sessionStorage.getItem('pending_plan_backup') ||
                            sessionStorage.getItem('pending_checkout_plan');
        
        if (pendingPlan && pendingPlan !== 'basico') {
          // Mover o plano para localStorage para o CheckoutRedirect usar
          localStorage.setItem('pending_plan', pendingPlan)
          
          // Limpar backups do sessionStorage
          sessionStorage.removeItem('pending_plan_backup');
          sessionStorage.removeItem('pending_billing_backup');
          sessionStorage.removeItem('pending_checkout_plan');
          
          console.log('[Login] 🛒 Plano pendente detectado, redirecionando para checkout')
          toast.success('Redirecionando para checkout...')
          navigate('/checkout-redirect')
          return
        }
        
        // ✅ Verificar se voltou de pagamento Stripe bem-sucedido (sessão tinha expirado)
        const paymentSuccessReturn = sessionStorage.getItem('payment_success_pending')
        if (paymentSuccessReturn === 'true') {
          console.log('[Login] 💳 Retorno de pagamento bem-sucedido detectado, sincronizando plano...')
          sessionStorage.removeItem('payment_success_pending')
          // Ir para dashboard com flag de sincronização
          navigate('/dashboard?payment=success')
          return
        }
        
        toast.success('Login realizado com sucesso!')
        navigate('/dashboard')
      } else {
        throw new Error("Resposta de login inesperada.")
      }
    } catch (error: any) {
      console.error('Erro inesperado no handleLogin:', error)
      toast.error(error.message || "Algo deu errado.")
    } finally {
      // Sempre resetar o CAPTCHA após tentativa (sucesso ou erro)
      if (isMountedRef.current && loginTurnstileRef.current) {
        loginTurnstileRef.current.reset()
      }
      
      if (!shouldShow2FAModal && isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handle2FASuccess = async () => {
    is2FASuccess.current = true
    
    // ✅ CRITICAL: Aplicar tema do usuário ANTES de navegar
    // Isso evita que a plataforma abra no tema errado após 2FA
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const userId = session.user.id
        const themeCacheKey = `user-theme-cache_${userId}`
        const cachedTheme = localStorage.getItem(themeCacheKey)
        
        if (cachedTheme && (cachedTheme === 'light' || cachedTheme === 'dark')) {
          const root = document.documentElement
          root.classList.add(cachedTheme)
          root.classList.remove(cachedTheme === 'dark' ? 'light' : 'dark')
          root.setAttribute('data-theme', cachedTheme)
          // Atualizar next-themes storage key
          localStorage.setItem('user-platform-theme', cachedTheme)
          console.log(`[Login] ✅ Tema aplicado após 2FA: ${cachedTheme}`)
        } else {
          // Se não tem cache, buscar do banco
          const { data: config } = await supabase
            .from('configuracoes')
            .select('theme_preference')
            .eq('user_id', userId)
            .single()
          
          if (config?.theme_preference && (config.theme_preference === 'light' || config.theme_preference === 'dark')) {
            const theme = config.theme_preference
            const root = document.documentElement
            root.classList.add(theme)
            root.classList.remove(theme === 'dark' ? 'light' : 'dark')
            root.setAttribute('data-theme', theme)
            // Salvar no cache e next-themes
            localStorage.setItem(themeCacheKey, theme)
            localStorage.setItem('user-platform-theme', theme)
            console.log(`[Login] ✅ Tema carregado do banco após 2FA: ${theme}`)
          }
        }
      }
    } catch (themeError) {
      console.warn('[Login] Erro ao aplicar tema após 2FA:', themeError)
    }
    
    // ✅ Verificar se há plano pendente no localStorage, sessionStorage ou pending_checkout_plan
    const pendingPlan = localStorage.getItem('pending_plan') || 
                        sessionStorage.getItem('pending_plan_backup') ||
                        sessionStorage.getItem('pending_checkout_plan');
    
    if (pendingPlan && pendingPlan !== 'basico') {
      // Mover o plano para localStorage para o CheckoutRedirect usar
      localStorage.setItem('pending_plan', pendingPlan)
      
      // Limpar backups do sessionStorage
      sessionStorage.removeItem('pending_plan_backup');
      sessionStorage.removeItem('pending_billing_backup');
      sessionStorage.removeItem('pending_checkout_plan');
      
      console.log('[Login] 🛒 Plano pendente detectado após 2FA, redirecionando para checkout')
      toast.success('Redirecionando para checkout...')
      navigate('/checkout-redirect')
      return
    }
    
    // ✅ Verificar se voltou de pagamento Stripe bem-sucedido
    const paymentSuccessReturn = sessionStorage.getItem('payment_success_pending')
    if (paymentSuccessReturn === 'true') {
      console.log('[Login] 💳 Retorno de pagamento bem-sucedido após 2FA, sincronizando plano...')
      sessionStorage.removeItem('payment_success_pending')
      navigate('/dashboard?payment=success')
      return
    }
    
    toast.success('Login realizado com sucesso!')
    navigate('/dashboard')
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
    
    if (!captchaToken || !registerCaptchaReady) {
      toast.error('Por favor, resolva o CAPTCHA para continuar')
      return
    }

    setIsLoading(true)
    setRegisterCaptchaReady(false) // Invalidar token imediatamente

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

      // Plano já foi salvo no localStorage pelo useEffect

      setAwaitingEmailConfirmation(true)
      setConfirmationEmail(formData.email)
      setResendCooldown(60)
      
      toast.success('Conta criada! Verifique seu e-mail para confirmar sua conta.')
    } catch (error: any) {
      console.error('Erro no registro:', error)
      
      // Melhorar mensagem de erro para CAPTCHA
      let errorMessage = error.message || 'Tente novamente mais tarde.'
      if (error.message && (error.message.includes('captcha') || error.message.includes('timeout-or-duplicate'))) {
        errorMessage = 'Erro de verificação. Por favor, resolva o CAPTCHA novamente.'
      }
      
      toast.error(errorMessage)
    } finally {
      // Sempre resetar o CAPTCHA após tentativa
      if (isMountedRef.current && registerTurnstileRef.current) {
        registerTurnstileRef.current.reset()
      }
      if (isMountedRef.current) setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    try {
      const { error } = await supabase.functions.invoke('resend-confirmation-email', {
        body: { email: confirmationEmail }
      })

      if (!isMountedRef.current) return
      if (error) throw error

      setResendCooldown(60)
      toast.success('Email reenviado! Verifique sua caixa de entrada.')
    } catch (error: any) {
      if (isMountedRef.current) toast.error(error.message || 'Tente novamente.')
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Digite seu email no campo acima primeiro.')
      return
    }

    setIsResettingPassword(true)
    
    try {
      // Verificar se a conta existe
      const { data: existsData, error: existsError } = await supabase.functions.invoke('check-email-exists', {
        body: { email: formData.email }
      })

      if (!isMountedRef.current) return

      if (existsError) {
        console.error('Erro ao verificar e-mail:', existsError)
        toast.error('Erro ao verificar e-mail. Tente novamente.')
        return
      }

      if (!existsData?.exists) {
        toast.error('Esta conta não existe. Verifique o e-mail digitado.')
        return
      }

      // Se passou nas validações, enviar e-mail de recuperação
      const { error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: formData.email }
      })

      if (!isMountedRef.current) return
      if (error) throw error

      toast.success('Email enviado! Verifique sua caixa de entrada para redefinir sua senha.')
    } catch (error: any) {
      console.error('Erro ao enviar recuperação:', error)
      if (isMountedRef.current) toast.error(error.message || 'Erro ao enviar email de recuperação.')
    } finally {
      if (isMountedRef.current) setIsResettingPassword(false)
    }
  }

  if (awaitingEmailConfirmation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated blobs background */}
        <div className="background-animation-container">
          <div className="blob blob-1"></div>
        </div>
        
        <Card className="w-full max-w-md relative z-10">
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
                // Redirecionar para a aba de login
                navigate('/login?tab=login')
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated blobs background */}
        <div className="background-animation-container">
          <div className="blob blob-1"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-md">
          <TwoFactorVerification
            email={pending2FAEmail}
            requiresEmail={requires2FAEmail}
            requiresAuthenticator={requires2FAAuthenticator}
            onVerified={handle2FASuccess}
            onCancel={() => {
              setShow2FA(false)
              setIsLoading(false)
              supabase.auth.signOut()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated blobs background */}
      <div className="background-animation-container">
        <div className="blob blob-1"></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10">
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
                  <Turnstile 
                    ref={loginTurnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={() => {
                      console.log('[Login] ✅ CAPTCHA resolvido')
                      setLoginCaptchaReady(true)
                    }}
                    onError={() => {
                      console.error('[Login] ❌ Erro no CAPTCHA')
                      setLoginCaptchaReady(false)
                      if (loginTurnstileRef.current) {
                        loginTurnstileRef.current.reset()
                      }
                    }}
                    onExpire={() => {
                      console.warn('[Login] ⏰ CAPTCHA expirado')
                      setLoginCaptchaReady(false)
                      if (loginTurnstileRef.current) {
                        loginTurnstileRef.current.reset()
                      }
                    }}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !loginCaptchaReady}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? 'Verificando...' : 'Esqueci minha senha'}
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
                  <Turnstile 
                    ref={registerTurnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={() => {
                      console.log('[Registro] ✅ CAPTCHA resolvido')
                      setRegisterCaptchaReady(true)
                    }}
                    onError={() => {
                      console.error('[Registro] ❌ Erro no CAPTCHA')
                      setRegisterCaptchaReady(false)
                      if (registerTurnstileRef.current) {
                        registerTurnstileRef.current.reset()
                      }
                    }}
                    onExpire={() => {
                      console.warn('[Registro] ⏰ CAPTCHA expirado')
                      setRegisterCaptchaReady(false)
                      if (registerTurnstileRef.current) {
                        registerTurnstileRef.current.reset()
                      }
                    }}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !registerCaptchaReady}>
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