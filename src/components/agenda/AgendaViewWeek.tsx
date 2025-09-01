import React from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Edit, Trash, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatTimeBR } from '@/utils/formatters'

interface Session {
  id: string
  data: string
  horario: string
  client_id: string
  status: string
  valor?: number
}

interface Client {
  id: string
  nome: string
}

interface AgendaViewWeekProps {
  currentDate: Date
  sessions: Session[]
  clients: Client[]
  googleEvents?: any[]
  onEditSession: (session: Session) => void
  onDeleteSession: (sessionId: string) => void
  onCreateSession?: (date: Date, time?: string) => void
  onDragSession?: (sessionId: string, newDate: string, newTime: string) => void
  highlightedSessionId?: string | null
}

export const AgendaViewWeek: React.FC<AgendaViewWeekProps> = ({
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
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8h às 19h
  
  console.log('🗓️ AgendaViewWeek dados:', { currentDate, weekStart, days: days.length, hours: hours.length })

  const getSessionsForDateTime = (date: Date, hour: number) => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.data)
      const sessionHour = parseInt(session.horario.split(':')[0])
      return isSameDay(sessionDate, date) && sessionHour === hour
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'realizada':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getGoogleEventsForDateTime = (date: Date, hour: number) => {
    return googleEvents.filter(event => {
      if (!event.start?.dateTime) return false
      const eventDate = new Date(event.start.dateTime)
      return isSameDay(eventDate, date) && eventDate.getHours() === hour
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(weekStart, "dd/MM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
        </h3>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-0">
          {/* Header com dias da semana */}
          <div className="grid grid-cols-8 border-b border-border">
            <div className="p-4 text-center text-sm font-medium text-muted-foreground bg-muted">
              Horário
            </div>
            {days.map((day) => (
              <div key={day.getTime()} className="p-4 text-center text-sm font-medium text-muted-foreground bg-muted">
                <div>{format(day, 'EEE', { locale: ptBR })}</div>
                <div className={cn(
                  "text-lg font-bold mt-1",
                  isSameDay(day, new Date()) && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Grid de horários */}
          <div className="grid grid-cols-8">
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div className="p-3 text-center text-sm text-muted-foreground bg-muted border-r border-border">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {days.map((day) => {
                  const daySessions = getSessionsForDateTime(day, hour)
                  const dayGoogleEvents = getGoogleEventsForDateTime(day, hour)
                  return (
                    <div
                      key={`${day.getTime()}-${hour}`}
                      className={cn(
                        "min-h-[80px] p-2 border border-border cursor-pointer hover:bg-accent/20 transition-colors",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                      onClick={() => onCreateSession?.(day, `${String(hour).padStart(2, '0')}:00`)}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add('bg-primary/10')
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-primary/10')
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove('bg-primary/10')
                        const sessionId = e.dataTransfer.getData('session-id')
                        
                        if (sessionId && onDragSession) {
                          const newDate = format(day, 'yyyy-MM-dd')
                          const newTime = `${String(hour).padStart(2, '0')}:00`
                          onDragSession(sessionId, newDate, newTime)
                        }
                      }}
                    >
                      <div className="space-y-1">
                        {daySessions.map((session) => (
                          <Card 
                            key={session.id} 
                            className={cn(
                              "cursor-move group relative transition-all hover:shadow-sm",
                              getStatusColor(session.status),
                              highlightedSessionId === session.id && "animate-pulse-highlight"
                            )}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('session-id', session.id)
                              e.dataTransfer.setData('session-data', JSON.stringify(session))
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditSession(session)
                            }}
                          >
                            <CardContent className="p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs font-medium">{formatTimeBR(session.horario)}</span>
                              </div>
                              <div className="flex items-center gap-1 mb-1">
                                <User className="h-3 w-3" />
                                <span className="text-xs truncate">
                                  {clients.find(c => c.id === session.client_id)?.nome || 'N/A'}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {session.status}
                              </Badge>
                              
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditSession(session)
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 p-0 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteSession(session.id)
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Google Events */}
                        {dayGoogleEvents.map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded bg-blue-50 text-blue-700 border border-blue-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="truncate">{event.summary}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}