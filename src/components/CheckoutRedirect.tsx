import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingState } from '@/components/LoadingState'
import { toast } from 'sonner'

/**
 * Componente que verifica se há um plano pendente no sessionStorage
 * e abre automaticamente o checkout correto após o primeiro login
 * 
 * Roteamento inteligente:
 * - Usuários indicados → Asaas (com desconto INDICACAO20)
 * - Usuários normais → Stripe
 */
export const CheckoutRedirect = () => {
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const processCheckout = async () => {
      try {
        // ✅ Verificar se o usuário voltou do Stripe (pode estar na URL com payment=success)
        const urlParams = new URLSearchParams(window.location.search)
        const paymentStatus = urlParams.get('payment')
        
        if (paymentStatus === 'success') {
          console.log('[CheckoutRedirect] ✅ Retorno de pagamento bem-sucedido, redirecionando para dashboard')
          // Limpar flags de checkout
          localStorage.removeItem('stripe_checkout_active')
          sessionStorage.removeItem('stripe_checkout_active')
          // Redirecionar para dashboard que vai processar o pagamento
          navigate('/dashboard?payment=success', { replace: true })
          return
        }
        
        if (paymentStatus === 'cancelled') {
          console.log('[CheckoutRedirect] ❌ Checkout cancelado pelo usuário')
          // Limpar flags
          localStorage.removeItem('stripe_checkout_active')
          sessionStorage.removeItem('stripe_checkout_active')
          localStorage.removeItem('pending_plan')
          localStorage.removeItem('pending_billing')
          sessionStorage.removeItem('pending_plan_backup')
          sessionStorage.removeItem('pending_billing_backup')
          // Redirecionar para dashboard
          navigate('/dashboard?payment=cancelled', { replace: true })
          return
        }
        
        // ✅ Verificar se há plano pendente (localStorage ou backup no sessionStorage)
        // Verificar múltiplas fontes para garantir que o plano não seja perdido
        const pendingPlan = localStorage.getItem('pending_plan') || 
                            sessionStorage.getItem('pending_plan_backup') ||
                            sessionStorage.getItem('pending_checkout_plan');
        const pendingBilling = localStorage.getItem('pending_billing') || 
                               sessionStorage.getItem('pending_billing_backup') || 
                               'monthly';
        
        console.log('[CheckoutRedirect] 🔍 Verificando plano pendente:', { 
          pendingPlan, 
          pendingBilling,
          localStorage: localStorage.getItem('pending_plan'),
          sessionStorage: sessionStorage.getItem('pending_plan_backup')
        });
        
        if (!pendingPlan || pendingPlan === 'basico') {
          console.log('[CheckoutRedirect] ⚠️ Sem plano pendente ou plano gratuito, redirecionando para dashboard')
          
          // Limpar backups
          sessionStorage.removeItem('pending_plan_backup');
          sessionStorage.removeItem('pending_billing_backup');
          sessionStorage.removeItem('pending_checkout_plan');
          
          setIsProcessing(false)
          navigate('/dashboard', { replace: true })
          return
        }

        // ✅ Garantir que o plano está no localStorage (pode ter sido perdido)
        if (!localStorage.getItem('pending_plan')) {
          console.log('[CheckoutRedirect] 💾 Restaurando plano pendente no localStorage')
          localStorage.setItem('pending_plan', pendingPlan)
          localStorage.setItem('pending_billing', pendingBilling)
        }

        console.log('[CheckoutRedirect] ✅ Plano pendente confirmado:', { pendingPlan, pendingBilling })

        // Buscar usuário autenticado
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error('[CheckoutRedirect] Usuário não autenticado')
          setIsProcessing(false)
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
          setIsProcessing(false)
          navigate('/dashboard', { replace: true })
          return
        }

        // Usar o ciclo de cobrança selecionado
        const priceId = prices[pendingBilling as 'monthly' | 'yearly' | 'annually']

        console.log('[CheckoutRedirect] Criando checkout Stripe...')

        // ✅ SEMPRE usar Stripe para checkout de assinatura
        // Usuários indicados recebem desconto via cupom Stripe
        // Comissões são calculadas no webhook Stripe e pagas via Asaas (payout)
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            priceId,
            returnUrl: window.location.origin
          }
        })

        if (error) {
          console.error('[CheckoutRedirect] Erro ao criar checkout Stripe:', error)
          throw error
        }

        const checkoutUrl = data?.url

        if (!checkoutUrl) {
          throw new Error('URL de checkout não gerada')
        }

        console.log('[CheckoutRedirect] ✅ Redirecionando para checkout Stripe')
        
        // ✅ CRÍTICO: Usar localStorage para dados que precisam sobreviver logout/sessão expirada
        // Salvar plano selecionado para mostrar modal de boas-vindas após pagamento
        localStorage.setItem('pending_checkout_plan', pendingPlan)
        
        // ✅ Salvar plano ANTERIOR para calcular features desbloqueadas
        // Buscar plano atual do perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .single()
        
        const currentPlan = profile?.subscription_plan || 'basico'
        localStorage.setItem('pending_previous_plan', currentPlan)
        console.log('[CheckoutRedirect] 📝 Saved to localStorage - pending_checkout_plan:', pendingPlan, ', pending_previous_plan:', currentPlan)
        
        // ✅ Limpar localStorage E sessionStorage antes de redirecionar
        localStorage.removeItem('pending_plan')
        localStorage.removeItem('pending_billing')
        localStorage.removeItem('referral_code')
        sessionStorage.removeItem('pending_plan_backup')
        sessionStorage.removeItem('pending_billing_backup')
        sessionStorage.removeItem('pending_referral')
        
        // ✅ Marcar que está indo para checkout externo (Stripe) - em AMBOS os storages
        localStorage.setItem('stripe_checkout_active', 'true')
        sessionStorage.setItem('stripe_checkout_active', 'true')
        
        // ✅ IMPORTANTE: Salvar o plano para o modal de boas-vindas ANTES de redirecionar
        // O webhook do Stripe vai processar o pagamento e atualizar o plano
        // Mas precisamos do plano para mostrar o modal de boas-vindas
        localStorage.setItem('pending_checkout_plan', pendingPlan)
        sessionStorage.setItem('pending_checkout_plan', pendingPlan)
        
        console.log('[CheckoutRedirect] 🚀 Redirecionando para Stripe checkout...')
        
        // Redirecionar para checkout
        window.location.href = checkoutUrl
      } catch (error: any) {
        console.error('[CheckoutRedirect] Erro ao processar checkout:', error)
        toast.error('Erro ao processar pagamento. Tente novamente.')
        
        // ✅ Limpar ambos os storages em caso de erro
        localStorage.removeItem('pending_plan')
        localStorage.removeItem('pending_billing')
        sessionStorage.removeItem('pending_plan_backup')
        sessionStorage.removeItem('pending_billing_backup')
        localStorage.removeItem('stripe_checkout_active')
        sessionStorage.removeItem('stripe_checkout_active')
        
        setIsProcessing(false)
        navigate('/dashboard', { replace: true })
      } finally {
        // ✅ Garantir que o loading sempre termina
        setIsProcessing(false)
      }
    }

    processCheckout()
  }, [navigate])

  // ✅ Se ainda estiver processando, mostrar loading
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoadingState text="Preparando checkout..." />
      </div>
    )
  }

  // ✅ Se não estiver processando, não renderizar nada (já redirecionou)
  return null
}
