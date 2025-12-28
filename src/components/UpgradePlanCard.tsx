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
  monthlyPrice: string
  annualPrice: string
  period: string
  icon: React.ReactNode
  description: string
  features: string[]
  recommended?: boolean
  monthlyStripePrice: string
  annualStripePrice: string
  currentPlan?: boolean
  annualSubtext?: string
}

interface UpgradePlanCardProps {
  currentPlan: string
}

export const UpgradePlanCard = ({ currentPlan }: UpgradePlanCardProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const allPlans: Plan[] = [
    {
      id: 'basico',
      name: 'Básico',
      monthlyPrice: 'R$ 0',
      annualPrice: 'R$ 0',
      period: '/mês',
      icon: <Star className="h-5 w-5" />,
      description: 'Ideal para começar',
      features: ['Até 3 clientes', 'Até 4 sessões por cliente', 'Agendamento básico'],
      monthlyStripePrice: '',
      annualStripePrice: '',
      currentPlan: currentPlan === 'basico'
    },
    {
      id: 'pro',
      name: 'Profissional',
      monthlyPrice: 'R$ 29,90',
      annualPrice: 'R$ 24,90',
      period: '/mês',
      icon: <Zap className="h-5 w-5" />,
      description: 'Para profissionais em crescimento',
      features: ['Até 20 clientes', 'Sessões ilimitadas', 'Histórico básico', 'Agendamento online'],
      recommended: true,
      monthlyStripePrice: 'price_1SSMNgCP57sNVd3laEmlQOcb',
      annualStripePrice: 'price_1SSMOdCP57sNVd3la4kMOinN',
      currentPlan: currentPlan === 'pro',
      annualSubtext: '12x R$ 24,90 = R$ 298,80/ano'
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 'R$ 49,90',
      annualPrice: 'R$ 41,58',
      period: '/mês',
      icon: <Crown className="h-5 w-5" />,
      description: 'Máximo poder e recursos',
      features: ['Clientes ilimitados', 'Histórico completo', 'Relatórios PDF', 'Integração WhatsApp'],
      monthlyStripePrice: 'price_1SSMOBCP57sNVd3lqjfLY6Du',
      annualStripePrice: 'price_1SSMP7CP57sNVd3lSf4oYINX',
      currentPlan: currentPlan === 'premium',
      annualSubtext: '12x R$ 41,58 = R$ 498,96/ano'
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
      const stripePrice = billingCycle === 'monthly' ? plan.monthlyStripePrice : plan.annualStripePrice
      const referralCode = localStorage.getItem('referral_code') || sessionStorage.getItem('pending_referral')
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: stripePrice,
          planName: plan.name,
          returnUrl: window.location.origin,
          referralCode: referralCode || undefined
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

  const displayedPlans = allPlans.filter(plan => plan.id !== currentPlan)

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-5 w-5 text-primary" />
          Planos de assinatura
        </CardTitle>
        <CardDescription>
          {currentPlanInfo ? `Você está no plano ${currentPlanInfo.name}` : 'Escolha um plano para começar'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Seletor de Ciclo de Cobrança */}
        <div className="flex items-center justify-center gap-2 md:gap-3 py-2 flex-wrap">
          <span className={`text-xs md:text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensal
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-12 h-6 rounded-full p-0 shrink-0"
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-primary transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : ''}`} />
          </Button>
          <div className="flex items-center gap-1">
            <span className={`text-xs md:text-sm font-medium ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Anual
            </span>
            <Badge variant="secondary" className="text-[10px] md:text-xs">-17%</Badge>
          </div>
        </div>

        {displayedPlans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
          const isAnnual = billingCycle === 'annual'
          
          return (
            <Card key={plan.id} className="relative border-2 border-border hover:border-primary/50 transition-colors">
              {plan.recommended && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                  Recomendado
                </Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {plan.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <CardDescription className="text-xs">{plan.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  {isAnnual && plan.annualSubtext && (
                    <p className="text-xs text-muted-foreground mt-1">{plan.annualSubtext}</p>
                  )}
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => handleChangePlan(plan)}
                  disabled={loading}
                  variant={plan.recommended ? "default" : "outline"}
                >
                  {loading ? 'Processando...' : `Escolher ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          )
        })}

        <Button 
          variant="ghost" 
          className="w-full text-sm" 
          onClick={handleViewAllPlans}
        >
          Ver detalhes completos
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}