import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Download, FileText, Receipt, Calendar, AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CancelSubscriptionFlow } from './CancelSubscriptionFlow'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Invoice {
  id: string
  number: string | null
  amount_paid: number
  amount_due?: number
  total?: number
  credit_amount?: number
  charge_amount?: number
  currency: string
  status: string
  created: number
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  subscription_id?: string
  billing_reason?: string
  description?: string | null
}

interface SubscriptionInfo {
  id: string
  status: string
  current_period_end: number
  current_period_start: number
  cancel_at_period_end: boolean
}

interface SubscriptionStatus {
  plan: string
  status: string
  billing_interval: string | null
  start_date: string | null
  next_billing_date: string | null
  cancel_at: string | null
  is_canceled: boolean
}

export const SubscriptionInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('basico')
  const [loading, setLoading] = useState(true)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      
      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase.functions.invoke('get-subscription-invoices')
      if (invoicesError) throw invoicesError

      if (invoicesData) {
        setInvoices(invoicesData.invoices || [])
        setSubscription(invoicesData.subscription)
        setCurrentPlan(invoicesData.currentPlan || 'basico')
      }

      // Load subscription status
      const { data: statusData, error: statusError } = await supabase.functions.invoke('get-subscription-status')
      if (statusError) throw statusError
      
      if (statusData) {
        setSubscriptionStatus(statusData)
      }
    } catch (error: any) {
      console.error('Error loading subscription data:', error)
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true)
      const { data, error } = await supabase.functions.invoke('cancel-subscription')

      if (error) throw error

      toast({
        title: 'Assinatura cancelada',
        description: data.message || 'Sua assinatura foi cancelada com sucesso.',
      })

      await loadInvoices()
      setShowCancelDialog(false)
    } catch (error: any) {
      console.error('Error canceling subscription:', error)
      toast({
        title: 'Erro ao cancelar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsCanceling(false)
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      setIsReactivating(true)
      const { data, error } = await supabase.functions.invoke('reactivate-subscription')

      if (error) throw error

      toast({
        title: 'Assinatura reativada!',
        description: data.message || 'Sua assinatura foi reativada com sucesso.',
      })

      await loadInvoices()
      setShowReactivateDialog(false)
    } catch (error: any) {
      console.error('Error reactivating subscription:', error)
      toast({
        title: 'Erro ao reativar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsReactivating(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  // Traduz descrições de faturas do Stripe para português claro
  const translateInvoiceDescription = (description: string | null | undefined, amountPaid: number): string | null => {
    if (!description) return null
    
    const desc = description.toLowerCase()
    
    // Proration - tempo não utilizado (crédito)
    if (desc.includes('unused time')) {
      if (amountPaid === 0) {
        return 'Crédito pelo tempo não utilizado do plano anterior (aplicado automaticamente na próxima fatura)'
      }
      const planMatch = description.match(/on (.+)/i)
      const planName = planMatch ? planMatch[1].replace(/\(at .+\)/i, '').trim() : 'plano anterior'
      return `Crédito pelo tempo não utilizado: ${planName}`
    }
    
    // Proration - tempo restante (cobrança proporcional)
    if (desc.includes('remaining time') || desc.includes('prorated')) {
      const planMatch = description.match(/on (.+)/i) || description.match(/for (.+)/i)
      const planName = planMatch ? planMatch[1].replace(/\(at .+\)/i, '').trim() : 'novo plano'
      return `Cobrança proporcional pelo upgrade: ${planName}`
    }
    
    // Assinatura regular
    if (desc.includes('subscription') || desc.includes('× therapypro')) {
      // Extract plan name and clean it up
      const planMatch = description.match(/(\d+)\s*×\s*(.+?)(?:\s*\(at|$)/i)
      if (planMatch) {
        const planName = planMatch[2].trim()
          .replace('TherapyPro ', '')
          .replace('Monthly', 'Mensal')
          .replace('Yearly', 'Anual')
          .replace('Annual', 'Anual')
        return `Assinatura: ${planName}`
      }
      return 'Pagamento de assinatura'
    }
    
    // Invoice item - formato "1 × Plan (at R$XX.XX / month)"
    const itemMatch = description.match(/(\d+)\s*×\s*(.+?)\s*\(at/i)
    if (itemMatch) {
      const planName = itemMatch[2].trim()
        .replace('TherapyPro ', '')
        .replace('Monthly', 'Mensal')
        .replace('Yearly', 'Anual')
        .replace('Annual', 'Anual')
        .replace('Profissional', 'Profissional')
        .replace('Professional', 'Profissional')
        .replace('Premium', 'Premium')
        .replace('Basic', 'Básico')
      return `Assinatura: ${planName}`
    }
    
    // Fallback - return original with minor cleanup
    return description
      .replace('TherapyPro ', '')
      .replace('Monthly', 'Mensal')
      .replace('Yearly', 'Anual')
      .replace('Subscription', 'Assinatura')
  }

  const getPlanDisplayName = (plan: string, interval?: string | null) => {
    const plans: Record<string, string> = {
      basico: 'Básico',
      pro: 'Profissional',
      premium: 'Premium',
    }
    const baseName = plans[plan] || plan
    
    if (interval && plan !== 'basico') {
      const intervalName = interval === 'monthly' ? 'Mensal' : 'Anual'
      return `${baseName} ${intervalName}`
    }
    
    return baseName
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      paid: { label: 'Pago', variant: 'default' },
      open: { label: 'Em aberto', variant: 'secondary' },
      void: { label: 'Cancelado', variant: 'destructive' },
      uncollectible: { label: 'Não cobrável', variant: 'destructive' },
    }
    
    const config = statusConfig[status] || { label: status, variant: 'secondary' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Histórico de Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando histórico...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Histórico de Assinatura
        </CardTitle>
        <CardDescription>
          Visualize suas faturas e gerencie sua assinatura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Subscription Info */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold">Plano Atual: {getPlanDisplayName(currentPlan, subscriptionStatus?.billing_interval)}</h4>
              {subscription && (
                <p className="text-sm text-muted-foreground">
                  Status: <span className="font-medium text-foreground capitalize">{subscription.status === 'active' ? 'Ativo' : subscription.status}</span>
                </p>
              )}
            </div>
            <Calendar className="h-8 w-8 text-primary" />
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            {subscriptionStatus?.start_date && (
              <p>
                <span className="font-medium text-foreground">Data de Contratação:</span>{' '}
                {format(new Date(subscriptionStatus.start_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}

            {subscription && subscriptionStatus?.next_billing_date && !subscriptionStatus.is_canceled && (
              <>
                <p>
                  Período atual: {format(new Date(subscription.current_period_start * 1000), "dd/MM/yyyy", { locale: ptBR })} -{' '}
                  {format(new Date(subscription.current_period_end * 1000), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="font-medium text-foreground">
                  Próxima renovação: {format(new Date(subscriptionStatus.next_billing_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </>
            )}

            {subscriptionStatus?.is_canceled && subscriptionStatus?.cancel_at && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800 mt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Assinatura Cancelada
                      </p>
                      <p className="text-amber-800 dark:text-amber-200 mt-1">
                        Seu plano ficará ativo até{' '}
                        <span className="font-semibold">
                          {format(new Date(subscriptionStatus.cancel_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>.
                        Após essa data, você retornará ao plano gratuito.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowReactivateDialog(true)}
                    className="flex-shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Desistir do cancelamento
                  </Button>
                </div>
              </div>
            )}

            {currentPlan !== 'basico' && !subscriptionStatus?.is_canceled && subscription && (
              <Button 
                variant="outline" 
                size="sm"
                className="w-full mt-3"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancelar Assinatura
              </Button>
            )}
          </div>
        </div>

        {/* Invoices List - Histórico Completo */}
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma fatura encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Suas faturas aparecerão aqui após o primeiro pagamento
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Histórico Completo de Pagamentos</h4>
              <Badge variant="outline" className="text-xs">
                {invoices.length} {invoices.length === 1 ? 'pagamento' : 'pagamentos'}
              </Badge>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base truncate">
                        {invoice.number || `Fatura #${invoice.id.slice(-8)}`}
                      </span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="text-sm text-muted-foreground ml-6 sm:ml-7">
                      <p>Data: {format(new Date(invoice.created * 1000), "dd/MM/yyyy", { locale: ptBR })}</p>
                      {invoice.description && (
                        <p className="text-xs text-muted-foreground">
                          {invoice.description}
                        </p>
                      )}
                      <p className="font-semibold text-foreground mt-1">
                        Valor: {formatCurrency(invoice.amount_paid, invoice.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-6 sm:ml-0 flex-wrap sm:flex-nowrap">
                    {invoice.hosted_invoice_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                        className="gap-1.5 text-xs sm:text-sm"
                      >
                        <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Ver</span> Recibo
                      </Button>
                    )}
                    {invoice.invoice_pdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                        className="gap-1.5 text-xs sm:text-sm"
                      >
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Download</span> PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CancelSubscriptionFlow
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirmCancel={handleCancelSubscription}
        planName={getPlanDisplayName(currentPlan, subscriptionStatus?.billing_interval)}
      />

      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desistir do cancelamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua assinatura será reativada e a cobrança continuará normalmente na data prevista. 
              Você manterá acesso a todos os recursos do seu plano atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateSubscription}
              disabled={isReactivating}
              className="bg-primary hover:bg-primary/90"
            >
              {isReactivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Reativando...
                </>
              ) : (
                'Sim, manter minha assinatura'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}