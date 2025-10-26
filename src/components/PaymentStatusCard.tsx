import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react'
import { formatCurrencyBR } from '@/utils/formatters'
import { useNavigate } from 'react-router-dom'

interface PaymentStats {
  totalPaid: number
  totalPending: number
  paidCount: number
  pendingCount: number
}

interface PaymentStatusCardProps {
  stats: PaymentStats
}

export const PaymentStatusCard = ({ stats }: PaymentStatusCardProps) => {
  const navigate = useNavigate()
  const totalRevenue = stats.totalPaid + stats.totalPending
  const paidPercentage = totalRevenue > 0 
    ? Math.round((stats.totalPaid / totalRevenue) * 100) 
    : 0

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-success"
      onClick={() => navigate('/pagamentos')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Status de Pagamentos</CardTitle>
        <DollarSign className="h-4 w-4 text-success" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-success">
              {formatCurrencyBR(stats.totalPaid)}
            </span>
            <Badge variant="success" className="text-xs flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {paidPercentage}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Recebido ({stats.paidCount} pagos)</p>
        </div>

        <div className="pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-warning" />
              <p className="text-xs text-muted-foreground">Pendente</p>
            </div>
            <p className="text-sm font-semibold text-warning">
              {formatCurrencyBR(stats.totalPending)}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.pendingCount} {stats.pendingCount === 1 ? 'pagamento' : 'pagamentos'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
