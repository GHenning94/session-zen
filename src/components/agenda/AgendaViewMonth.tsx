import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Trash } from "lucide-react"
import { cn, formatClientName } from "@/lib/utils"
import { addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatTimeBR } from "@/utils/formatters"
import { PulsingDot } from "@/components/ui/pulsing-dot"
import { sessionNeedsAttention } from "@/utils/sessionStatusUtils"
import { GoogleSyncBadge } from "@/components/google/GoogleSyncBadge"

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
    <Card className="shadow-soft overflow-hidden">
      <CardContent className="p-0">
        {/* Header with day names - Mobile optimized */}
        <div className="grid grid-cols-7 border-b border-border">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
            <div key={`${day}-${idx}`} className="p-2 md:p-4 text-center text-xs md:text-sm font-medium text-muted-foreground bg-muted">
              <span className="md:hidden">{day}</span>
              <span className="hidden md:inline">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][idx]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid - Scrollable container */}
        <div className="overflow-y-auto max-h-[calc(100vh-300px)] md:max-h-none">
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
                    "min-h-[70px] md:min-h-[120px] border border-border p-1 md:p-2 cursor-pointer hover:bg-accent/20 transition-colors",
                    !isCurrentMonth && "text-muted-foreground bg-muted/50",
                    isToday && "bg-primary/5",
                    isSelected && "ring-2 ring-primary ring-inset",
                    draggedSession && "border-dashed border-primary"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                  onClick={() => {
                    onDateSelect(date)
                    onCreateSession(date)
                  }}
                >
                  <div className="flex justify-center md:justify-start items-start mb-1">
                    <div className={cn(
                      "font-medium text-xs md:text-sm",
                      isToday && "bg-primary text-primary-foreground rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs"
                    )}>
                      {date.getDate()}
                    </div>
                  </div>

                  <div className="space-y-0.5 md:space-y-1">
                    {/* Mobile: Show only dots for sessions */}
                    <div className="md:hidden flex flex-wrap gap-0.5 justify-center">
                      {daySessionsData.slice(0, 4).map((session) => {
                        const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                        return (
                          <div
                            key={session.id}
                            className={cn(
                              "w-2 h-2 rounded-full bg-primary",
                              needsAttention && "bg-warning animate-pulse",
                              highlightedSessionId === session.id && "ring-1 ring-primary"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditSession(session)
                            }}
                          />
                        )
                      })}
                      {dayGoogleEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="w-2 h-2 rounded-full bg-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ))}
                      {(daySessionsData.length > 4 || dayGoogleEvents.length > 2) && (
                        <span className="text-[8px] text-muted-foreground">+</span>
                      )}
                    </div>

                    {/* Desktop: Show full session cards */}
                    <div className="hidden md:block space-y-1">
                      {daySessionsData.slice(0, 3).map((session) => {
                        const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                        
                        return (
                          <div
                            key={session.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, session.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "text-xs p-2 rounded-lg bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary-foreground hover:bg-primary/30 dark:hover:bg-primary/40 transition-colors group relative cursor-move border border-primary/30 dark:border-primary/50 shadow-sm",
                              highlightedSessionId === session.id && "ring-2 ring-primary ring-offset-1 animate-pulse",
                              draggedSession === session.id && "opacity-50 scale-95"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditSession(session)
                            }}
                          >
                            {needsAttention && (
                              <div className="absolute top-1 left-1 z-10">
                                <PulsingDot color="warning" size="sm" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>{formatTimeBR(session.horario)}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {formatClientName(getClientName(session.client_id))}
                                </span>
                              </div>
                              <GoogleSyncBadge syncType={session.google_sync_type} showLabel={false} size="sm" />
                            </div>

                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteSession(session.id)
                                }}
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}

                      {dayGoogleEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded bg-primary/10 text-primary border border-primary/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
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
                        <div className="text-xs text-primary">
                          +{dayGoogleEvents.length - 2} eventos
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { AgendaViewMonth }
export default AgendaViewMonth