import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  Receipt,
  CheckCircle,
  User
} from "lucide-react"
import { formatCurrencyBR, formatTimeBR, formatDateBR } from "@/utils/formatters"

interface PaymentDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: any
  onGenerateReceipt: (payment: any) => void
  onViewSession: (sessionId: string) => void
  onMarkAsPaid?: (sessionId: string) => void
}

export const PaymentDetailsModal = ({
  open,
  onOpenChange,
  payment,
  onGenerateReceipt,
  onViewSession,
  onMarkAsPaid
}: PaymentDetailsModalProps) => {
  if (!payment) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'success'
      case 'pendente': return 'warning'
      case 'atrasado': return 'purple'
      case 'cancelado': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago': return 'Pago'
      case 'pendente': return 'Pendente'
      case 'atrasado': return 'Atrasado'
      case 'cancelado': return 'Cancelado'
      default: return status
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'dinheiro': return <Banknote className="w-5 h-5" />
      case 'pix': return <Smartphone className="w-5 h-5" />
      case 'cartao': return <CreditCard className="w-5 h-5" />
      case 'transferencia': return <Building2 className="w-5 h-5" />
      default: return <CreditCard className="w-5 h-5" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {payment.client_avatar ? (
              <Avatar className="w-16 h-16">
                <AvatarImage src={payment.client_avatar} alt={payment.client} />
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-card flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-2xl">{payment.client}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusColor(payment.status)}>
                  {getStatusLabel(payment.status)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Informações do Pagamento */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Detalhes do Pagamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Data</label>
                  <p className="font-medium">{formatDateBR(payment.date)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Horário</label>
                  <p className="font-medium">{formatTimeBR(payment.time)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Valor</label>
                  <p className="font-medium text-lg">{formatCurrencyBR(payment.value)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Método de Pagamento</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getPaymentMethodIcon(payment.method)}
                    <p className="font-medium capitalize">{payment.method}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-4 border-t mt-6">
          {payment.status === 'pago' && (
            <Button
              variant="outline"
              onClick={() => {
                onGenerateReceipt(payment)
                onOpenChange(false)
              }}
              className="flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Gerar Recibo
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => {
              onViewSession(payment.session_id)
              onOpenChange(false)
            }}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Ver Sessão
          </Button>

          {(payment.status === 'pendente' || payment.status === 'atrasado') && onMarkAsPaid && (
            <Button
              variant="default"
              onClick={() => {
                onMarkAsPaid(payment.session_id)
                onOpenChange(false)
              }}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Marcar como Pago
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
