import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Stethoscope, Calendar, Users, DollarSign, TrendingUp,
  CheckCircle, Star, ArrowRight, Brain, Heart, Shield, Clock,
  GraduationCap, MessageCircle, Target, BookOpen, Activity,
  BarChart3, User
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import ChatBot from "@/components/ChatBot"

const LandingPage = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Organize seus <span className="bg-gradient-primary bg-clip-text text-transparent">atendimentos</span> com facilidade
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
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
              <Card key={index} className="text-center p-6 shadow-soft hover:shadow-medium transition-shadow">
                <div className="w-12 h-12 bg-gradient-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <prof.icon className="w-6 h-6 text-secondary" />
                </div>
                <p className="font-medium text-sm">{prof.name}</p>
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
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
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

      {/* App Screenshots */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Veja a plataforma em ação
            </h2>
            <p className="text-xl text-muted-foreground">
              Interface intuitiva e recursos profissionais ao seu alcance
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dashboard Mockup */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 h-32 flex items-center justify-center">
                <div className="text-white text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <h3 className="font-semibold">Dashboard</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Visualize suas métricas, próximos compromissos e rendimento mensal de forma clara e organizada.
                </p>
              </div>
            </div>

            {/* Agenda Mockup */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32 flex items-center justify-center">
                <div className="text-white text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2" />
                  <h3 className="font-semibold">Agenda</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Gerencie seus agendamentos com visualização por dia, semana ou mês. Arraste e solte para reagendar.
                </p>
              </div>
            </div>

            {/* Clients Mockup */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 h-32 flex items-center justify-center">
                <div className="text-white text-center">
                  <Users className="h-12 w-12 mx-auto mb-2" />
                  <h3 className="font-semibold">Clientes</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Organize informações dos pacientes, histórico de sessões e dados clínicos de forma segura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-muted-foreground">
              Veja como nossa plataforma está transformando a vida de profissionais da saúde mental
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">Dra. Maria Silva</h4>
                  <p className="text-sm text-muted-foreground">Psicóloga Clínica</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "O TherapyPro revolucionou minha prática. A agenda integrada e os relatórios automáticos economizam horas do meu tempo."
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">Dr. João Santos</h4>
                  <p className="text-sm text-muted-foreground">Psiquiatra</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "A página de agendamento personalizada aumentou minha taxa de agendamentos em 40%. Excelente ferramenta!"
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">Ana Costa</h4>
                  <p className="text-sm text-muted-foreground">Coach de Vida</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "Interface intuitiva e recursos profissionais. Meus clientes adoram a facilidade para agendar sessões."
              </p>
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
              <Heart className="w-12 h-12 text-success mx-auto mb-4" />
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
      <ChatBot />
    </div>
  )
}

export default LandingPage