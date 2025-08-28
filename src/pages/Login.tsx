import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Brain, Heart } from "lucide-react"

const Login = () => {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    email: '',
    password: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { error } = await signIn(formData.email, formData.password)
      
      if (error) {
        toast({
          title: "Erro no login",
          description: error.message || "Credenciais inválidas",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o dashboard...",
        })
        navigate("/dashboard", { state: { fromLogin: true } })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { error } = await signUp(formData.email, formData.password, {
        nome: formData.name,
        profissao: formData.profession
      })
      
      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message || "Não foi possível criar a conta",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar a conta.",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo e Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TherapyPro
            </h1>
            <p className="text-muted-foreground">
              Sistema completo para profissionais da saúde mental
            </p>
          </div>
        </div>

        {/* Features Cards */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border shadow-soft">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Gestão Completa</p>
              <p className="text-muted-foreground text-xs">Agenda, clientes e pagamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border shadow-soft">
            <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-secondary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Foco no Cuidado</p>
              <p className="text-muted-foreground text-xs">Mais tempo para seus pacientes</p>
            </div>
          </div>
        </div>

        {/* Formulários */}
        <Card className="shadow-large border-border">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    disabled={isLoading}
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                  
                  <div className="text-center">
                    <button 
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={async () => {
                        if (!formData.email) {
                          toast({
                            title: "Email necessário",
                            description: "Digite seu email primeiro para recuperar a senha.",
                            variant: "destructive",
                          })
                          return
                        }
                        try {
                          const { supabase } = await import("@/integrations/supabase/client")
                          const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
                            redirectTo: `${window.location.origin}/reset-password`
                          })
                          if (error) {
                            toast({
                              title: "Erro",
                              description: error.message,
                              variant: "destructive",
                            })
                          } else {
                            toast({
                              title: "Email enviado",
                              description: "Verifique sua caixa de entrada para redefinir sua senha.",
                            })
                          }
                        } catch (error) {
                          toast({
                            title: "Erro",
                            description: "Não foi possível enviar o email de recuperação.",
                            variant: "destructive",
                          })
                        }
                      }}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="Seu nome" 
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profissão</Label>
                    <Select value={formData.profession} onValueChange={(value) => handleInputChange('profession', value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione sua profissão" />
                      </SelectTrigger>
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
                      placeholder="••••••••" 
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-success hover:opacity-90 transition-opacity"
                    disabled={isLoading}
                  >
                    {isLoading ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
        </p>
      </div>
    </div>
  )
}

export default Login