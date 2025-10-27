import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowLeft, Crown, Zap, Star } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"

export default function Upgrade() {
  const { user } = useAuth()
  const { currentPlan } = useSubscription()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (!user) navigate('/login') }, [user, navigate])

  const STRIPE_PRICES = {
    pro_monthly: 'price_1RowvqFeTymAqTGEU6jkKtXi',
    pro_annual: 'price_1SMifUFeTymAqTGEucpJaUBz',
    premium_monthly: 'price_1RoxpDFeTymAqTGEWg0sS49i',
    premium_annual: 'price_1SMigPFeTymAqTGE6nN3mgP6'
  }

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    { 
      id: 'basico', 
      name: 'Básico', 
      price: 'Grátis', 
      period: '', 
      icon: <Star className="h-6 w-6" />, 
      description: 'Para começar sua jornada', 
      features: [ 
        'Até 3 clientes', 
        'Até 4 sessões por cliente', 
        'Agenda básica', 
        'Suporte por email' 
      ], 
      recommended: false, 
      stripePrice: null, 
      current: currentPlan === 'basico' 
    },
    { 
      id: 'pro', 
      name: 'Profissional', 
      price: billingCycle === 'monthly' ? 'R$ 29,90' : 'R$ 24,90', 
      period: '/mês', 
      icon: <Zap className="h-6 w-6" />, 
      description: 'Para profissionais em crescimento', 
      features: [ 
        'Até 20 clientes', 
        'Sessões ilimitadas', 
        'Histórico completo', 
        'Personalização de design', 
        'Relatórios básicos', 
        'Suporte prioritário' 
      ], 
      recommended: true, 
      stripePrice: billingCycle === 'monthly' ? STRIPE_PRICES.pro_monthly : STRIPE_PRICES.pro_annual, 
      current: currentPlan === 'pro',
      annualDiscount: billingCycle === 'annual' ? '17%' : null
    },
    { 
      id: 'premium', 
      name: 'Premium', 
      price: billingCycle === 'monthly' ? 'R$ 49,90' : 'R$ 41,58', 
      period: '/mês', 
      icon: <Crown className="h-6 w-6" />, 
      description: 'Recursos completos e avançados', 
      features: [ 
        'Clientes ilimitados', 
        'Sessões ilimitadas', 
        'Histórico completo', 
        'Relatórios PDF avançados', 
        'Integração WhatsApp', 
        'Personalização total', 
        'Configurações avançadas', 
        'Suporte VIP 24/7' 
      ], 
      recommended: false, 
      stripePrice: billingCycle === 'monthly' ? STRIPE_PRICES.premium_monthly : STRIPE_PRICES.premium_annual, 
      current: currentPlan === 'premium',
      annualDiscount: billingCycle === 'annual' ? '17%' : null
    }
  ]

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user || !plan.stripePrice) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { 
        body: { 
          priceId: plan.stripePrice, 
          returnUrl: window.location.origin 
        } 
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error)
      alert(`Erro ao processar plano\n\n${error.message || 'Verifique os IDs de preço no Stripe Dashboard'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold mb-4">Bem-vindo ao TherapyPro! 🎉</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Escolha o plano ideal para começar sua jornada</p>
          
          {/* Seletor de Ciclo de Cobrança */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Mensal
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 rounded-full p-0"
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-primary transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : ''}`} />
            </Button>
            <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Anual
              <Badge variant="secondary" className="ml-2">Economize até 17%</Badge>
            </span>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col relative transition-all duration-300 hover:shadow-lg ${plan.id === currentPlan ? 'border-2' : plan.recommended ? 'border-primary shadow-lg' : ''} ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`} 
                  style={plan.id === currentPlan ? { borderColor: 'hsl(142 71% 45%)' } : {}}>
              {plan.id === currentPlan && (<Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-white" style={{ backgroundColor: 'hsl(142 71% 45%)' }}>Plano Atual</Badge>)}
              {plan.recommended && plan.id !== currentPlan && (<Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary"><Star className="h-3 w-3 mr-1" />Mais Popular</Badge>)}
              {plan.annualDiscount && (<Badge variant="secondary" className="absolute -top-3 right-3">Economize {plan.annualDiscount}</Badge>)}
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center"><div className="p-3 rounded-full bg-primary/10 text-primary">{plan.icon}</div></div>
                <div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </div>
                <div>
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="flex-shrink-0"><Check className="h-4 w-4" style={{ color: 'hsl(142 71% 45%)' }} /></div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" onClick={() => plan.stripePrice ? handleSubscribe(plan) : navigate('/dashboard')} disabled={loading || plan.id === currentPlan}>
                  {plan.id === currentPlan ? 'Seu plano atual' : loading ? 'Processando...' : `Assinar ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">Você pode alterar ou cancelar seu plano a qualquer momento</p>
        </div>
      </div>
    </div>
  )
}