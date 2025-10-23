// src/pages/Signup.tsx
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, UserPlus, Gift, Check, X } from "lucide-react" // Adicionado Check, X
import { Turnstile } from "@marsidev/react-turnstile" // Adicionado Turnstile

const Signup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState(''); // Adicionado Confirmar Senha
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
  
  // --- INÍCIO DA CORREÇÃO (Captcha) ---
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0) // Para resetar o captcha
  const TURNSTILE_SITE_KEY = '0x4AAAAAAB43UmamQYOA5yfH'; // A sua Site Key
  // --- FIM DA CORREÇÃO ---

  // ... (useEffect e loadReferralUser inalterados) ...
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


  // --- INÍCIO DA CORREÇÃO (Validação de Senha) ---
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
  // --- FIM DA CORREÇÃO ---

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // --- INÍCIO DA CORREÇÃO (Chamada da Função) ---
    if (!turnstileToken) {
      toast({ title: "Verificação necessária", description: "Complete a verificação de segurança.", variant: "destructive" })
      return
    }
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
      // Chamar a nossa nova Edge Function
      const { data, error } = await supabase.functions.invoke('custom-signup', {
        body: {
          email: email,
          password: password,
          metadata: { nome, profissao, referral_id: referralId },
          captchaToken: turnstileToken
        }
      })

      if (error) throw new Error(error.message); // Erros de rede/função
      if (data.error) throw new Error(data.error); // Erros da nossa lógica

      if (referralId) {
        sessionStorage.setItem('pending_referral', referralId)
      }
      setShowSuccess(true) // Mostra a tela de sucesso

    } catch (error: any) {
      console.error('Erro no cadastro:', error)
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
        toast({
          title: "Erro no cadastro",
          description: error.message || "Não foi possível criar a conta.",
          variant: "destructive"
        })
      }
    } finally {
      setIsLoading(false)
      // Resetar o captcha após a tentativa
      setCaptchaKey(prev => prev + 1)
      setTurnstileToken(null)
    }
    // --- FIM DA CORREÇÃO ---
  }

  // --- ATUALIZADO: Usar a função 'custom-signup' para reenviar ---
  const handleResendConfirmation = async () => {
    if (resendCooldown > 0) return
    
    try {
      // NOTE: Para reenviar, a função 'custom-signup' precisa ser chamada novamente.
      // O Supabase não tem uma função 'resend' que use o link personalizado
      // que a nossa função gerou. O comportamento da função 'custom-signup'
      // já é reenviar o link se o utilizador não estiver confirmado.
      
      // Simular a chamada com dados mínimos (a função vai apenas reenviar o link)
      // Precisamos de uma senha temporária (não será usada) e do token captcha.
      
      // TODO: Obter um token captcha novo para o reenvio.
      // A forma mais fácil é pedir ao utilizador para resolver o captcha de novo.
      // Por agora, vamos assumir que ainda temos um token válido (o que pode não ser verdade).
      // Uma solução melhor seria adicionar um botão "Resolver Captcha" aqui.
      if (!turnstileToken) {
          toast({ title: "Verificação necessária", description: "Recarregue o Captcha antes de reenviar.", variant: "destructive"});
          return;
      }

      setIsLoading(true); // Usar o mesmo loading
      const { data, error } = await supabase.functions.invoke('custom-signup', {
         body: {
            email: email,
            password: 'temporaryPassword1!', // Senha temporária, não será usada
            metadata: {}, // Metadata vazia
            captchaToken: turnstileToken
         }
      });
      setIsLoading(false);

      if (error || data.error) {
         throw new Error(error?.message || data?.error || 'Erro desconhecido');
      }

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
      setIsLoading(false);
      toast({
        title: "Erro ao reenviar",
        description: error.message || "Não foi possível reenviar o e-mail.",
        variant: "destructive"
      })
    } finally {
        // Resetar captcha após reenvio
        setCaptchaKey(prev => prev + 1);
        setTurnstileToken(null);
    }
  }

  // Tela de sucesso (inalterada)
  if (showSuccess) {
    return (
      <div className="min-h-screen ..."> {/* Conteúdo inalterado */}
        <Card className="shadow-xl">
            <CardHeader> {/* Conteúdo inalterado */} </CardHeader>
            <CardContent className="space-y-4">
              {/* --- INÍCIO DA CORREÇÃO (Captcha Reenvio) --- */}
              {/* Adicionar o Turnstile aqui também para o reenvio */}
              <div className="flex justify-center">
                 <Turnstile
                    key={captchaKey}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => setTurnstileToken(null)}
                    onExpire={() => setTurnstileToken(null)}
                 />
              </div>
              {/* --- FIM DA CORREÇÃO --- */}
              <Button
                onClick={handleResendConfirmation}
                variant="outline"
                className="w-full"
                disabled={resendCooldown > 0 || isLoading || !turnstileToken} // Desabilitar se não houver captcha
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

  // Formulário Principal
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
              {/* --- INÍCIO DA CORREÇÃO (Confirmar Senha) --- */}
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
                       return (
                          <div key={index} className="flex items-center gap-1 text-xs">
                             {isValid ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-muted-foreground" />}
                             <span className={isValid ? "text-green-600" : "text-muted-foreground"}>{req.text}</span>
                          </div>
                       );
                    })}
                 </div>
              )}
              {/* --- FIM DA CORREÇÃO --- */}

              {/* --- INÍCIO DA CORREÇÃO (Captcha) --- */}
              <div className="flex justify-center pt-2">
                 <Turnstile
                    key={captchaKey}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => setTurnstileToken(null)}
                    onExpire={() => setTurnstileToken(null)}
                 />
              </div>
              {/* --- FIM DA CORREÇÃO --- */}

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isLoading || !turnstileToken} // Desabilitar se não houver captcha
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
             {/* ... (Botão Voltar) ... */}
          </CardContent>
        </Card>
    </div>
  )
}

export default Signup