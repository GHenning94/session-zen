import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/useNotifications"
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  Calendar,
  User,
  CreditCard,
  Settings
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

const NotificationDropdown = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    markVisibleAsRead
  } = useNotifications()
  const [open, setOpen] = useState(false)

  const getNotificationIcon = (titulo: string) => {
    if (titulo.toLowerCase().includes('agendamento')) return <Calendar className="w-4 h-4" />
    if (titulo.toLowerCase().includes('pagamento')) return <CreditCard className="w-4 h-4" />
    if (titulo.toLowerCase().includes('cliente')) return <User className="w-4 h-4" />
    if (titulo.toLowerCase().includes('configuração')) return <Settings className="w-4 h-4" />
    return <Bell className="w-4 h-4" />
  }

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const success = await markAsRead(notificationId)
      if (success) {
        console.log('Notificação marcada como lida')
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const success = await deleteNotification(notificationId)
      if (success) {
        console.log('Notificação excluída')
      }
    } catch (error) {
      console.error('Erro ao excluir notificação:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const success = await markAllAsRead()
      if (success) {
        console.log('Todas as notificações marcadas como lidas')
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  // Marcar como lidas quando abrir
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && unreadCount > 0) {
      markVisibleAsRead()
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="p-0">
            Notificações
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando notificações...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma notificação
          </div>
        ) : (
          <ScrollArea className="h-80">
            {notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id}
                className={`p-0 focus:bg-accent ${
                  !notification.lida ? 'bg-accent/50' : ''
                }`}
              >
                <div className="flex items-start gap-3 p-3 w-full">
                  <div className={`p-2 rounded-full ${
                    !notification.lida ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {getNotificationIcon(notification.titulo)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm font-medium truncate ${
                        !notification.lida ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {notification.titulo}
                      </h4>
                      <div className="flex gap-1">
                        {!notification.lida && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon" 
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(notification.id, e)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.conteudo}
                    </p>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.data), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => {
                  setOpen(false)
                  // Aqui você pode navegar para uma página de notificações se houver
                  console.log('Navegar para todas as notificações')
                }}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationDropdown