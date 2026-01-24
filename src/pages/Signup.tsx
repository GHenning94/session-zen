import { useState, useEffect, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useNavigate, useSearchParams } from "react-router-dom"
import { PasswordRequirements } from "@/components/PasswordRequirements"
import { ArrowLeft, UserPlus } from "lucide-react"

const PREDEFINED_PROFESSIONS = [
  "Psicólogo(a)",
  "Psicanalista", 
  "Terapeuta",
  "Coach"
]

const Signup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [profissao, setProfissao] = useState('Psicólogo')
  const [customProfissao, setCustomProfissao] = useState('')
  const [showCustomProfissao, setShowCustomProfissao] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [referralId, setReferralId] = useState<string | null>(null)
  const [referralUser, setReferralUser] = useState<any>(null)
  
  // Capturar plano selecionado da URL (ex: /signup?plan=premium)
  // Também verificar localStorage caso venha do Login (que já salvou)
  const urlPlan = searchParams.get('plan')
  const storedPlan = localStorage.getItem('pending_plan')
  const selectedPlan = urlPlan || storedPlan
  
  // ✅ Garantir que o plano seja salvo no localStorage assim que detectado
  useEffect(() => {
    if (selectedPlan && selectedPlan !== 'basico') {
      console.log('[Signup] 💾 Plano detectado, salvando no localStorage:', selectedPlan)
      localStorage.setItem('pending_plan', selectedPlan)
      
      // Também salvar billing cycle se disponível
      const billing = searchParams.get('billing') || localStorage.getItem('pending_billing') || 'monthly'
      if (billing) {
        localStorage.setItem('pending_billing', billing)
      }
      
      // Backup no sessionStorage também
      sessionStorage.setItem('pending_plan_backup', selectedPlan)
      if (billing) {
        sessionStorage.setItem('pending_billing_backup', billing)
      }
    }
  }, [selectedPlan, searchParams])

  // Force light theme on this page
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark');
    html.classList.add('light');
    html.style.colorScheme = 'light';
  }, []);

  // Verificar referral ao montar o componente
  useEffect(() => {
    // Check URL param first
    const refId = searchParams.get('ref')
    if (refId) {
      setReferralId(refId)
      loadReferralUser(refId)
      return
    }
    
    // Check localStorage for referral code from /convite/:code page
    const storedCode = localStorage.getItem('referral_code')
    if (storedCode) {
      // Extract user ID from code format REF-{userId.slice(0,8).toUpperCase()}
      const userIdPart = storedCode.replace('REF-', '').toLowerCase()
      loadReferralFromCode(userIdPart)
    }
  }, [searchParams])

  const loadReferralUser = async (refId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, profissao, user_id')
        .eq('user_id', refId)
        .single()

      if (!error && data) {
        setReferralId(data.user_id)
        setReferralUser(data)
        toast({
          title: "Convite especial! 🎉",
          description: `Você foi convidado por ${data.nome}. Ganhe 20% de desconto no primeiro mês!`,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar dados do convite:', error)
    }
  }

  const loadReferralFromCode = async (userIdPart: string) => {
    try {
      // Find the user by matching the beginning of their user_id
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('nome, profissao, user_id')
        .eq('is_referral_partner', true)

      if (error) {
        console.error('Error fetching referrer:', error)
        return
      }

      // Find the profile that matches the referral code
      const referrer = profiles?.find(profile => 
        profile.user_id.slice(0, 8).toLowerCase() === userIdPart
      )

      if (referrer) {
        setReferralId(referrer.user_id)
        setReferralUser({ nome: referrer.nome, profissao: referrer.profissao })
        toast({
          title: "Convite especial! 🎉",
          description: `Você foi convidado por ${referrer.nome}. Ganhe 20% de desconto no primeiro mês!`,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar dados do convite:', error)
    }
  }

  const validatePassword = (password: string) => {
    const requirements = [
      { test: (pwd: string) => pwd.length >= 8, message: "Pelo menos 8 caracteres" },
      { test: (pwd: string) => /[A-Z]/.test(pwd), message: "Uma letra maiúscula" },
      { test: (pwd: string) => /[a-z]/.test(pwd), message: "Uma letra minúscula" },
      { test: (pwd: string) => /\d/.test(pwd), message: "Um número" },
      { test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), message: "Um caractere especial" }
    ]
    
    return requirements.every(req => req.test(password))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar requisitos da senha
    if (!validatePassword(password)) {
      toast({
        title: "Senha inválida",
        description: "A senha deve atender a todos os requisitos listados.",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)

    try {
      // Verificar se o e-mail já está cadastrado
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-email-exists', {
        body: { email }
      })
      
      if (checkData?.exists) {
        toast({
          title: "Conta já existe",
          description: "Esta conta já existe no TherapyPro. Por favor realize o Login.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/login')}
            >
              Ir para Login
            </Button>
          ),
        })
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase.functions.invoke('request-email-confirmation', {
        body: {
          email,
          password,
          user_metadata: {
            nome,
            profissao,
            referral_id: referralId
          },
          redirect_to: 'https://therapypro.app.br/auth-confirm'
        }
      })

      if (error || data?.error) throw new Error(data?.error || error?.message)

      if (data.user) {
        // ✅ GARANTIR que o plano seja salvo (mesmo que já tenha sido salvo no useEffect)
        // Isso garante que o plano não seja perdido mesmo se houver algum problema
        if (selectedPlan && selectedPlan !== 'basico') {
          console.log('[Signup] 💾 Confirmando plano no localStorage após cadastro:', selectedPlan)
          localStorage.setItem('pending_plan', selectedPlan)
          
          // Backup no sessionStorage também
          sessionStorage.setItem('pending_plan_backup', selectedPlan)
          
          const billing = searchParams.get('billing') || localStorage.getItem('pending_billing') || 'monthly'
          localStorage.setItem('pending_billing', billing)
          sessionStorage.setItem('pending_billing_backup', billing)
        }

        // Se há referral, salvar na sessão para processar após escolha do plano
        if (referralId) {
          sessionStorage.setItem('pending_referral', referralId)
        }

        // Mostrar tela de sucesso com opção de reenviar
        setShowSuccess(true)
      }
    } catch (error: any) {
      console.error('Erro no cadastro:', error)
      
      // Traduzir erros do Supabase para português
      let errorMessage = 'Erro ao criar conta. Tente novamente.'
      
      if (error.message.includes('User already registered')) {
        errorMessage = 'Esta conta já existe no TherapyPro. Por favor realize o Login.'
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'E-mail inválido'
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Muitas tentativas. Aguarde alguns minutos.'
      }
      
      toast({
        title: "Erro ao criar conta",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return
    
    try {
      const { data, error } = await supabase.functions.invoke('resend-confirmation-email', {
        body: { email }
      })

      if (error || data?.error) throw new Error(data?.error || error?.message)

      toast({
        title: "E-mail reenviado!",
        description: "Verifique sua caixa de entrada.",
      })

      // Cooldown de 60 segundos
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar",
        description: error.message || "Não foi possível reenviar o e-mail.",
        variant: "destructive"
      })
    }
  }

  // Light theme styles (inline to guarantee they apply)
  const lightThemeStyles = {
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  };

  // Tela de sucesso após cadastro
  if (showSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={lightThemeStyles}>
        {/* Blue blob background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} />
        <div className="w-full max-w-md relative z-10">
          <Card className="shadow-xl" style={{ backgroundColor: '#ffffff' }}>
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Conta Criada!</CardTitle>
                <CardDescription className="mt-4" style={{ color: '#6b7280' }}>
                  Enviamos um link de confirmação para <strong style={{ color: '#1a1a1a' }}>{email}</strong>
                </CardDescription>
                <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
                  Clique no link para confirmar seu e-mail e acessar a plataforma.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                onClick={handleResendConfirmation}
                variant="outline"
                className="w-full"
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 
                  ? `Reenviar em ${resendCooldown}s` 
                  : 'Reenviar Link'}
              </Button>

              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={lightThemeStyles}>
      {/* Blue blob background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} />
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-xl" style={{ backgroundColor: '#ffffff' }}>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Criar Conta</CardTitle>
              <CardDescription style={{ color: '#6b7280' }}>
                Comece sua jornada profissional no TherapyPro
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" style={{ color: '#1a1a1a' }}>Nome Completo</Label>
                <Input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Seu nome completo"
                  style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#1a1a1a' }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profissao" style={{ color: '#1a1a1a' }}>Profissão</Label>
                <Select
                  value={showCustomProfissao ? "Outros" : profissao}
                  onValueChange={(value) => {
                    if (value === "Outros") {
                      setShowCustomProfissao(true)
                      setProfissao('')
                    } else {
                      setShowCustomProfissao(false)
                      setProfissao(value)
                      setCustomProfissao('')
                    }
                  }}
                >
                  <SelectTrigger className="w-full" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#1a1a1a' }}>
                    <SelectValue placeholder="Selecione sua profissão" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: '#ffffff' }}>
                    {PREDEFINED_PROFESSIONS.map((prof) => (
                      <SelectItem key={prof} value={prof}>
                        {prof}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCustomProfissao && (
                  <Input
                    id="customProfissao"
                    type="text"
                    value={customProfissao}
                    onChange={(e) => {
                      setCustomProfissao(e.target.value)
                      setProfissao(e.target.value)
                    }}
                    required
                    placeholder="Digite sua profissão"
                    className="mt-2"
                    style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#1a1a1a' }}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: '#1a1a1a' }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#1a1a1a' }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: '#1a1a1a' }}>Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#1a1a1a' }}
                />
                {password && <PasswordRequirements password={password} />}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="text-sm"
                style={{ color: '#6b7280' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Signup