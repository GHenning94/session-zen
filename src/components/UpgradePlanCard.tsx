import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Zap, Star, ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

interface Plan {
  id: string
  name: string
  price: string
  period: string
  icon: React.ReactNode
  description: string
  features: string[]
  recommended?: boolean
  stripePrice: string
  currentPlan?: boolean
}

interface UpgradePlanCardProps {
  currentPlan: string
}

export const UpgradePlanCard = ({ currentPlan }: UpgradePlanCardProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const allPlans: Plan[] = [
    {
      id: 'basico',
      name: 'Básico',
      price: 'R$ 0',
      period: '/mês',
      icon: <Star className="h-5 w-5" />,
      description: 'Ideal para começar',
      features: ['Até 3 clientes', 'Até 4 sessões por cliente', 'Agendamento básico'],
      stripePrice: '',
      currentPlan: currentPlan === 'basico'
    },
    {
      id: 'pro',
      name: 'Profissional',
      price: 'R$ 29,90',
      period: '/mês',
      icon: <Zap className="h-5 w-5" />,
      description: 'Para profissionais em crescimento',
      features: ['Até 20 clientes', 'Sessões ilimitadas', 'Histórico básico', 'Agendamento online'],
      recommended: true,
      stripePrice: 'price_1RowvqFeTymAqTGEU6jkKtXi', // ID CORRETO DO PROFISSIONAL
      currentPlan: currentPlan === 'pro'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$ 59,90',
      period: '/mês',
      icon: <Crown className="h-5 w-5" />,
      description: 'Máximo poder e recursos',
      features: ['Clientes ilimitados', 'Histórico completo', 'Relatórios PDF', 'Integração WhatsApp'],
      stripePrice: 'price_1RoxpDFeTymAqTGEWg0sS49i', // ID CORRETO DO PREMIUM
      currentPlan: currentPlan === 'premium'
    }
  ]

  const currentPlanInfo = allPlans.find(plan => plan.id === currentPlan)

  const handleChangePlan = async (plan: Plan) => {
    if (!user || plan.id === currentPlan) return
    
    // Se for plano básico (gratuito), usar função de teste
    if (plan.id === 'basico') {
      setLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('test-upgrade', {
          body: { plan: 'basico' }
        })

        if (error) throw error
        
        alert('Plano alterado com sucesso para Básico!')
        window.location.reload()
      } catch (error) {
        console.error('Erro ao alterar plano:', error)
        alert('Erro ao alterar plano. Tente novamente.')
      } finally {
        setLoading(false)
      }
      return
    }
    
    // Para planos pagos, usar Stripe
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: plan.stripePrice,
          planName: plan.name
        }
      })

      if (error) throw error

      if (data?.url) {
        window.open(data.url, '_self')
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      alert('Erro ao processar pagamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewAllPlans = () => {
    navigate('/upgrade')
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Planos de Assinatura
        </CardTitle>
        <CardDescription>
          Seu plano atual: <strong>{currentPlanInfo?.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Todos os Planos */}
        <div className="space-y-4">
          {allPlans.map((plan) => (
            <div 
              key={plan.id} 
              className={`p-4 border rounded-lg transition-all ${
                plan.id === currentPlan 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Ícone e Info Principal */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    plan.id === currentPlan ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {plan.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      {plan.recommended && (
                        <Badge className="text-xs bg-primary text-primary-foreground">
                          Popular
                        </Badge>
                      )}
                      {plan.id === currentPlan && (
                        <Badge className="text-xs bg-green-500 text-white">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                </div>

                {/* Recursos */}
                <div className="w-full sm:w-auto sm:flex-shrink-0">
                  <div className="mb-4 sm:mb-0 sm:min-w-[200px]">
                    <ul className="text-sm space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                          <span className="text-xs sm:text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="w-full sm:w-auto">
                  <Button
                    className="w-full sm:w-auto sm:min-w-[140px]"
                    size="default"
                    variant={plan.id === currentPlan ? "outline" : plan.recommended ? "default" : "outline"}
                    onClick={() => handleChangePlan(plan)}
                    disabled={loading || plan.id === currentPlan}
                  >
                    {loading ? 'Processando...' : 
                     plan.id === currentPlan ? 'Plano Atual' :
                     plan.id === 'basico' ? 'Alterar para Básico' :
                     `Alterar para ${plan.name}`}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Button 
            variant="ghost" 
            className="text-sm" 
            size="sm"
            onClick={handleViewAllPlans}
          >
            Ver detalhes completos <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}