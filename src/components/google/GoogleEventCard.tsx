import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { GoogleEvent } from "@/types/googleCalendar"
import { 
  Calendar, Clock, MapPin, Users, Link, Download, Copy, RefreshCw, 
  EyeOff, UserPlus, MoreHorizontal, ExternalLink
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface GoogleEventCardProps {
  event: GoogleEvent
  isSelected: boolean
  isSyncing: boolean
  onSelect: () => void
  onImport: (createClient?: boolean) => void
  onMirror: () => void
  onIgnore: () => void
}

export const GoogleEventCard = ({
  event,
  isSelected,
  isSyncing,
  onSelect,
  onImport,
  onMirror,
  onIgnore
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

  return (
    <Card className={`p-4 transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium truncate">{event.summary}</h3>
            {event.recurringEventId && (
              <Badge variant="outline" className="shrink-0">
                <RefreshCw className="w-3 h-3 mr-1" />
                Recorrente
              </Badge>
            )}
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
                  onClick={() => onImport(true)}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Importar para a plataforma</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onImport(false)}>
                <Download className="w-4 h-4 mr-2" />
                Importar (somente leitura)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onImport(true)}>
                <Copy className="w-4 h-4 mr-2" />
                Criar cópia editável
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMirror}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Espelhar com Google
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onIgnore} className="text-muted-foreground">
                <EyeOff className="w-4 h-4 mr-2" />
                Ignorar evento
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(event.htmlLink, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver no Google
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
