import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { PlatformSession, GoogleSyncType, SYNC_TYPE_LABELS } from "@/types/googleCalendar"
import { 
  Calendar, Clock, Upload, RefreshCw, MoreHorizontal, ExternalLink, 
  Package, Repeat, User
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatCurrencyBR, formatTimeBR } from "@/utils/formatters"
import { ClientAvatar } from "@/components/ClientAvatar"

interface PlatformSessionCardProps {
  session: PlatformSession
  isSelected: boolean
  isSyncing: boolean
  onSelect: () => void
  onSendToGoogle: () => void
  onMirror: () => void
}

export const PlatformSessionCard = ({
  session,
  isSelected,
  isSyncing,
  onSelect,
  onSendToGoogle,
  onMirror
}: PlatformSessionCardProps) => {
  const getSyncBadge = () => {
    const syncType = session.google_sync_type as GoogleSyncType
    if (!syncType || syncType === 'local') {
      return (
        <Badge variant="secondary" className="text-xs">
          Local
        </Badge>
      )
    }
    
    const config = SYNC_TYPE_LABELS[syncType]
    return (
      <Badge 
        variant={config.color as any} 
        className="text-xs"
        title={config.description}
      >
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      'realizada': 'success',
      'agendada': 'info',
      'cancelada': 'destructive',
      'falta': 'warning',
      'faltou': 'warning'
    }
    
    const statusLabels: Record<string, string> = {
      'realizada': 'Realizada',
      'agendada': 'Agendada',
      'cancelada': 'Cancelada',
      'falta': 'Falta',
      'faltou': 'Falta'
    }
    
    return (
      <Badge variant={statusColors[session.status] as any || 'outline'} className="text-xs">
        {statusLabels[session.status] || session.status}
      </Badge>
    )
  }

  const canSendToGoogle = !session.google_event_id && session.google_sync_type !== 'imported'
  const canMirror = session.google_sync_type !== 'mirrored'

  return (
    <Card className={`p-4 transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mt-1"
          disabled={!!session.google_event_id}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClientAvatar
                avatarPath={session.clients?.avatar_url}
                clientName={session.clients?.nome || 'Cliente'}
                size="sm"
              />
              <h3 className="font-medium truncate">{session.clients?.nome || 'Cliente'}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {session.package_id && (
                <Tooltip>
                  <TooltipTrigger>
                    <Package className="w-4 h-4 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>Sessão de pacote</TooltipContent>
                </Tooltip>
              )}
              {session.recurring_session_id && (
                <Tooltip>
                  <TooltipTrigger>
                    <Repeat className="w-4 h-4 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>Sessão recorrente</TooltipContent>
                </Tooltip>
              )}
              {getStatusBadge()}
              {getSyncBadge()}
            </div>
          </div>
          
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{format(new Date(session.data), "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTimeBR(session.horario)}</span>
            </div>
            
            {session.valor && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{formatCurrencyBR(session.valor)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            {canSendToGoogle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={onSendToGoogle}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enviar para o Google</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canSendToGoogle && (
                <DropdownMenuItem onClick={onSendToGoogle}>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar para Google
                </DropdownMenuItem>
              )}
              {canMirror && !session.google_event_id && (
                <DropdownMenuItem onClick={onMirror}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Espelhar com Google
                </DropdownMenuItem>
              )}
              {session.google_html_link && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.open(session.google_html_link!, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver no Google
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {session.anotacoes && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-8">
          {session.anotacoes}
        </p>
      )}
    </Card>
  )
}
