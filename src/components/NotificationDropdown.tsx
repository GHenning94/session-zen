import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
  Settings,
  X
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Separator } from "@/components/ui/separator"

interface Notification {
  id: string
  titulo: string
  conteudo: string
  data: string
  lida: boolean
}

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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [sideSheetOpen, setSideSheetOpen] = useState(false)
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false)

  const getNotificationIcon = (titulo: string) => {
    if (titulo.toLowerCase().includes('agendamento') || titulo.toLowerCase().includes('sessão')) return <Calendar className="w-4 h-4" />
    if (titulo.toLowerCase().includes('pagamento')) return <CreditCard className="w-4 h-4" />
    if (titulo.toLowerCase().includes('cliente')) return <User className="w-4 h-4" />
    if (titulo.toLowerCase().includes('configuração')) return <Settings className="w-4 h-4" />
    return <Bell className="w-4 h-4" />
  }

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification)
    setSideSheetOpen(true)
    setOpen(false)
    if (!notification.lida) {
      await markAsRead(notification.id)
    }
  }

  const handleDelete = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await deleteNotification(notificationId)
    if (selectedNotification?.id === notificationId) {
      setSelectedNotification(null)
      setSideSheetOpen(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && unreadCount > 0) {
      markVisibleAsRead()
    }
  }

  const handleViewAllNotifications = () => {
    setOpen(false)
    setAllNotificationsOpen(true)
    if (notifications.length > 0 && !selectedNotification) {
      setSelectedNotification(notifications[0])
    }
  }

  const NotificationItem = ({ 
    notification, 
    onClick, 
    onDelete,
    isSelected = false,
    showFullContent = false
  }: { 
    notification: Notification
    onClick?: () => void
    onDelete: (id: string, e?: React.MouseEvent) => void
    isSelected?: boolean
    showFullContent?: boolean
  }) => (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-accent' : !notification.lida ? 'bg-accent/50 hover:bg-accent/70' : 'hover:bg-accent/30'
      }`}
      onClick={onClick}
    >
      <div className={`p-2 rounded-full shrink-0 ${
        !notification.lida ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {getNotificationIcon(notification.titulo)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-sm font-medium ${showFullContent ? '' : 'truncate'} ${
            !notification.lida ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {notification.titulo}
          </h4>
          <Button
            variant="ghost"
            size="icon" 
            className="h-6 w-6 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => onDelete(notification.id, e)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        
        <p className={`text-xs text-muted-foreground mt-1 ${showFullContent ? '' : 'line-clamp-2'}`}>
          {notification.conteudo}
        </p>
        
        <p className="text-xs text-muted-foreground/70 mt-2">
          {formatDistanceToNow(new Date(notification.data), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </p>
      </div>
    </div>
  )

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
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
        
        <DropdownMenuContent 
          align="end" 
          className="w-[340px] rounded-2xl bg-muted/50 dark:bg-black/90 p-0"
        >
          {/* Main Section */}
          <section className="bg-background backdrop-blur-lg rounded-2xl p-1 shadow border border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">Notificações</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllAsRead}
                  className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Marcar todas
                </Button>
              )}
            </div>
            
            <Separator className="mx-1" />
            
            {/* Content */}
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Carregando notificações...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <BellOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="p-1 space-y-0.5">
                  {notifications.slice(0, 5).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {/* View All Button */}
            {notifications.length > 0 && (
              <>
                <Separator className="mx-1 my-1" />
                <Button 
                  variant="ghost" 
                  className="w-full p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground justify-center"
                  onClick={handleViewAllNotifications}
                >
                  Ver todas as notificações
                </Button>
              </>
            )}
          </section>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Side Sheet for Single Notification */}
      <Sheet open={sideSheetOpen} onOpenChange={setSideSheetOpen}>
        <SheetContent side="left" className="w-[400px] sm:w-[540px] p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificação
            </SheetTitle>
          </SheetHeader>
          
          {selectedNotification && (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  {getNotificationIcon(selectedNotification.titulo)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedNotification.titulo}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(selectedNotification.data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="prose prose-sm dark:prose-invert">
                <p className="text-foreground whitespace-pre-wrap">{selectedNotification.conteudo}</p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSideSheetOpen(false)}
                >
                  Fechar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDelete(selectedNotification.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Full Screen Modal for All Notifications */}
      <Dialog open={allNotificationsOpen} onOpenChange={setAllNotificationsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-6 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Todas as Notificações
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </DialogTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllAsRead}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Notifications List */}
            <div className="w-2/5 border-r overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      <BellOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma notificação</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => {
                          setSelectedNotification(notification)
                          if (!notification.lida) {
                            markAsRead(notification.id)
                          }
                        }}
                        onDelete={handleDelete}
                        isSelected={selectedNotification?.id === notification.id}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {/* Reading Pane */}
            <div className="w-3/5 overflow-hidden flex flex-col">
              {selectedNotification ? (
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
                        {getNotificationIcon(selectedNotification.titulo)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{selectedNotification.titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(selectedNotification.data), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">
                        {selectedNotification.conteudo}
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(selectedNotification.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir notificação
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Selecione uma notificação para ler</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default NotificationDropdown
