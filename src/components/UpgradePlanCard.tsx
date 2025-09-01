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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="w-4 h-4 text-primary" />
          Planos de Assinatura
        </CardTitle>
        <CardDescription className="text-xs">
          Seu plano atual: <strong>{currentPlanInfo?.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Todos os Planos */}
        <div className="space-y-3">
          {allPlans.map((plan) => (
            <div 
              key={plan.id} 
              className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                plan.id === currentPlan 
                  ? 'border-primary bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg' 
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
              }`}
            >
              {/* Header do Plano */}
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      plan.id === currentPlan 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {plan.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-semibold">{plan.name}</h3>
                        {plan.recommended && (
                          <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                            Popular
                          </Badge>
                        )}
                        {plan.id === currentPlan && (
                          <Badge className="bg-green-500 text-white text-xs px-1.5 py-0.5">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base font-bold">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recursos e Botão */}
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  {/* Lista de Recursos */}
                  <div>
                    <ul className="space-y-1.5">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-0.5"></div>
                          <span className="text-xs">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão de Ação */}
                  <div>
                    <Button
                      className="w-full h-8 text-xs font-medium"
                      size="sm"
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