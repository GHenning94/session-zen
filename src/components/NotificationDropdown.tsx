import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { useIsMobile } from "@/hooks/use-mobile"
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
  X,
  Edit2,
  Cake
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
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    markVisibleAsRead,
    incomingNotification
  } = useNotifications()
  const [open, setOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [sideSheetOpen, setSideSheetOpen] = useState(false)
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false)

  // Extrair SESSION_ID do conteúdo da notificação
  const extractSessionId = (conteudo: string): string | null => {
    const match = conteudo.match(/\[SESSION_ID:([^\]]+)\]/)
    return match ? match[1] : null
  }

  // Extrair REDIRECT do conteúdo da notificação
  const extractRedirect = (conteudo: string): string | null => {
    const match = conteudo.match(/\[REDIRECT:([^\]]+)\]/)
    return match ? match[1] : null
  }

  // Extrair PACKAGE_EDIT do conteúdo da notificação
  const extractPackageEditId = (conteudo: string): string | null => {
    const match = conteudo.match(/\[PACKAGE_EDIT:([^\]]+)\]/)
    return match ? match[1] : null
  }

  // Extrair link markdown do conteúdo [texto](url)
  const extractMarkdownLink = (conteudo: string): { text: string; url: string } | null => {
    const match = conteudo.match(/\[([^\]]+)\]\(([^)]+)\)/)
    return match ? { text: match[1], url: match[2] } : null
  }

  // Remover tags especiais do texto exibido
  const getDisplayContent = (conteudo: string): string => {
    return conteudo
      .replace(/\s*\[SESSION_ID:[^\]]+\]/, '')
      .replace(/\s*\[REDIRECT:[^\]]+\]/, '')
      .replace(/\s*\[PACKAGE_EDIT:[^\]]+\]/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links but keep text
  }

  const getNotificationIcon = (titulo: string) => {
    if (titulo.toLowerCase().includes('aniversário')) return <Cake className="w-4 h-4" />
    if (titulo.toLowerCase().includes('agendamento') || titulo.toLowerCase().includes('sessão')) return <Calendar className="w-4 h-4" />
    if (titulo.toLowerCase().includes('pagamento')) return <CreditCard className="w-4 h-4" />
    if (titulo.toLowerCase().includes('cliente') || titulo.toLowerCase().includes('paciente')) return <User className="w-4 h-4" />
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
    // Não marca mais como lidas automaticamente ao abrir
    // O destaque só some quando o usuário clica na notificação
  }

  const handleViewAllNotifications = () => {
    setOpen(false)
    setAllNotificationsOpen(true)
    if (notifications.length > 0 && !selectedNotification) {
      setSelectedNotification(notifications[0])
    }
  }

  const handleEditSession = (sessionId: string) => {
    setSideSheetOpen(false)
    setAllNotificationsOpen(false)
    navigate(`/sessoes?edit=${sessionId}`)
  }

  const handleRedirect = (path: string) => {
    setSideSheetOpen(false)
    setAllNotificationsOpen(false)
    navigate(path)
  }

  const handleEditPackage = (packageId: string) => {
    setSideSheetOpen(false)
    setAllNotificationsOpen(false)
    navigate(`/pacotes?edit=${packageId}`)
  }

  const NotificationItem = ({ 
    notification, 
    onClick, 
    isSelected = false,
    showFullContent = false,
    showDeleteButton = false
  }: { 
    notification: Notification
    onClick?: () => void
    isSelected?: boolean
    showFullContent?: boolean
    showDeleteButton?: boolean
  }) => (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors relative ${
        isSelected 
          ? 'bg-primary/20 ring-1 ring-primary/50' 
          : !notification.lida 
            ? 'bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30' 
            : 'hover:bg-accent/30'
      }`}
      onClick={onClick}
    >
      {/* Indicador de não lida */}
      {!notification.lida && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
      
      <div className={`p-2 rounded-full shrink-0 ${
        !notification.lida ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {getNotificationIcon(notification.titulo)}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm ${showFullContent ? '' : 'truncate'} ${
          !notification.lida ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
        }`}>
          {notification.titulo}
        </h4>
        
        <p className={`text-xs mt-1 ${showFullContent ? '' : 'line-clamp-2'} ${
          !notification.lida ? 'text-muted-foreground' : 'text-muted-foreground/70'
        }`}>
          {getDisplayContent(notification.conteudo)}
        </p>
        
        <p className="text-xs text-muted-foreground/70 mt-2">
          {formatDistanceToNow(new Date(notification.data), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </p>
      </div>
      
      {showDeleteButton && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive mt-3"
          onClick={(e) => handleDelete(notification.id, e)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  // Conteúdo das notificações (reutilizado entre mobile e desktop)
  const NotificationListContent = () => (
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
        <ScrollArea className={isMobile ? "max-h-[60vh]" : "max-h-80"}>
          <div className="p-1 space-y-0.5">
            {notifications.slice(0, isMobile ? 10 : 5).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                showDeleteButton={true}
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
  )

  // Mobile-specific notification content - shows all notifications directly without duplicate titles
  const MobileNotificationContent = () => (
    <div className="space-y-2">
      {/* Header with mark all read */}
      <div className="flex items-center justify-between px-2">
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {unreadCount} não lidas
          </Badge>
        )}
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
      
      {/* Content - show ALL notifications */}
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
        <ScrollArea className="h-[calc(80vh-120px)]">
          <div className="p-1 space-y-0.5">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                showDeleteButton={true}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )

  // Mobile: usa Sheet
  if (isMobile) {
    return (
      <>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setOpen(true)}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && !incomingNotification && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] animate-in zoom-in-50 duration-300"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
        
        <Sheet open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen)
          // Não marca mais como lidas automaticamente ao abrir
        }}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
              </SheetTitle>
            </SheetHeader>
            <div className="p-2">
              <MobileNotificationContent />
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Side Sheet for Single Notification - Mobile */}
        <Sheet open={sideSheetOpen} onOpenChange={setSideSheetOpen}>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificação
              </SheetTitle>
            </SheetHeader>
            
            {selectedNotification && (
              <ScrollArea className="h-[calc(70vh-80px)]">
                <div className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                      {getNotificationIcon(selectedNotification.titulo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold">{selectedNotification.titulo}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(selectedNotification.data), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {getDisplayContent(selectedNotification.conteudo)}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    {extractSessionId(selectedNotification.conteudo) && (
                      <Button 
                        className="w-full"
                        onClick={() => handleEditSession(extractSessionId(selectedNotification.conteudo)!)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar Sessão
                      </Button>
                    )}
                    {extractRedirect(selectedNotification.conteudo) && (
                      <Button 
                        className="w-full"
                        onClick={() => handleRedirect(extractRedirect(selectedNotification.conteudo)!)}
                      >
                        {extractRedirect(selectedNotification.conteudo)?.includes('financeiro') 
                          ? 'Ir para Dados Bancários' 
                          : 'Ir para Pacotes'}
                      </Button>
                    )}
                    {extractPackageEditId(selectedNotification.conteudo) && (
                      <Button 
                        className="w-full"
                        onClick={() => handleEditPackage(extractPackageEditId(selectedNotification.conteudo)!)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar Pacote
                      </Button>
                    )}
                    {extractMarkdownLink(selectedNotification.conteudo) && (
                      <Button 
                        className="w-full"
                        onClick={() => handleRedirect(extractMarkdownLink(selectedNotification.conteudo)!.url)}
                      >
                        <User className="w-4 h-4 mr-2" />
                        {extractMarkdownLink(selectedNotification.conteudo)!.text}
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: usa DropdownMenu
  
  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && !incomingNotification && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-in zoom-in-50 duration-300"
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
          <NotificationListContent />
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
                <p className="text-foreground whitespace-pre-wrap">{getDisplayContent(selectedNotification.conteudo)}</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 flex-wrap">
                {extractSessionId(selectedNotification.conteudo) && (
                  <Button 
                    onClick={() => handleEditSession(extractSessionId(selectedNotification.conteudo)!)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar Sessão
                  </Button>
                )}
                {extractRedirect(selectedNotification.conteudo) && (
                  <Button 
                    onClick={() => handleRedirect(extractRedirect(selectedNotification.conteudo)!)}
                  >
                    {extractRedirect(selectedNotification.conteudo)?.includes('financeiro') 
                      ? 'Ir para Dados Bancários' 
                      : 'Ir para Pacotes'}
                  </Button>
                )}
                {extractPackageEditId(selectedNotification.conteudo) && (
                  <Button 
                    onClick={() => handleEditPackage(extractPackageEditId(selectedNotification.conteudo)!)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar Pacote
                  </Button>
                )}
                {extractMarkdownLink(selectedNotification.conteudo) && (
                  <Button 
                    onClick={() => handleRedirect(extractMarkdownLink(selectedNotification.conteudo)!.url)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {extractMarkdownLink(selectedNotification.conteudo)!.text}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Full Screen Modal for All Notifications */}
      <Dialog open={allNotificationsOpen} onOpenChange={setAllNotificationsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col [&>button]:hidden">
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
              <div className="flex items-center gap-2">
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setAllNotificationsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
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
                        {getDisplayContent(selectedNotification.conteudo)}
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 flex-wrap">
                      {extractSessionId(selectedNotification.conteudo) && (
                        <Button 
                          size="sm"
                          onClick={() => handleEditSession(extractSessionId(selectedNotification.conteudo)!)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar Sessão
                        </Button>
                      )}
                      {extractRedirect(selectedNotification.conteudo) && (
                        <Button 
                          size="sm"
                          onClick={() => handleRedirect(extractRedirect(selectedNotification.conteudo)!)}
                        >
                          Ir para Pacotes
                        </Button>
                      )}
                      {extractPackageEditId(selectedNotification.conteudo) && (
                        <Button 
                          size="sm"
                          onClick={() => handleEditPackage(extractPackageEditId(selectedNotification.conteudo)!)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar Pacote
                        </Button>
                      )}
                      {extractMarkdownLink(selectedNotification.conteudo) && (
                        <Button 
                          size="sm"
                          onClick={() => handleRedirect(extractMarkdownLink(selectedNotification.conteudo)!.url)}
                        >
                          <User className="w-4 h-4 mr-2" />
                          {extractMarkdownLink(selectedNotification.conteudo)!.text}
                        </Button>
                      )}
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
