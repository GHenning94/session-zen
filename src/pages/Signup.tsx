import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, UserPlus, Gift } from "lucide-react"

const Signup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [profissao, setProfissao] = useState('Psicólogo')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [referralId, setReferralId] = useState<string | null>(null)
  const [referralUser, setReferralUser] = useState<any>(null)

  // Verificar referral
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralId(ref)
      loadReferralUser(ref)
    }
  }, [searchParams])

  const loadReferralUser = async (refId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, profissao')
        .eq('user_id', refId)
        .single()

      if (!error && data) {
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
          title: "E-mail já cadastrado",
          description: "Esta conta já está vinculada ao TherapyPro",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome,
            profissao,
            referral_id: referralId
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Se há referral, salvar na sessão para processar após escolha do plano
        if (referralId) {
          sessionStorage.setItem('pending_referral', referralId)
        }

        // Mostrar tela de sucesso com opção de reenviar
        setShowSuccess(true)
      }
    } catch (error: any) {
      console.error('Erro no cadastro:', error)
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível criar a conta.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) throw error

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

  // Tela de sucesso após cadastro
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Conta Criada!</CardTitle>
                <CardDescription className="mt-4">
                  Enviamos um link de confirmação para <strong>{email}</strong>
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-2">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
              <CardDescription>
                Comece sua jornada profissional no TherapyPro
              </CardDescription>
              {referralUser && (
                <div className="mt-4 p-3 rounded-lg border" 
                     style={{ 
                       backgroundColor: 'hsl(142 71% 45% / 0.1)', 
                       borderColor: 'hsl(142 71% 45% / 0.3)' 
                     }}>
                  <div className="flex items-center justify-center gap-2" 
                       style={{ color: 'hsl(142 71% 35%)' }}>
                    <Gift className="w-4 h-4" />
                    <span className="text-sm font-medium">Convite Especial</span>
                  </div>
                  <p className="text-xs mt-1" 
                     style={{ color: 'hsl(142 71% 40%)' }}>
                    Convidado por <strong>{referralUser.nome}</strong>
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs px-2 py-1" 
                         style={{ 
                           backgroundColor: 'hsl(142 71% 45% / 0.2)', 
                           color: 'hsl(142 71% 35%)' 
                         }}>
                    20% OFF no primeiro mês
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profissao">Profissão</Label>
                <Input
                  id="profissao"
                  type="text"
                  value={profissao}
                  onChange={(e) => setProfissao(e.target.value)}
                  required
                  placeholder="Ex: Psicólogo, Terapeuta, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                />
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