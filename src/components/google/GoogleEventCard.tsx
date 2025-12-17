import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { GoogleEvent, isRecurringEvent } from "@/types/googleCalendar"
import { 
  Calendar, Clock, MapPin, Users, Download, Copy, RefreshCw, 
  EyeOff, UserPlus, MoreHorizontal, ExternalLink
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface GoogleEventCardProps {
  event: GoogleEvent
  isSelected: boolean
  isSyncing: boolean
  seriesCount?: number
  showCheckbox?: boolean
  onSelect: () => void
  onImport: () => void
  onCopy: () => void
  onImportSeries?: () => void
  onCopySeries?: () => void
  onMirror: () => void
  onMirrorSeries?: () => void
  onIgnore: () => void
  onIgnoreSeries?: () => void
  onMarkAsClient?: () => void
}

export const GoogleEventCard = ({
  event,
  isSelected,
  isSyncing,
  seriesCount = 1,
  showCheckbox = false,
  onSelect,
  onImport,
  onCopy,
  onImportSeries,
  onCopySeries,
  onMirror,
  onMirrorSeries,
  onIgnore,
  onIgnoreSeries,
  onMarkAsClient
}: GoogleEventCardProps) => {
  const formatEventDateTime = (start: any, end: any) => {
    if (start.dateTime && end.dateTime) {
      const startDate = new Date(start.dateTime)
      const endDate = new Date(end.dateTime)
      
      return {
        date: format(startDate, "dd 'de' MMMM", { locale: ptBR }),
        time: `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`
      }
    }
    
    if (start.date) {
      return {
        date: format(new Date(start.date), "dd 'de' MMMM", { locale: ptBR }),
        time: "Dia inteiro"
      }
    }
    
    return { date: "", time: "" }
  }

  const { date, time } = formatEventDateTime(event.start, event.end)
  const isRecurring = isRecurringEvent(event)
  const hasMultipleInstances = seriesCount > 1

  return (
    <Card 
      className={`p-4 transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'} ${showCheckbox ? 'cursor-pointer' : ''}`}
      onClick={showCheckbox ? onSelect : undefined}
    >
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium truncate">{event.summary}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {isRecurring && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 bg-transparent">
                        G: Recorrente {hasMultipleInstances && `(${seriesCount})`}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {hasMultipleInstances 
                          ? `Série recorrente com ${seriesCount} eventos visíveis` 
                          : 'Evento recorrente (buscar série completa ao importar)'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{date}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{time}</span>
            </div>
            
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {event.attendees.slice(0, 2).map(a => a.displayName || a.email).join(', ')}
                  {event.attendees.length > 2 && ` +${event.attendees.length - 2}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={onCopy}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Criar cópia editável (este evento)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* IMPORTAR */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Importar (somente leitura)</DropdownMenuLabel>
              <DropdownMenuItem onClick={onImport}>
                <Download className="w-4 h-4 mr-2" />
                Este evento
              </DropdownMenuItem>
              {isRecurring && onImportSeries && (
                <DropdownMenuItem onClick={onImportSeries}>
                  <Download className="w-4 h-4 mr-2" />
                  Série toda
                </DropdownMenuItem>
              )}
              
              {/* COPIAR */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Copiar (editável e independente)</DropdownMenuLabel>
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Este evento
              </DropdownMenuItem>
              {isRecurring && onCopySeries && (
                <DropdownMenuItem onClick={onCopySeries}>
                  <Copy className="w-4 h-4 mr-2" />
                  Série toda
                </DropdownMenuItem>
              )}
              
              {/* ESPELHAR */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Espelhar (bidirecional)</DropdownMenuLabel>
              <DropdownMenuItem onClick={onMirror}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Este evento
              </DropdownMenuItem>
              {isRecurring && onMirrorSeries && (
                <DropdownMenuItem onClick={onMirrorSeries}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Série toda
                </DropdownMenuItem>
              )}
              
              {/* IGNORAR */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Ignorar</DropdownMenuLabel>
              <DropdownMenuItem onClick={onIgnore}>
                <EyeOff className="w-4 h-4 mr-2" />
                Este evento
              </DropdownMenuItem>
              {isRecurring && onIgnoreSeries && (
                <DropdownMenuItem onClick={onIgnoreSeries}>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Série toda
                </DropdownMenuItem>
              )}
              
              {/* OUTRAS OPÇÕES */}
              {event.attendees && event.attendees.length > 0 && onMarkAsClient && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onMarkAsClient}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Marcar participantes como clientes
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(event.htmlLink, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver no Google Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {event.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-8">
          {event.description}
        </p>
      )}
    </Card>
  )
}
