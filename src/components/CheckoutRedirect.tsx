import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingState } from '@/components/LoadingState'
import { toast } from 'sonner'

/**
 * Componente que verifica se há um plano pendente no sessionStorage
 * e abre automaticamente o Stripe Checkout após o primeiro login
 */
export const CheckoutRedirect = () => {
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const processCheckout = async () => {
      try {
        // Verificar se há plano pendente
        const pendingPlan = sessionStorage.getItem('pending_plan')
        
        if (!pendingPlan || pendingPlan === 'basico') {
          console.log('[CheckoutRedirect] Sem plano pendente ou plano gratuito, redirecionando para dashboard')
          navigate('/dashboard', { replace: true })
          return
        }

        console.log('[CheckoutRedirect] Plano pendente detectado:', pendingPlan)

        // Buscar usuário autenticado
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error('[CheckoutRedirect] Usuário não autenticado')
          navigate('/login', { replace: true })
          return
        }

        // Mapear plano para price IDs
        const priceMap: Record<string, { monthly: string; yearly: string }> = {
          'pro': {
            monthly: 'price_1SSMNgCP57sNVd3laEmlQOcb',
            yearly: 'price_1SSMOdCP57sNVd3la4kMOinN'
          },
          'premium': {
            monthly: 'price_1SSMOBCP57sNVd3lqjfLY6Du',
            yearly: 'price_1SSMP7CP57sNVd3lSf4oYINX'
          }
        }

        const prices = priceMap[pendingPlan]
        
        if (!prices) {
          console.error('[CheckoutRedirect] Plano inválido:', pendingPlan)
          toast.error('Plano selecionado inválido')
          sessionStorage.removeItem('pending_plan')
          navigate('/dashboard', { replace: true })
          return
        }

        // Por padrão, usar plano mensal
        const priceId = prices.monthly

        console.log('[CheckoutRedirect] Criando checkout para:', { plan: pendingPlan, priceId })

        // Criar sessão de checkout
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            priceId,
            returnUrl: window.location.origin
          }
        })

        if (error) {
          console.error('[CheckoutRedirect] Erro ao criar checkout:', error)
          throw error
        }

        if (!data?.url) {
          throw new Error('URL de checkout não gerada')
        }

        console.log('[CheckoutRedirect] ✅ Redirecionando para checkout Stripe')
        
        // Limpar sessionStorage antes de redirecionar
        sessionStorage.removeItem('pending_plan')
        
        // Redirecionar para Stripe
        window.location.href = data.url
      } catch (error: any) {
        console.error('[CheckoutRedirect] Erro ao processar checkout:', error)
        toast.error('Erro ao processar pagamento. Tente novamente.')
        sessionStorage.removeItem('pending_plan')
        navigate('/dashboard', { replace: true })
      }
    }

    processCheckout()
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <LoadingState text="Preparando checkout..." />
    </div>
  )
}
