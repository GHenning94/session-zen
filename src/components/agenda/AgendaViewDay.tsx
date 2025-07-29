import React from 'react'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Edit, Trash, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface AgendaViewDayProps {
  currentDate: Date
  sessions: Session[]
  clients: Client[]
  onEditSession: (session: Session) => void
  onDeleteSession: (sessionId: string) => void
  onCreateSession?: (date: Date) => void
}

export const AgendaViewDay: React.FC<AgendaViewDayProps> = ({
  currentDate,
  sessions,
  clients,
  onEditSession,
  onDeleteSession,
  onCreateSession
}) => {
  const daySessionsData = sessions.filter(session => {
    const sessionDate = new Date(session.data)
    return isSameDay(sessionDate, currentDate)
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getSessionsForHour = (hour: number) => {
    return daySessionsData.filter(session => {
      const sessionHour = parseInt(session.horario.split(':')[0])
      return sessionHour === hour
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'bg-blue-100 text-blue-800 border-blue-200'
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
          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h3>
        {onCreateSession && (
          <Button onClick={() => onCreateSession(currentDate)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Sessão
          </Button>
        )}
      </div>

      <div className="grid gap-2 max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourSessions = getSessionsForHour(hour)
          return (
            <div key={hour} className="grid grid-cols-12 gap-2 min-h-[60px] border-b border-border/50">
              <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground font-medium">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="col-span-10 space-y-1 py-1">
                {hourSessions.length > 0 ? (
                  hourSessions.map((session) => (
                    <Card key={session.id} className={cn("relative group cursor-pointer transition-all hover:shadow-md", getStatusColor(session.status))}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-3 w-3" />
                              <span className="text-sm font-medium">{session.horario}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-3 w-3" />
                              <span className="text-sm">
                                {clients.find(c => c.id === session.client_id)?.nome || 'Cliente não encontrado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {session.status}
                              </Badge>
                              {session.valor && (
                                <span className="text-xs text-muted-foreground">
                                  R$ {session.valor.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
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
                              className="h-6 w-6 text-red-600 hover:text-red-700"
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
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                    {/* Slot vazio */}
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