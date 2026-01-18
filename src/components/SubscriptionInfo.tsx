import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, CreditCard, AlertCircle, Crown, Zap, Sparkles } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface SubscriptionData {
  plan: string
  billingInterval: string | null
  startDate: string | null
  endDate: string | null
  cancelAt: string | null
  stripeCustomerId: string | null
}

export const SubscriptionInfo = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubscription()
  }, [user])

  const loadSubscription = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_plan, billing_interval, subscription_end_date, subscription_cancel_at, stripe_customer_id, created_at')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      setSubscription({
        plan: data.subscription_plan || 'basico',
        billingInterval: data.billing_interval,
        startDate: data.created_at,
        endDate: data.subscription_end_date,
        cancelAt: data.subscription_cancel_at,
        stripeCustomerId: data.stripe_customer_id
      })
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando informações...</p>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) return null

  const isCancelled = !!subscription.cancelAt
  const isFreePlan = subscription.plan === 'basico'

  const getPlanIcon = () => {
    switch (subscription.plan) {
      case 'premium':
        return <Crown className="w-5 h-5" />
      case 'pro':
        return <Zap className="w-5 h-5" />
      default:
        return <Sparkles className="w-5 h-5" />
    }
  }

  const getPlanName = () => {
    switch (subscription.plan) {
      case 'premium':
        return 'Premium'
      case 'pro':
        return 'Profissional'
      default:
        return 'Básico (Gratuito)'
    }
  }

  const getPlanColor = () => {
    switch (subscription.plan) {
      case 'premium':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      case 'pro':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500'
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${getPlanColor()} text-white`}>
              {getPlanIcon()}
            </div>
            <div>
              <CardTitle className="text-xl">Plano {getPlanName()}</CardTitle>
              <CardDescription>
                {isFreePlan 
                  ? 'Funcionalidades básicas' 
                  : subscription.billingInterval === 'yearly' 
                    ? 'Cobrança anual' 
                    : 'Cobrança mensal'}
              </CardDescription>
            </div>
          </div>
          {!isFreePlan && (
            <Badge variant={isCancelled ? 'destructive' : 'default'}>
              {isCancelled ? 'Cancelado' : 'Ativo'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isFreePlan && (
          <>
            {subscription.startDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Início da assinatura</p>
                  <p className="text-muted-foreground">
                    {new Date(subscription.startDate).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {isCancelled ? (
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <div>
                  <p className="font-medium">Acesso até</p>
                  <p className="text-muted-foreground">
                    {new Date(subscription.cancelAt!).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Após esta data, você será movido para o plano gratuito
                  </p>
                </div>
              </div>
            ) : subscription.endDate ? (
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Próxima cobrança</p>
                  <p className="text-muted-foreground">
                    {new Date(subscription.endDate).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="pt-4 flex gap-2">
          {isFreePlan ? (
            <Button 
              onClick={() => navigate('/upgrade')} 
              className="w-full max-w-[200px]"
            >
              Fazer Upgrade
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/upgrade')} 
              variant="outline"
              className="w-full"
            >
              Alterar Plano
            </Button>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Recursos do plano</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {subscription.plan === 'basico' && (
              <>
                <li>• Até 3 clientes</li>
                <li>• Até 4 sessões por cliente</li>
                <li>• Agenda básica</li>
              </>
            )}
            {subscription.plan === 'pro' && (
              <>
                <li>• Até 20 clientes</li>
                <li>• Sessões ilimitadas</li>
                <li>• Relatórios básicos</li>
              </>
            )}
            {subscription.plan === 'premium' && (
              <>
                <li>• Clientes ilimitados</li>
                <li>• Sessões ilimitadas</li>
                <li>• Todos os recursos avançados</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}