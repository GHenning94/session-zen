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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
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

        toast({
          title: "Conta criada com sucesso!",
          description: referralId ? 
            "Bem-vindo ao TherapyPro! Seu desconto de 20% será aplicado no primeiro mês." :
            "Bem-vindo ao TherapyPro. Escolha seu plano para continuar.",
        })
        
        // Redirecionar para página de upgrade/planos
        navigate('/upgrade')
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
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-800">
                    <Gift className="w-4 h-4" />
                    <span className="text-sm font-medium">Convite Especial</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Convidado por <strong>{referralUser.nome}</strong>
                  </p>
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
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
                  minLength={6}
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