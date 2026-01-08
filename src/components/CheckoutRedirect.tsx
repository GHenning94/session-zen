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
        // ✅ Verificar se há plano pendente (localStorage ou backup no sessionStorage)
        const pendingPlan = localStorage.getItem('pending_plan') || 
                            sessionStorage.getItem('pending_plan_backup');
        const pendingBilling = localStorage.getItem('pending_billing') || 
                               sessionStorage.getItem('pending_billing_backup') || 
                               'monthly';
        
        if (!pendingPlan || pendingPlan === 'basico') {
          console.log('[CheckoutRedirect] Sem plano pendente ou plano gratuito, redirecionando para dashboard')
          
          // Limpar backups
          sessionStorage.removeItem('pending_plan_backup');
          sessionStorage.removeItem('pending_billing_backup');
          
          navigate('/dashboard', { replace: true })
          return
        }

        console.log('[CheckoutRedirect] Plano pendente detectado:', { pendingPlan, pendingBilling })

        // Buscar usuário autenticado
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error('[CheckoutRedirect] Usuário não autenticado')
          navigate('/login', { replace: true })
          return
        }

        // Mapear plano para price IDs
        const priceMap: Record<string, { monthly: string; yearly: string; annually: string }> = {
          'pro': {
            monthly: 'price_1SSMNgCP57sNVd3laEmlQOcb',
            yearly: 'price_1SSMOdCP57sNVd3la4kMOinN',
            annually: 'price_1SSMOdCP57sNVd3la4kMOinN'
          },
          'premium': {
            monthly: 'price_1SSMOBCP57sNVd3lqjfLY6Du',
            yearly: 'price_1SSMP7CP57sNVd3lSf4oYINX',
            annually: 'price_1SSMP7CP57sNVd3lSf4oYINX'
          }
        }

        const prices = priceMap[pendingPlan]
        
        if (!prices) {
          console.error('[CheckoutRedirect] Plano inválido:', pendingPlan)
          toast.error('Plano selecionado inválido')
          localStorage.removeItem('pending_plan')
          localStorage.removeItem('pending_billing')
          navigate('/dashboard', { replace: true })
          return
        }

        // Usar o ciclo de cobrança selecionado
        const priceId = prices[pendingBilling as 'monthly' | 'yearly' | 'annually']

        console.log('[CheckoutRedirect] Criando checkout para:', { plan: pendingPlan, billing: pendingBilling, priceId })

        // Criar sessão de checkout
        const referralCode = localStorage.getItem('referral_code') || sessionStorage.getItem('pending_referral')
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            priceId,
            returnUrl: window.location.origin,
            referralCode: referralCode || undefined
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
        
        // ✅ Limpar localStorage E sessionStorage antes de redirecionar
        localStorage.removeItem('pending_plan')
        localStorage.removeItem('pending_billing')
        localStorage.removeItem('referral_code')
        sessionStorage.removeItem('pending_plan_backup')
        sessionStorage.removeItem('pending_billing_backup')
        sessionStorage.removeItem('pending_referral')
        
        // Redirecionar para Stripe
        window.location.href = data.url
      } catch (error: any) {
        console.error('[CheckoutRedirect] Erro ao processar checkout:', error)
        toast.error('Erro ao processar pagamento. Tente novamente.')
        
        // ✅ Limpar ambos os storages em caso de erro
        localStorage.removeItem('pending_plan')
        localStorage.removeItem('pending_billing')
        sessionStorage.removeItem('pending_plan_backup')
        sessionStorage.removeItem('pending_billing_backup')
        
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
