import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, UserPlus, Gift, Check, X } from "lucide-react" // Check, X mantidos para requisitos de senha

const Signup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState(''); // Manter confirmação de senha
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
  
  // Captcha removido daqui

  // useEffect e loadReferralUser (Inalterados)
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
        // Toast do referral pode ser mantido
        // toast({ ... }) 
      }
    } catch (error) {
      console.error('Erro ao carregar dados do convite:', error)
    }
  }

  // Requisitos de senha (Mantidos)
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

  // --- REVERTIDO PARA supabase.auth.signUp ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (!validatePassword(password)) {
      toast({ title: "Senha inválida", description: "A senha deve atender a todos os requisitos.", variant: "destructive" })
      return
    }
    
    setIsLoading(true)

    try {
      // Voltar a usar a função nativa signUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // O Supabase enviará o e-mail para esta URL (a sua página AuthConfirm)
          emailRedirectTo: `${window.location.origin}/auth/confirm`, 
          data: {
            nome,
            profissao,
            referral_id: referralId
          }
          // O captcha é tratado pelo Supabase baseado nas suas configurações
        }
      })

      // O Supabase pode retornar erro se o captcha falhar ou se o e-mail já existir (depende das config)
      if (error) throw error

      if (data.user || data.session === null) { // Supabase retorna session=null se e-mail já existe
        if (referralId) {
          sessionStorage.setItem('pending_referral', referralId)
        }
        setShowSuccess(true) // Mostra a tela de sucesso (que diz para verificar o e-mail)
        toast({ title: "Verifique seu e-mail", description: "Enviamos um link de confirmação para o seu e-mail." })
      }
    } catch (error: any) {
      console.error('Erro no cadastro:', error)
      // Traduzir o erro mais comum
      let description = error.message || "Não foi possível criar a conta.";
      if (error.message.includes('User already registered')) {
         description = "Este e-mail já está em uso. Tente fazer o login ou recuperar a senha.";
      } else if (error.message.includes('captcha')) {
         description = "Falha na verificação de segurança. Tente novamente.";
      }
      
      toast({
        title: "Erro no cadastro",
        description: description,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      // Captcha não precisa ser resetado manualmente aqui
    }
  }

  // Reenvio usa a função nativa 'resend'
  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return
    
    try {
      setIsLoading(true); // Usar isLoading para desabilitar o botão
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) throw error

      toast({
        title: "E-mail reenviado!",
        description: "Verifique sua caixa de entrada.",
      })

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
    } finally {
        setIsLoading(false);
    }
  }

  // Tela de sucesso (Inalterada, mas agora sem Captcha)
  if (showSuccess) {
    return (
      <div className="min-h-screen ..."> {/* Conteúdo inalterado */}
        <Card className="shadow-xl">
            <CardHeader> {/* Conteúdo inalterado */} </CardHeader>
            <CardContent className="space-y-4">
              {/* Captcha removido daqui */}
              <Button
                onClick={handleResendConfirmation}
                variant="outline"
                className="w-full"
                disabled={resendCooldown > 0 || isLoading} // Usa isLoading
              >
                {isLoading ? "Reenviando..." : (resendCooldown > 0 
                  ? `Reenviar em ${resendCooldown}s` 
                  : 'Reenviar Link')}
              </Button>
              {/* ... (Botão Voltar) ... */}
            </CardContent>
          </Card>
      </div>
    )
  }

  // Formulário Principal (Com confirmação de senha e requisitos)
  return (
    <div className="min-h-screen ..."> {/* Conteúdo inalterado */}
       <Card className="shadow-xl">
          <CardHeader> {/* Conteúdo inalterado */} </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {/* ... (Campos Nome, Profissão, Email) ... */}
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repita sua senha"
                />
                 {confirmPassword && password !== confirmPassword && (<p className="text-sm text-red-500">As senhas não coincidem</p>)}
              </div>
              {/* Mostrar requisitos da senha */}
              {password && (
                 <div className="space-y-1 pt-1 border-t border-muted/50 mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Requisitos da senha:</p>
                    {passwordRequirements.map((req, index) => {
                       const isValid = req.test(password);
                       return ( /* ... (Lógica de exibição inalterada) ... */ );
                    })}
                 </div>
              )}
              {/* Captcha removido daqui */}
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isLoading} // Não depende mais do captcha token
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
             {/* ... (Botão Voltar para Login) ... */}
          </CardContent>
        </Card>
    </div>
  )
}

export default Signup