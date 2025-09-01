import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatTimeBR } from "@/utils/formatters"

interface AgendaViewMonthProps {
  selectedDate: Date
  sessions: any[]
  clients: any[]
  googleEvents: any[]
  onEditSession: (session: any) => void
  onDeleteSession: (sessionId: string) => void
  onCreateSession: (date: Date) => void
  onDragSession: (sessionId: string, newDate: string, newTime: string) => void
  onDateSelect: (date: Date) => void
  highlightedSessionId?: string | null
}

const AgendaViewMonth: React.FC<AgendaViewMonthProps> = ({
  selectedDate,
  sessions,
  clients,
  googleEvents,
  onEditSession,
  onDeleteSession,
  onCreateSession,
  onDragSession,
  onDateSelect,
  highlightedSessionId
}) => {
  const [draggedSession, setDraggedSession] = useState<string | null>(null)

  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const calendarDays = []
  let currentDay = calendarStart
  
  while (currentDay <= calendarEnd) {
    calendarDays.push(currentDay)
    currentDay = addDays(currentDay, 1)
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.nome || 'Cliente'
  }

  const getSessionsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return sessions.filter(session => session.data === dateStr)
  }

  const getGoogleEventsForDate = (date: Date) => {
    return googleEvents.filter(event => {
      if (event.start?.date) {
        return event.start.date === date.toISOString().split('T')[0]
      }
      if (event.start?.dateTime) {
        const eventDate = new Date(event.start.dateTime)
        return eventDate.toDateString() === date.toDateString()
      }
      return false
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

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    
    if (draggedSession) {
      const session = sessions.find(s => s.id === draggedSession)
      if (session) {
        const newDate = format(targetDate, 'yyyy-MM-dd')
        await onDragSession(draggedSession, newDate, session.horario)
      }
      setDraggedSession(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedSession(null)
  }

  return (
    <Card className="shadow-soft">
      <CardContent className="p-0">
        {/* Header with day names */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-muted-foreground bg-muted">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date) => {
            const daySessionsData = getSessionsForDate(date)
            const dayGoogleEvents = getGoogleEventsForDate(date)
            const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
            const isToday = date.toDateString() === new Date().toDateString()
            const isSelected = date.toDateString() === selectedDate.toDateString()

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "min-h-[120px] border border-border p-2 cursor-pointer hover:bg-accent/20 transition-colors",
                  !isCurrentMonth && "text-muted-foreground bg-muted/50",
                  isToday && "bg-primary/5",
                  isSelected && "ring-2 ring-primary",
                  draggedSession && "border-dashed border-primary"
                )}
                onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                  onClick={() => {
                    onDateSelect(date)
                    onCreateSession(date)
                  }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={cn(
                    "font-medium text-sm",
                    isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  )}>
                    {date.getDate()}
                  </div>
                </div>

                <div className="space-y-1">
                  {daySessionsData.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, session.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "text-xs p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors group relative cursor-move",
                        highlightedSessionId === session.id && "ring-2 ring-primary ring-offset-1 animate-pulse",
                        draggedSession === session.id && "opacity-50 scale-95"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditSession(session)
                      }}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeBR(session.horario)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">
                            {getClientName(session.client_id)}
                          </span>
                        </div>
                      </div>

                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditSession(session)
                          }}
                          className="h-5 w-5 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteSession(session.id)
                          }}
                          className="h-5 w-5 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {dayGoogleEvents.slice(0, 2).map((event) => (
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

                  {daySessionsData.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{daySessionsData.length - 3} mais
                    </div>
                  )}

                  {dayGoogleEvents.length > 2 && (
                    <div className="text-xs text-blue-600">
                      +{dayGoogleEvents.length - 2} eventos
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export { AgendaViewMonth }
export default AgendaViewMonth