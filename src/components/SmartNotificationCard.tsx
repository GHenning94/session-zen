import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PulsingDot } from '@/components/ui/pulsing-dot'
import { 
  AlertCircle, 
  Package, 
  Clock,
  ArrowRight,
  X
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
  reminders?: string[]
}

const getIcon = (type: SmartNotification['type']) => {
  switch (type) {
    case 'package_ending':
      return <Package className="h-4 w-4" />
    case 'payment_overdue':
      return <PulsingDot color="destructive" size="md" />
    case 'recurring_next':
      return <PulsingDot color="warning" size="md" />
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

// Fixed notification item component (no swipe, no grip - for pulsing dot notifications)
const FixedNotificationItem = ({ 
  notification, 
  onNavigate 
}: { 
  notification: SmartNotification
  onNavigate: (url: string) => void
}) => {
  return (
    <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className={`p-1.5 md:p-2 rounded-full flex items-center justify-center shrink-0 ${
        notification.type === 'payment_overdue' ? 'bg-destructive/10' :
        notification.type === 'recurring_next' ? 'bg-warning/10' :
        notification.priority === 'high' ? 'bg-destructive/10 text-destructive' :
        notification.priority === 'medium' ? 'bg-warning/10 text-warning' :
        'bg-muted text-muted-foreground'
      }`}>
        {getIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          <p className="text-xs md:text-sm font-semibold truncate">{notification.title}</p>
          <Badge variant={getVariant(notification.priority)} className="text-[10px] md:text-xs shrink-0">
            {notification.priority === 'high' ? 'Urgente' : 
             notification.priority === 'medium' ? 'Atenção' : 'Info'}
          </Badge>
        </div>
        <p className="text-[11px] md:text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        
        {notification.metadata?.amount && (
          <p className="text-[11px] md:text-xs font-semibold text-primary">
            {formatCurrencyBR(notification.metadata.amount)}
          </p>
        )}
      </div>
      
      {notification.actionUrl && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onNavigate(notification.actionUrl!);
          }}
          className="shrink-0 h-7 md:h-8 px-2 md:px-3 text-xs"
        >
          Ver
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  )
}

// Fixed reminder item component (no swipe, no grip)
const FixedReminderItem = ({ 
  reminder, 
  index,
  onDismiss 
}: { 
  reminder: string
  index: number
  onDismiss: (index: number) => void
}) => {
  return (
    <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="p-1.5 md:p-2 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
        <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-warning" />
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs md:text-sm font-semibold">Lembrete</p>
        <p className="text-[11px] md:text-xs text-muted-foreground line-clamp-2">{reminder}</p>
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss(index);
        }}
        className="shrink-0 h-6 w-6 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

export const SmartNotificationCard = ({ notifications, reminders = [] }: SmartNotificationCardProps) => {
  const navigate = useNavigate()
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([])
  const [dismissedReminders, setDismissedReminders] = useState<number[]>([])

  // Garantir que sempre temos arrays válidos
  const validNotifications = Array.isArray(notifications) 
    ? notifications.filter(n => !dismissedNotifications.includes(n.id)) 
    : []
  const validReminders = Array.isArray(reminders) 
    ? reminders
        .filter(r => r && r !== 'Nenhum lembrete importante no momento')
        .filter((_, index) => !dismissedReminders.includes(index))
    : []

  const handleDismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id])
  }

  const handleDismissReminder = (index: number) => {
    setDismissedReminders(prev => [...prev, index])
  }

  const handleNavigate = (url: string) => {
    navigate(url)
  }

  if (validNotifications.length === 0 && validReminders.length === 0) {
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
      <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3">
        {validNotifications.map((notification) => (
          <FixedNotificationItem
            key={notification.id}
            notification={notification}
            onNavigate={handleNavigate}
          />
        ))}
        
        {/* Lembretes Importantes */}
        {validReminders.length > 0 && (
          <div className="space-y-2 md:space-y-3">
            {validReminders.map((reminder, index) => (
              <FixedReminderItem
                key={index}
                reminder={reminder}
                index={index}
                onDismiss={handleDismissReminder}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
