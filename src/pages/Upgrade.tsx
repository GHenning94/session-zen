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

  const plans = [
    // ... (mesma lista de planos do seu arquivo original)
    { id: 'basico', name: 'Básico', price: 'Gratuito', period: '', icon: <Star className="h-6 w-6" />, description: 'Ideal para começar', features: [ 'Até 3 clientes', 'Até 4 sessões por cliente', 'Agendamento básico', 'Suporte limitado' ], recommended: false, stripePrice: null, current: currentPlan === 'basico' },
    { id: 'pro', name: 'Profissional', price: 'R$ 29,90', period: '/mês', icon: <Zap className="h-6 w-6" />, description: 'Perfeito para profissionais autônomos', features: [ 'Até 20 clientes', 'Sessões ilimitadas', 'Histórico completo', 'Agendamento online', 'Integração Google Agenda', 'Suporte por email' ], recommended: true, stripePrice: 'price_1RowvqFeTymAqTGEU6jkKtXi', current: currentPlan === 'pro' },
    { id: 'premium', name: 'Premium', price: 'R$ 59,90', period: '/mês', icon: <Crown className="h-6 w-6" />, description: 'Para clínicas e consultórios', features: [ 'Clientes ilimitados', 'Sessões ilimitadas', 'Histórico completo', 'Relatórios em PDF e Excel', 'Integração Google Agenda', 'Integração WhatsApp', 'Backup automático', 'Suporte prioritário' ], recommended: false, stripePrice: 'price_1RoxpDFeTymAqTGEWg0sS49i', current: currentPlan === 'premium' }
  ]

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user || !plan.stripePrice) return
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { priceId: plan.stripePrice } })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      alert('Erro ao processar pagamento. Tente novamente.')
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
          <h1 className="text-4xl font-bold mb-4">Escolha seu plano</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Desbloqueie todo o potencial da sua prática profissional com nossos planos premium</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col relative transition-all duration-300 hover:shadow-lg ${plan.id === currentPlan ? 'border-2' : plan.recommended ? 'border-primary shadow-lg' : ''} ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`} 
                  style={plan.id === currentPlan ? { borderColor: 'hsl(142 71% 45%)' } : {}}>
              {plan.id === currentPlan && (<Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-white" style={{ backgroundColor: 'hsl(142 71% 45%)' }}>Plano Atual</Badge>)}
              {plan.recommended && plan.id !== currentPlan && (<Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2"><Star className="h-3 w-3 mr-1" />Mais Popular</Badge>)}
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
        <div className="text-center mt-12"><p className="text-sm text-muted-foreground">Todos os planos incluem 7 dias de teste grátis. Cancele a qualquer momento.</p></div>
      </div>
    </div>
  )
}