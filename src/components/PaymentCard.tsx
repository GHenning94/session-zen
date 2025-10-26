import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Payment } from '@/hooks/usePayments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentCardProps {
  payment: Payment;
  clientName?: string;
  onEdit: (payment: Payment) => void;
  onMarkPaid: (paymentId: string) => void;
  onGenerateReceipt?: (payment: Payment) => void;
}

const statusConfig = {
  pendente: { 
    label: 'Pendente', 
    variant: 'outline' as const, 
    icon: Clock,
    color: 'text-yellow-600'
  },
  pago: { 
    label: 'Pago', 
    variant: 'default' as const, 
    icon: CheckCircle,
    color: 'text-green-600'
  },
  atrasado: { 
    label: 'Atrasado', 
    variant: 'destructive' as const, 
    icon: AlertCircle,
    color: 'text-red-600'
  },
  cancelado: { 
    label: 'Cancelado', 
    variant: 'secondary' as const, 
    icon: XCircle,
    color: 'text-gray-600'
  },
  reembolsado: { 
    label: 'Reembolsado', 
    variant: 'secondary' as const, 
    icon: XCircle,
    color: 'text-blue-600'
  },
};

export const PaymentCard = ({ 
  payment, 
  clientName,
  onEdit, 
  onMarkPaid,
  onGenerateReceipt 
}: PaymentCardProps) => {
  const config = statusConfig[payment.status];
  const StatusIcon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                R$ {payment.valor.toFixed(2)}
              </span>
            </div>
            {clientName && (
              <p className="text-sm text-muted-foreground">{clientName}</p>
            )}
          </div>
          <Badge variant={config.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Método:</span>
          <span className="font-medium">{payment.metodo_pagamento || 'A definir'}</span>
        </div>

        {payment.data_vencimento && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Vencimento:</span>
            <span className="font-medium">
              {format(new Date(payment.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
        )}

        {payment.data_pagamento && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">Pago em:</span>
            <span className="font-medium">
              {format(new Date(payment.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
        )}

        {payment.observacoes && (
          <div className="text-sm">
            <p className="text-muted-foreground">Observações:</p>
            <p className="text-sm">{payment.observacoes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {payment.status === 'pendente' && (
            <Button
              size="sm"
              onClick={() => onMarkPaid(payment.id)}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Marcar como Pago
            </Button>
          )}
          
          {payment.status === 'pago' && onGenerateReceipt && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGenerateReceipt(payment)}
              className="flex-1"
            >
              Emitir Recibo
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(payment)}
          >
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
