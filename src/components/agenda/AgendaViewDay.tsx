import React, { useState, useEffect } from 'react'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Trash, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatClientName } from '@/lib/utils'
import { formatTimeBR } from '@/utils/formatters'
import { useInterval } from 'react-use'

interface Session {
  id: string
  data: string
  horario: string
  client_id: string
  status: string
  valor?: number
  anotacoes?: string
}

interface Client {
  id: string
  nome: string
}

interface GoogleEvent {
  id: string
  summary: string
  start?: {
    dateTime?: string
    date?: string
  }
  description?: string
}

interface AgendaViewDayProps {
  currentDate: Date
  sessions: Session[]
  clients: Client[]
  googleEvents?: GoogleEvent[]
  onEditSession: (session: Session) => void
  onDeleteSession: (sessionId: string) => void
  onCreateSession?: (date: Date, time?: string) => void
  onDragSession?: (sessionId: string, newDate: string, newTime: string) => void
  highlightedSessionId?: string | null
}

export const AgendaViewDay: React.FC<AgendaViewDayProps> = ({
  currentDate,
  sessions,
  clients,
  googleEvents = [],
  onEditSession,
  onDeleteSession,
  onCreateSession,
  onDragSession,
  highlightedSessionId
}) => {
  const [draggedSession, setDraggedSession] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Atualizar a hora atual a cada minuto
  useInterval(() => {
    setCurrentTime(new Date())
  }, 60000) // 60 segundos
  
  // Atualizar hora inicial
  useEffect(() => {
    setCurrentTime(new Date())
  }, [])
  
  const daySessionsData = sessions.filter(session => {
    return session.data === format(currentDate, 'yyyy-MM-dd')
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getSessionsForHour = (hour: number) => {
    return daySessionsData.filter(session => {
      const sessionHour = parseInt(session.horario.split(':')[0])
      return sessionHour === hour
    })
  }

  const getGoogleEventsForHour = (hour: number) => {
    return googleEvents.filter(event => {
      if (!event.start?.dateTime) return false
      const eventDate = new Date(event.start.dateTime)
      return isSameDay(eventDate, currentDate) && eventDate.getHours() === hour
    })
  }

  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggedSession(sessionId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    if (draggedSession && onDragSession) {
      const newDate = format(currentDate, 'yyyy-MM-dd')
      const newTime = `${String(hour).padStart(2, '0')}:00`
      onDragSession(draggedSession, newDate, newTime)
      setDraggedSession(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'realizada':
        return { backgroundColor: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success) / 0.2)' }
      case 'cancelada':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }
  

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h3>
      </div>

      <div className="grid gap-2 max-h-[600px] overflow-y-auto relative">
        {hours.map((hour) => {
          const hourSessions = getSessionsForHour(hour)
          const hourGoogleEvents = getGoogleEventsForHour(hour)
          return (
            <div 
              key={hour} 
              className={cn(
                "grid grid-cols-12 gap-2 min-h-[80px] border-b border-border/50 hover:bg-accent/20 transition-colors",
                draggedSession && "border-dashed border-primary"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, hour)}
              onClick={() => hourSessions.length === 0 && onCreateSession?.(currentDate, `${String(hour).padStart(2, '0')}:00`)}
            >
              <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground font-medium border-r border-border">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="col-span-10 space-y-1 py-2 cursor-pointer relative">
                {/* Current time red line for today only */}
                {(() => {
                  const now = new Date()
                  const isToday = format(currentDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
                  const currentHour = now.getHours()
                  const currentMinute = now.getMinutes()
                  
                  if (isToday && currentHour === hour) {
                    const currentTimePosition = (currentMinute / 60) * 100
                    return (
                      <div 
                        className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                        style={{ top: `${currentTimePosition}%` }}
                      >
                        <div className="w-1 h-1 bg-destructive rounded-full mr-1" />
                        <div className="flex-1 h-0.5 bg-destructive" />
                        <span className="text-xs text-destructive ml-1 bg-background px-1 rounded text-[10px]">
                          {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}
                
                {hourSessions.length > 0 ? (
                  hourSessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className={cn(
                        "relative group cursor-move transition-all hover:shadow-md", 
                        getStatusColor(session.status),
                        highlightedSessionId === session.id && "animate-pulse-highlight"
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, session.id)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditSession(session)
                      }}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs font-medium">{formatTimeBR(session.horario)}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <span className="text-xs truncate">
                                  {formatClientName(clients.find(c => c.id === session.client_id)?.nome || 'Cliente não encontrado')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {session.valor && (
                                <span className="text-xs font-medium text-success">
                                  R$ {Number(session.valor).toFixed(2)}
                                </span>
                              )}
                            </div>
                            {session.anotacoes && (
                              <div className="mt-1 text-xs text-muted-foreground truncate">
                                {session.anotacoes}
                              </div>
                            )}
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteSession(session.id)
                              }}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : null}

                {/* Google Events */}
                {hourGoogleEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-primary/10 text-primary rounded-lg p-2 border border-primary/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium">{event.summary}</span>
                    </div>
                    {event.description && (
                      <div className="text-xs text-primary mt-1">
                        {event.description}
                      </div>
                    )}
                  </div>
                ))}

                {hourSessions.length === 0 && hourGoogleEvents.length === 0 && (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs py-4">
                    Clique para agendar
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}