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

  // Filtrar planos superiores ao atual
  const getAvailablePlans = () => {
    const planOrder = ['basico', 'pro', 'premium']
    const currentIndex = planOrder.indexOf(currentPlan)
    return allPlans.filter((plan, index) => index > currentIndex)
  }

  const availablePlans = getAvailablePlans()
  const currentPlanInfo = allPlans.find(plan => plan.id === currentPlan)

  const handleUpgrade = async (plan: Plan) => {
    if (!user) return
    
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

  if (availablePlans.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Seu Plano
          </CardTitle>
          <CardDescription>
            Você está no nosso plano mais avançado!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-primary/20 rounded-lg bg-primary/5">
            <div className="flex items-center gap-3">
              {currentPlanInfo?.icon}
              <div>
                <p className="font-medium">{currentPlanInfo?.name}</p>
                <p className="text-sm text-muted-foreground">{currentPlanInfo?.description}</p>
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground">
              Ativo
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Upgrade de Plano
        </CardTitle>
        <CardDescription>
          Desbloqueie mais funcionalidades para sua prática
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plano Atual */}
        <div className="p-3 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentPlanInfo?.icon}
              <div>
                <p className="font-medium text-sm">Plano Atual: {currentPlanInfo?.name}</p>
                <p className="text-xs text-muted-foreground">{currentPlanInfo?.price}{currentPlanInfo?.period}</p>
              </div>
            </div>
            <Badge variant="outline">
              Ativo
            </Badge>
          </div>
        </div>

        {/* Planos Disponíveis para Upgrade */}
        <div className="space-y-3">
          {availablePlans.slice(0, 2).map((plan) => (
            <div key={plan.id} className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    {plan.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{plan.name}</p>
                      {plan.recommended && (
                        <Badge className="text-xs bg-primary text-primary-foreground">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{plan.price}</p>
                  <p className="text-xs text-muted-foreground">{plan.period}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Principais recursos:</p>
                <ul className="text-xs space-y-1">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full"
                size="sm"
                variant={plan.recommended ? "default" : "outline"}
                onClick={() => handleUpgrade(plan)}
                disabled={loading}
              >
                {loading ? 'Processando...' : `Upgrade para ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>

        <Button 
          variant="ghost" 
          className="w-full" 
          size="sm"
          onClick={handleViewAllPlans}
        >
          Ver todos os planos <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}