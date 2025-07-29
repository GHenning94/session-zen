import React from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Edit, Trash, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
}

export const AgendaViewWeek: React.FC<AgendaViewWeekProps> = ({
  currentDate,
  sessions,
  clients,
  googleEvents = [],
  onEditSession,
  onDeleteSession,
  onCreateSession,
  onDragSession
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8h às 19h

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(weekStart, "dd/MM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header com dias da semana */}
          <div className="grid grid-cols-8 gap-px mb-2">
            <div className="p-2 text-center text-sm font-medium text-muted-foreground bg-muted">
              Horário
            </div>
            {days.map((day) => (
              <div key={day.getTime()} className="p-2 text-center text-sm font-medium text-muted-foreground bg-muted">
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
          <div className="space-y-px">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 gap-px">
                <div className="p-3 text-center text-sm text-muted-foreground bg-muted">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {days.map((day) => {
                  const daySessions = getSessionsForDateTime(day, hour)
                  return (
                    <div
                      key={`${day.getTime()}-${hour}`}
                      className={cn(
                        "min-h-[80px] p-1 bg-background border border-border/50 cursor-pointer hover:bg-accent/30 transition-colors",
                        isSameDay(day, new Date()) && "bg-accent/20"
                      )}
                      onClick={() => onCreateSession?.(day, `${String(hour).padStart(2, '0')}:00`)}
                    >
                      {daySessions.map((session) => (
                        <Card 
                          key={session.id} 
                          className={cn(
                            "mb-1 cursor-move group relative transition-all hover:shadow-sm text-xs",
                            getStatusColor(session.status)
                          )}
                          draggable
                        >
                          <CardContent className="p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-2 w-2" />
                              <span className="text-xs font-medium">{session.horario}</span>
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                              <User className="h-2 w-2" />
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
                                className="h-4 w-4 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditSession(session)
                                }}
                              >
                                <Edit className="h-2 w-2" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteSession(session.id)
                                }}
                              >
                                <Trash className="h-2 w-2" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}