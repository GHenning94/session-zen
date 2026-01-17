import React, { useState, useEffect } from 'react'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Trash, Plus, Package, Repeat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatClientName } from '@/lib/utils'
import { formatTimeBR } from '@/utils/formatters'
import { useInterval } from 'react-use'
import { PulsingDot } from '@/components/ui/pulsing-dot'
import { sessionNeedsAttention } from '@/utils/sessionStatusUtils'
import { GoogleSyncBadge } from '@/components/google/GoogleSyncBadge'

interface Session {
  id: string
  data: string
  horario: string
  client_id: string
  status: string
  valor?: number
  anotacoes?: string
  package_id?: string
  recurring_session_id?: string
  google_sync_type?: string
}

interface Client {
  id: string
  nome: string
}

interface Package {
  id: string
  valor_por_sessao?: number
  valor_total: number
  total_sessoes: number
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
  packages?: Package[]
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
  packages = [],
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
  
  // Helper para obter valor da sessão (considera pacotes)
  const getSessionValue = (session: Session): number | null => {
    if (session.valor) return session.valor
    if (session.package_id) {
      const pkg = packages.find(p => p.id === session.package_id)
      if (pkg) {
        return pkg.valor_por_sessao || (pkg.valor_total / pkg.total_sessoes)
      }
    }
    return null
  }
  
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
      // Pass to onDragSession - it will handle the recurring logic
      onDragSession(draggedSession, newDate, newTime)
      setDraggedSession(null)
    }
  }

  // Not used anymore - cards are always blue with white text
  

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
                  hourSessions.map((session) => {
                    // Verificar se a sessão precisa de atenção
                    const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                    
                    return (
                    <Card 
                      key={session.id} 
                      className={cn(
                        "relative group cursor-move transition-all hover:shadow-md bg-primary/20 text-primary dark:text-primary-foreground border-primary/30 overflow-hidden", 
                        highlightedSessionId === session.id && "animate-pulse-highlight"
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, session.id)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditSession(session)
                      }}
                    >
                      {/* Status indicator line */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        session.status === 'realizada' && "bg-success",
                        session.status === 'agendada' && "bg-primary",
                        session.status === 'cancelada' && "bg-destructive",
                        (session.status === 'falta' || session.status === 'faltou') && "bg-warning",
                        !['realizada', 'agendada', 'cancelada', 'falta', 'faltou'].includes(session.status) && "bg-muted-foreground"
                      )} />
                      
                      {needsAttention && (
                        <div className="absolute top-2 left-3 z-10">
                          <PulsingDot color="warning" size="sm" />
                        </div>
                      )}
                      <CardContent className="p-2 pl-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-primary dark:text-primary-foreground" />
                                <span className="text-xs font-medium">{formatTimeBR(session.horario)}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <User className="h-3 w-3 flex-shrink-0 text-primary dark:text-primary-foreground" />
                                <span className="text-xs truncate">
                                  {formatClientName(clients.find(c => c.id === session.client_id)?.nome || 'Cliente não encontrado')}
                                </span>
                                {session.package_id && (
                                  <Package className="h-3 w-3 flex-shrink-0 text-primary dark:text-primary-foreground" />
                                )}
                                {session.recurring_session_id && !session.package_id && (
                                  <Repeat className="h-3 w-3 flex-shrink-0 text-primary dark:text-primary-foreground" />
                                )}
                              </div>
                              {session.package_id && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-primary/30 text-primary dark:text-primary-foreground border-0">
                                  <Package className="h-2 w-2 mr-0.5" />
                                  Pacote
                                </Badge>
                              )}
                              <GoogleSyncBadge syncType={session.google_sync_type} showLabel={true} size="sm" />
                            </div>
                            <div className="flex items-center gap-1">
                              {(() => {
                                const valor = getSessionValue(session)
                                return valor ? (
                                  <span className="text-xs font-medium text-success">
                                    R$ {Number(valor).toFixed(2)}
                                  </span>
                                ) : null
                              })()}
                            </div>
                            {session.anotacoes && (
                              <div className="mt-1 text-xs text-primary-foreground/70 truncate">
                                {session.anotacoes}
                              </div>
                            )}
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 text-primary-foreground hover:text-destructive"
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
                    )
                  })
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