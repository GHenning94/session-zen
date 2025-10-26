import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Download, FileText, Receipt, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Invoice {
  id: string
  number: string | null
  amount_paid: number
  currency: string
  status: string
  created: number
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

interface SubscriptionInfo {
  id: string
  status: string
  current_period_end: number
  current_period_start: number
  cancel_at_period_end: boolean
}

export const SubscriptionInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('basico')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('get-subscription-invoices')

      if (error) throw error

      if (data) {
        setInvoices(data.invoices || [])
        setSubscription(data.subscription)
        setCurrentPlan(data.currentPlan || 'basico')
      }
    } catch (error: any) {
      console.error('Error loading invoices:', error)
      toast({
        title: 'Erro ao carregar faturas',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const getPlanDisplayName = (plan: string) => {
    const plans: Record<string, string> = {
      basico: 'Básico',
      pro: 'Pro',
      premium: 'Premium',
    }
    return plans[plan] || plan
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
        {subscription && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold">Plano Atual: {getPlanDisplayName(currentPlan)}</h4>
                <p className="text-sm text-muted-foreground">
                  Status: <span className="font-medium text-foreground capitalize">{subscription.status}</span>
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Período atual: {format(new Date(subscription.current_period_start * 1000), "dd/MM/yyyy", { locale: ptBR })} -{' '}
                {format(new Date(subscription.current_period_end * 1000), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="font-medium text-foreground">
                Próxima renovação: {format(new Date(subscription.current_period_end * 1000), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              {subscription.cancel_at_period_end && (
                <p className="text-warning font-medium">
                  ⚠️ Sua assinatura será cancelada no final do período
                </p>
              )}
            </div>
          </div>
        )}

        {/* Invoices List */}
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
            <h4 className="font-semibold text-sm">Faturas Recentes</h4>
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {invoice.number || `Fatura #${invoice.id.slice(-8)}`}
                    </span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="text-sm text-muted-foreground ml-7">
                    <p>Data: {format(new Date(invoice.created * 1000), "dd/MM/yyyy", { locale: ptBR })}</p>
                    <p className="font-semibold text-foreground mt-1">
                      Valor: {formatCurrency(invoice.amount_paid, invoice.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {invoice.hosted_invoice_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                      className="gap-2"
                    >
                      <Receipt className="h-4 w-4" />
                      Ver Recibo
                    </Button>
                  )}
                  {invoice.invoice_pdf && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}