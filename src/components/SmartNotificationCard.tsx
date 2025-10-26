import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertCircle, 
  Package, 
  DollarSign, 
  Repeat,
  Clock,
  ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrencyBR } from '@/utils/formatters'

interface SmartNotification {
  id: string
  type: 'package_ending' | 'payment_overdue' | 'recurring_next' | 'client_inactive'
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  metadata?: any
}

interface SmartNotificationCardProps {
  notifications: SmartNotification[]
}

const getIcon = (type: SmartNotification['type']) => {
  switch (type) {
    case 'package_ending':
      return <Package className="h-4 w-4" />
    case 'payment_overdue':
      return <DollarSign className="h-4 w-4" />
    case 'recurring_next':
      return <Repeat className="h-4 w-4" />
    case 'client_inactive':
      return <Clock className="h-4 w-4" />
  }
}

const getVariant = (priority: SmartNotification['priority']) => {
  switch (priority) {
    case 'high':
      return 'destructive'
    case 'medium':
      return 'warning'
    case 'low':
      return 'outline'
  }
}

export const SmartNotificationCard = ({ notifications }: SmartNotificationCardProps) => {
  const navigate = useNavigate()

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação importante no momento
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className={`p-2 rounded-full ${
              notification.priority === 'high' ? 'bg-destructive/10 text-destructive' :
              notification.priority === 'medium' ? 'bg-warning/10 text-warning' :
              'bg-muted text-muted-foreground'
            }`}>
              {getIcon(notification.type)}
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{notification.title}</p>
                <Badge variant={getVariant(notification.priority)} className="text-xs">
                  {notification.priority === 'high' ? 'Urgente' : 
                   notification.priority === 'medium' ? 'Atenção' : 'Info'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{notification.message}</p>
              
              {notification.metadata?.amount && (
                <p className="text-xs font-semibold text-primary">
                  {formatCurrencyBR(notification.metadata.amount)}
                </p>
              )}
            </div>
            
            {notification.actionUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(notification.actionUrl!)}
                className="shrink-0"
              >
                {notification.actionLabel || 'Ver'}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
