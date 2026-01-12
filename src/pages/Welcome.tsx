import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Star } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const Welcome = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

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

  const handleSelectFreePlan = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para selecionar um plano')
      navigate('/login')
      return
    }

    setIsLoading(true)

    try {
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
    } catch (error: any) {
      console.error('[Welcome] Erro ao selecionar plano gratuito:', error)
      toast.error(error.message || 'Erro ao ativar plano gratuito. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Bem-vindo ao TherapyPro!</h1>
          <p className="text-xl text-muted-foreground">
            Escolha como deseja começar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plano Gratuito */}
          <Card className="border-border">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white">
                <Sparkles className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl">Plano Básico</CardTitle>
              <CardDescription>Para começar sua jornada</CardDescription>
              <div className="mt-4">
                <p className="text-3xl font-bold">Grátis</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• Até 3 clientes</li>
                <li>• Até 4 sessões por cliente</li>
                <li>• Agenda básica</li>
                <li>• Suporte por email</li>
                <li>• Sem cartão de crédito</li>
              </ul>

              <Button
                onClick={handleSelectFreePlan}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Começar Gratuitamente'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Planos Premium - Redireciona para Stripe */}
          <Card className="border-primary shadow-lg relative">
            <CardHeader className="text-center pb-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Mais Popular
                </span>
              </div>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                <Sparkles className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl">Planos Premium</CardTitle>
              <CardDescription>Recursos completos e avançados</CardDescription>
              <div className="mt-4">
                <p className="text-3xl font-bold">A partir de R$ 24,90/mês</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Planos Profissional e Premium disponíveis
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• Clientes ilimitados</li>
                <li>• Sessões ilimitadas</li>
                <li>• Relatórios avançados</li>
                <li>• Integrações completas</li>
                <li>• Suporte prioritário</li>
              </ul>

              <Button
                onClick={() => navigate('/upgrade')}
                className="w-full"
              >
                Ver Planos Premium
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Todos os planos pagos incluem garantia de reembolso. Cancele quando quiser.</p>
        </div>
      </div>
    </div>
  )
}

export default Welcome
