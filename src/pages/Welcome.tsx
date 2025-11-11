import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, Zap, Crown, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface PlanConfig {
  id: string
  name: string
  price: string
  priceYearly: string
  description: string
  icon: any
  features: string[]
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  color: string
  popular?: boolean
}

const Welcome = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isYearly, setIsYearly] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .single()

        if (profile?.subscription_plan && profile.subscription_plan !== '') {
          console.log('[Welcome] Usuário já tem plano:', profile.subscription_plan)
          navigate('/dashboard', { replace: true })
        }
      } catch (error) {
        console.error('[Welcome] Erro ao verificar assinatura:', error)
      }
    }

    checkSubscription()
  }, [user, navigate])

  const plans: PlanConfig[] = [
    {
      id: 'basico',
      name: 'Básico',
      price: 'Grátis',
      priceYearly: 'Grátis',
      description: 'Para começar sua jornada',
      icon: Sparkles,
      features: [
        'Até 3 clientes',
        'Até 4 sessões por cliente',
        'Agenda básica',
        'Suporte por email'
      ],
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      color: 'from-gray-400 to-gray-500'
    },
    {
      id: 'pro',
      name: 'Profissional',
      price: 'R$ 29,90/mês',
      priceYearly: 'R$ 24,90/mês',
      description: 'Para profissionais em crescimento',
      icon: Zap,
      features: [
        'Até 20 clientes',
        'Sessões ilimitadas',
        'Histórico completo',
        'Personalização de design',
        'Relatórios básicos',
        'Suporte prioritário'
      ],
      stripePriceIdMonthly: 'price_1QUasuP5i7w8ztG4rKiF7ZQL',
      stripePriceIdYearly: 'price_1QUat9P5i7w8ztG43Hk1K2s0',
      color: 'from-blue-500 to-indigo-500',
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$ 49,90/mês',
      priceYearly: 'R$ 39,90/mês',
      description: 'Recursos completos e avançados',
      icon: Crown,
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
      stripePriceIdMonthly: 'price_1QUatQP5i7w8ztG47aGnT9Ny',
      stripePriceIdYearly: 'price_1QUatfP5i7w8ztG4IrNuBT21',
      color: 'from-yellow-500 to-orange-500'
    }
  ]

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (!user) {
      toast.error('Você precisa estar logado para selecionar um plano')
      navigate('/login')
      return
    }

    setIsLoading(plan.id)

    try {
      // Plano gratuito - apenas atualiza o perfil
      if (plan.id === 'basico') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: 'basico',
            billing_interval: null,
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: null,
            subscription_cancel_at: null
          })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('[Welcome] Erro ao atualizar plano gratuito:', updateError)
          throw updateError
        }

        toast.success('Plano Básico ativado com sucesso!')
        navigate('/dashboard')
        return
      }

      // Planos pagos - criar checkout do Stripe
      const priceId = isYearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly

      if (!priceId) {
        throw new Error('ID de preço não configurado para este plano')
      }

      console.log('[Welcome] Criando checkout com priceId:', priceId)

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/welcome?checkout=canceled`
        }
      })

      if (error) {
        console.error('[Welcome] Erro na edge function create-checkout:', error)
        throw new Error(error.message || 'Erro ao criar sessão de checkout')
      }

      if (!data?.url) {
        console.error('[Welcome] Resposta da edge function sem URL:', data)
        throw new Error('Não foi possível criar a sessão de checkout')
      }

      console.log('[Welcome] Redirecionando para checkout:', data.url)
      window.location.href = data.url

    } catch (error: any) {
      console.error('[Welcome] Erro ao selecionar plano:', error)
      toast.error(error.message || 'Erro ao processar pagamento. Tente novamente.')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Bem-vindo ao TherapyPro!</h1>
          <p className="text-xl text-muted-foreground">
            Escolha o plano ideal para começar sua jornada
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          <Label htmlFor="billing-toggle" className={!isYearly ? 'font-semibold' : ''}>
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={isYearly ? 'font-semibold' : ''}>
            Anual
            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded-full">
              Economize até 17%
            </span>
          </Label>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentlyLoading = isLoading === plan.id

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center text-white`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <p className="text-3xl font-bold">
                      {isYearly ? plan.priceYearly : plan.price}
                    </p>
                    {plan.id !== 'basico' && isYearly && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Cobrado anualmente
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentlyLoading || !!isLoading}
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {isCurrentlyLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Escolher Plano'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Todos os planos incluem 7 dias de garantia. Cancele quando quiser.</p>
        </div>
      </div>
    </div>
  )
}

export default Welcome