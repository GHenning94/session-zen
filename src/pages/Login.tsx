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
import { Stethoscope, Brain, Heart, Check, X } from "lucide-react"

const Login = () => {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const passwordRequirements = [
    {
      text: "Pelo menos 8 caracteres",
      test: (pwd: string) => pwd.length >= 8
    },
    {
      text: "Uma letra maiúscula",
      test: (pwd: string) => /[A-Z]/.test(pwd)
    },
    {
      text: "Uma letra minúscula", 
      test: (pwd: string) => /[a-z]/.test(pwd)
    },
    {
      text: "Um número",
      test: (pwd: string) => /\d/.test(pwd)
    },
    {
      text: "Um caractere especial",
      test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }
  ]

  const validatePassword = (password: string) => {
    return passwordRequirements.every(req => req.test(password))
  }

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
    
    // Validar se as senhas são iguais
    if (formData.password !== formData.confirmPassword) {
      return // A mensagem já aparece no campo
    }
    
    // Validar requisitos da senha
    if (!validatePassword(formData.password)) {
      toast({
        title: "Senha inválida",
        description: "A senha deve atender a todos os requisitos listados.",
        variant: "destructive",
      })
      return
    }
    
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
                  <div className="text-center">
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full mb-4"
                      onClick={() => {
                        // Implementar login com Google
                        toast({
                          title: "Funcionalidade em desenvolvimento",
                          description: "O login com Google será implementado em breve.",
                        })
                      }}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continuar com Google
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">OU</span>
                      </div>
                    </div>
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
                    <div className="relative">
                      <Input 
                        id="register-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={formData.password}
                        onChange={(e) => {
                          handleInputChange('password', e.target.value)
                          setShowPasswordRequirements(e.target.value.length > 0)
                        }}
                        onFocus={() => setShowPasswordRequirements(formData.password.length > 0)}
                        onBlur={() => setShowPasswordRequirements(false)}
                        required 
                      />
                      {showPasswordRequirements && (
                        <div className="absolute top-full left-0 mt-2 w-full p-4 bg-background border border-border rounded-lg shadow-lg z-50">
                          <p className="text-sm font-medium text-foreground mb-2">Requisitos da senha:</p>
                          <div className="space-y-1">
                            {passwordRequirements.map((req, index) => {
                              const isValid = req.test(formData.password)
                              return (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  {isValid ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <X className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span className={isValid ? "text-green-500" : "text-muted-foreground"}>
                                    {req.text}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Repetir Senha</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      placeholder="Confirme sua senha" 
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      required 
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-sm text-red-500">As senhas não coincidem</p>
                    )}
                  </div>
                  <div className="text-center">
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full mb-4"
                      onClick={() => {
                        // Implementar login com Google
                        toast({
                          title: "Funcionalidade em desenvolvimento",
                          description: "O login com Google será implementado em breve.",
                        })
                      }}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continuar com Google
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">OU</span>
                      </div>
                    </div>
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