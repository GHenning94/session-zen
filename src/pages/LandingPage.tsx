import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Stethoscope, Calendar, Users, DollarSign, TrendingUp,
  CheckCircle, Star, ArrowRight, Brain, Heart, Shield, Clock,
  GraduationCap, MessageCircle, Target, BookOpen, Activity,
  BarChart3, User, Sparkles
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useState, useEffect } from "react"

const LandingPage = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [displayText, setDisplayText] = useState("")
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [waitingToDelete, setWaitingToDelete] = useState(false)
  const words = ["atendimentos", "agendamentos", "ganhos", "clientes"]

  // Force light theme for landing page - MAIS ROBUSTO
  useEffect(() => {
    // Prevent theme from affecting landing page
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    document.documentElement.setAttribute('data-theme', 'light')
    document.body.style.colorScheme = 'light'
    
    // Override any CSS variables that might be applied
    document.documentElement.style.setProperty('--primary', '217 91% 45%')
    document.documentElement.style.setProperty('--background', '0 0% 100%')
    document.documentElement.style.setProperty('--foreground', '215 25% 15%')
    
    return () => {
      document.body.style.colorScheme = ''
      // Don't restore theme variables on unmount - let the app handle it
    }
  }, [])

  useEffect(() => {
    const word = words[currentWordIndex]
    let timeout: NodeJS.Timeout

    if (waitingToDelete) {
      timeout = setTimeout(() => {
        setWaitingToDelete(false)
        setIsDeleting(true)
      }, 2000)
    } else if (isDeleting) {
      if (currentCharIndex > 0) {
        timeout = setTimeout(() => {
          setCurrentCharIndex(prev => prev - 1)
          setDisplayText(word.substring(0, currentCharIndex - 1))
        }, 75)
      } else {
        setIsDeleting(false)
        setCurrentWordIndex(prev => (prev + 1) % words.length)
      }
    } else {
      if (currentCharIndex < word.length) {
        timeout = setTimeout(() => {
          setCurrentCharIndex(prev => prev + 1)
          setDisplayText(word.substring(0, currentCharIndex + 1))
        }, 150)
      } else if (!waitingToDelete) {
        setWaitingToDelete(true)
      }
    }

    return () => clearTimeout(timeout)
  }, [currentCharIndex, currentWordIndex, isDeleting, waitingToDelete])


  const features = [
    { icon: Calendar, title: "Agendamento Inteligente", description: "Gerencie sua agenda com facilidade e evite conflitos de horários" },
    { icon: Users, title: "Gestão de Clientes", description: "Mantenha fichas completas com histórico e evolução dos pacientes" },
    { icon: DollarSign, title: "Controle Financeiro", description: "Acompanhe pagamentos e receita mensal de forma organizada" },
    { icon: TrendingUp, title: "Relatórios Detalhados", description: "Insights sobre sua prática profissional e crescimento" }
  ]

  const professionals = [
    { name: "Psicólogos", icon: Brain }, { name: "Psicanalistas", icon: BookOpen }, { name: "Terapeutas", icon: Heart },
    { name: "Coaches", icon: Target }, { name: "Psiquiatras", icon: Activity }, { name: "Terapeutas Ocupacionais", icon: GraduationCap }
  ]

  const plans = [
    { name: "Básico", price: "R$ 0", period: "/mês", description: "Ideal para começar", features: ["Até 4 sessões por cliente", "Agendamento básico", "Suporte por email"], highlighted: false, cta: "Acessar", planId: "basico" },
    { name: "Profissional", price: "R$ 29,90", period: "/mês", description: "Para profissionais em crescimento", features: ["Até 20 clientes", "Sessões ilimitadas", "Histórico básico", "Agendamento online", "Suporte prioritário"], highlighted: true, cta: "Assinar Profissional", planId: "pro" },
    { name: "Premium", price: "R$ 59,90", period: "/mês", description: "Máximo poder e recursos", features: ["Clientes ilimitados", "Histórico completo", "Relatórios em PDF", "Integração WhatsApp", "Backup automático"], highlighted: false, cta: "Assinar Premium", planId: "premium" }
  ]

  const handleGetStarted = (planId?: string) => {
    if (planId === 'basico' || !planId) {
      navigate('/login');
    } else {
      navigate(`/upgrade?plan=${planId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</span>
            </div>
            <div className="flex items-center gap-4">
              <Button className="bg-gradient-primary hover:opacity-90" onClick={() => handleGetStarted()}>
                Acessar Plataforma
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-relaxed pb-4">
              <div className="text-center">
                Organize seus <span className="bg-gradient-primary bg-clip-text text-transparent">{displayText}</span>
              </div>
              <div className="text-center">
                com facilidade
              </div>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              A plataforma completa para psicólogos, psicanalistas e terapeutas gerenciarem agenda, clientes e pagamentos em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6" onClick={() => handleGetStarted()}>
                Acessar Plataforma <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">Ver demonstração</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-accent/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Principais funcionalidades</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Tudo que você precisa para uma gestão profissional e eficiente</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" style={{ minHeight: '320px' }}>
            {features.map((feature, index) => (
              <div key={index} style={{ height: '280px' }} className="text-center shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-105 group bg-gradient-to-br from-card via-card to-card/50 border border-border/50 backdrop-blur-sm relative overflow-hidden transform-gpu will-change-transform rounded-lg flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 p-6 pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow group-hover:scale-110 transition-transform duration-500 transform-gpu">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-300 min-h-[3rem] flex items-center justify-center">{feature.title}</h3>
                </div>
                <div className="relative z-10 flex-1 flex items-start px-6 pb-6">
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Para quem é o TherapyPro?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Desenvolvido especialmente para profissionais da saúde mental que valorizam organização e eficiência</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {professionals.map((prof, index) => (
              <Card key={index} className="text-center p-6 shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105 group bg-gradient-to-br from-card to-card/80 border-border/50 relative overflow-hidden transform-gpu will-change-transform min-h-[120px]">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary/80 rounded-full flex items-center justify-center mx-auto mb-3 shadow-soft group-hover:shadow-glow group-hover:scale-110 transition-all duration-300 transform-gpu">
                    <prof.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-medium text-sm group-hover:text-secondary transition-colors duration-300">{prof.name}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-accent/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Planos que se adaptam ao seu momento</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Comece grátis e evolua conforme sua prática cresce</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`flex flex-col relative shadow-soft hover:shadow-large transition-all ${plan.highlighted ? 'ring-2 ring-primary scale-105' : ''}`}>
                {plan.highlighted && (<Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-white">Mais Popular</Badge>)}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow">
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <CheckCircle className="w-5 h-5 text-[#16a34a]" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full ${plan.highlighted ? 'bg-gradient-primary hover:opacity-90 text-white' : 'bg-muted hover:bg-muted/80 text-foreground'}`} onClick={() => handleGetStarted(plan.planId)}>
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sistema em Ação - Mockups */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Veja o sistema em ação
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Interface profissional e intuitiva, desenvolvida especificamente para otimizar sua prática clínica
            </p>
          </div>
          
          <div className="space-y-20">
            {/* Dashboard Feature */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <img 
                  src="/lovable-uploads/2e8af0d5-549a-4911-9ea0-90db571fb7cd.png" 
                  alt="Dashboard do TherapyPro em laptop" 
                  className="w-full rounded-lg shadow-xl"
                />
              </div>
              <div className="order-1 lg:order-2 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Dashboard Inteligente</h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Visualize todas as métricas importantes da sua prática em um só lugar. Acompanhe receita mensal, 
                  sessões realizadas, próximos compromissos e estatísticas de crescimento com gráficos claros e intuitivos.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Métricas em tempo real</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Gráficos de receita e produtividade</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Agenda do dia destacada</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Agenda Feature */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold">Agenda Avançada</h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Gerencie seus agendamentos com facilidade. Visualize por dia, semana ou mês, 
                  arraste sessões para reagendar e sincronize automaticamente com Google Calendar.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Arrastar e soltar para reagendar</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Múltiplas visualizações</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Integração com Google Calendar</span>
                  </li>
                </ul>
              </div>
              <div>
                <img 
                  src="/lovable-uploads/2e8af0d5-549a-4911-9ea0-90db571fb7cd.png" 
                  alt="Agenda do TherapyPro em smartphone" 
                  className="w-full max-w-sm mx-auto rounded-lg shadow-xl"
                />
              </div>
            </div>

            {/* Client Management Feature */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <img 
                  src="/lovable-uploads/2e8af0d5-549a-4911-9ea0-90db571fb7cd.png" 
                  alt="Gestão de clientes do TherapyPro em tablet" 
                  className="w-full rounded-lg shadow-xl"
                />
              </div>
              <div className="order-1 lg:order-2 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsl(142 71% 45% / 0.1)' }}>
                    <Users className="w-6 h-6" style={{ color: 'hsl(142 71% 45%)' }} />
                  </div>
                  <h3 className="text-2xl font-bold">Gestão Completa de Clientes</h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Mantenha fichas completas dos seus pacientes com histórico de sessões, 
                  anotações clínicas, dados de contato e evolução do tratamento, tudo em um lugar seguro.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Fichas clínicas completas</span>
                  </li>
                  <li className="flex items-center gap-3">
                     <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Histórico de sessões detalhado</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" style={{ color: 'hsl(142 71% 45%)' }} />
                    <span>Segurança e privacidade total</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-soft">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Segurança Total</h3>
              <p className="text-muted-foreground">Seus dados e dos pacientes protegidos com criptografia de ponta</p>
            </Card>
            <Card className="p-8 shadow-soft">
              <Clock className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Economia de Tempo</h3>
              <p className="text-muted-foreground">Automatize tarefas administrativas e foque no que realmente importa</p>
            </Card>
            <Card className="p-8 shadow-soft">
              <Heart className="w-12 h-12 mx-auto mb-4" style={{ color: 'hsl(142 71% 45%)' }} />
              <h3 className="text-xl font-semibold mb-2">Suporte Humano</h3>
              <p className="text-muted-foreground">Atendimento personalizado quando você precisar de ajuda</p>
            </Card>
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronto para transformar sua prática?</h2>
          <p className="text-xl text-white/90 mb-8">Junte-se a centenas de profissionais que já otimizaram sua gestão</p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90" onClick={() => handleGetStarted()}>
            Acessar Plataforma <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2025 TherapyPro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage