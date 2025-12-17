import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { GoogleEvent } from "@/types/googleCalendar"
import { Calendar, Clock, RefreshCw, Download, Copy, ArrowLeftRight, EyeOff } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type ActionType = 'import' | 'copy' | 'mirror' | 'ignore'

interface SeriesSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  events: GoogleEvent[]
  actionType: ActionType
  loading?: boolean
  onConfirm: (selectedEventIds: string[]) => void
}

const actionConfig: Record<ActionType, { title: string; description: string; icon: React.ReactNode; buttonText: string; buttonVariant: 'default' | 'outline' | 'destructive' }> = {
  import: {
    title: 'Importar Eventos da Série',
    description: 'Selecione quais eventos deseja importar como somente leitura.',
    icon: <Download className="w-5 h-5 text-primary" />,
    buttonText: 'Importar Selecionados',
    buttonVariant: 'default'
  },
  copy: {
    title: 'Copiar Eventos da Série',
    description: 'Selecione quais eventos deseja copiar como sessões editáveis e independentes.',
    icon: <Copy className="w-5 h-5 text-primary" />,
    buttonText: 'Copiar Selecionados',
    buttonVariant: 'default'
  },
  mirror: {
    title: 'Espelhar Eventos da Série',
    description: 'Selecione quais eventos deseja espelhar (sincronização bidirecional).',
    icon: <ArrowLeftRight className="w-5 h-5 text-primary" />,
    buttonText: 'Espelhar Selecionados',
    buttonVariant: 'default'
  },
  ignore: {
    title: 'Ignorar Eventos da Série',
    description: 'Selecione quais eventos deseja ignorar (não serão mais exibidos).',
    icon: <EyeOff className="w-5 h-5 text-muted-foreground" />,
    buttonText: 'Ignorar Selecionados',
    buttonVariant: 'outline'
  }
}

export const SeriesSelectionModal = ({
  isOpen,
  onClose,
  events,
  actionType,
  loading = false,
  onConfirm
}: SeriesSelectionModalProps) => {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  
  // Selecionar todos por padrão ao abrir
  useEffect(() => {
    if (isOpen && events.length > 0) {
      setSelectedEvents(new Set(events.map(e => e.id)))
    }
  }, [isOpen, events])

  const config = actionConfig[actionType]

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set())
    } else {
      setSelectedEvents(new Set(events.map(e => e.id)))
    }
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selectedEvents))
  }

  const formatEventDateTime = (event: GoogleEvent) => {
    const start = event.start.dateTime || event.start.date
    if (!start) return { date: '', time: '' }
    
    const startDate = new Date(start)
    return {
      date: format(startDate, "dd/MM/yy", { locale: ptBR }),
      time: event.start.dateTime ? format(startDate, "HH:mm") : "Dia inteiro"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de todos */}
          <div className="flex items-center justify-between px-2 py-2 rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedEvents.size === events.length}
                onCheckedChange={toggleAll}
              />
              <span className="font-medium text-sm">Selecionar todos</span>
            </div>
            <Badge variant="outline">
              {selectedEvents.size} de {events.length} selecionados
            </Badge>
          </div>

          <Separator />

          {/* Lista de eventos */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {events.map((event) => {
                const { date, time } = formatEventDateTime(event)
                const isSelected = selectedEvents.has(event.id)
                
                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleEvent(event.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.summary}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={selectedEvents.size === 0 || loading}
          >
            {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {config.buttonText} ({selectedEvents.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
