import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Trash, Package, Repeat, Download, RefreshCw, Upload, EyeOff, XCircle } from "lucide-react"
import { cn, formatClientName } from "@/lib/utils"
import { addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatTimeBR } from "@/utils/formatters"
import { PulsingDot } from "@/components/ui/pulsing-dot"
import { sessionNeedsAttention } from "@/utils/sessionStatusUtils"
import { GoogleSyncType } from "@/types/googleCalendar"

interface Package {
  id: string
  valor_por_sessao?: number
  valor_total: number
  total_sessoes: number
}

interface AgendaViewMonthProps {
  selectedDate: Date
  sessions: any[]
  clients: any[]
  packages?: Package[]
  googleEvents: any[]
  onEditSession: (session: any) => void
  onDeleteSession: (sessionId: string) => void
  onCreateSession: (date: Date) => void
  onDragSession: (sessionId: string, newDate: string, newTime: string) => void
  onDateSelect: (date: Date) => void
  onSwitchToWeekView?: (date: Date) => void
  highlightedSessionId?: string | null
}

const AgendaViewMonth: React.FC<AgendaViewMonthProps> = ({
  selectedDate,
  sessions,
  clients,
  packages = [],
  googleEvents,
  onEditSession,
  onDeleteSession,
  onCreateSession,
  onDragSession,
  onDateSelect,
  onSwitchToWeekView,
  highlightedSessionId
}) => {
  const [draggedSession, setDraggedSession] = useState<string | null>(null)

  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const calendarDays: Date[] = []
  let currentDay = calendarStart
  
  while (currentDay <= calendarEnd) {
    calendarDays.push(currentDay)
    currentDay = addDays(currentDay, 1)
  }

  const getClientName = (clientId: string) => {
    const client = clients.find((c: any) => c.id === clientId)
    return client?.nome || 'Cliente'
  }

  // Helper para obter valor da sessão (considera pacotes)
  const getSessionValue = (session: any): number | null => {
    if (session.valor) return session.valor
    if (session.package_id) {
      const pkg = packages.find(p => p.id === session.package_id)
      if (pkg) {
        return pkg.valor_por_sessao || (pkg.valor_total / pkg.total_sessoes)
      }
    }
    return null
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

  // Ícone do Google baseado no tipo de sincronização
  const getGoogleSyncIcon = (syncType?: GoogleSyncType | string | null) => {
    if (!syncType || syncType === 'local') return null
    
    const iconClass = "h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0"
    switch (syncType) {
      case 'importado':
        return <Download className={iconClass} />
      case 'espelhado':
        return <RefreshCw className={iconClass} />
      case 'enviado':
        return <Upload className={iconClass} />
      case 'ignorado':
        return <EyeOff className={iconClass} />
      case 'cancelado':
        return <XCircle className={iconClass} />
      default:
        return null
    }
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
        {/* Header with day names */}
        <div className="grid grid-cols-7 border-b border-border">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
            <div key={`${day}-${idx}`} className="p-2 md:p-4 text-center text-xs md:text-sm font-medium text-muted-foreground bg-muted">
              <span className="md:hidden">{day}</span>
              <span className="hidden md:inline">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][idx]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid - Horizontal scrollable on mobile for better visualization */}
        <div className="overflow-x-auto md:overflow-x-visible">
          <div className="min-w-[700px] md:min-w-0">
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
                      "min-h-[100px] md:min-h-[120px] border border-border p-2 cursor-pointer hover:bg-accent/20 transition-colors",
                      !isCurrentMonth && "text-muted-foreground bg-muted/50",
                      isToday && "bg-primary/5",
                      draggedSession && "border-dashed border-primary"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                    onClick={() => {
                      onDateSelect(date)
                      if (onSwitchToWeekView) {
                        onSwitchToWeekView(date)
                      }
                    }}
                  >
                    <div className="flex justify-start items-start mb-1">
                      <div className={cn(
                        "font-medium text-sm",
                        isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      )}>
                        {date.getDate()}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Session cards - visible on all screens */}
                      {daySessionsData.slice(0, 3).map((session) => {
                        const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                        
                        return (
                          <div
                            key={session.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, session.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "text-[10px] md:text-xs p-1 md:p-2 rounded-lg bg-primary/20 text-primary-foreground hover:bg-primary/30 transition-colors group relative cursor-move border border-primary/30 shadow-sm overflow-hidden",
                              highlightedSessionId === session.id && "ring-2 ring-primary ring-offset-1 animate-pulse",
                              draggedSession === session.id && "opacity-50 scale-95"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditSession(session)
                            }}
                          >
                            {/* Status indicator line */}
                            <div className={cn(
                              "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
                              session.status === 'realizada' && "bg-success",
                              session.status === 'agendada' && "bg-primary",
                              session.status === 'cancelada' && "bg-destructive",
                              (session.status === 'falta' || session.status === 'faltou') && "bg-warning",
                              !['realizada', 'agendada', 'cancelada', 'falta', 'faltou'].includes(session.status) && "bg-muted-foreground"
                            )} />
                            
                            {needsAttention && (
                              <div className="absolute top-0.5 left-2 z-10">
                                <PulsingDot color="warning" size="sm" />
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-[10px] md:text-xs pl-1.5">
                              <div className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                                <span>{formatTimeBR(session.horario)}</span>
                              </div>
                              <div className="flex items-center gap-0.5 min-w-0">
                                <User className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {formatClientName(getClientName(session.client_id))}
                                </span>
                                {session.package_id && (
                                  <Package className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0 text-primary" />
                                )}
                                {session.recurring_session_id && !session.package_id && (
                                  <Repeat className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0 text-primary" />
                                )}
                              </div>
                              {getGoogleSyncIcon(session.google_sync_type)}
                            </div>
                            {(() => {
                              const valor = getSessionValue(session)
                              return valor ? (
                                <div className="text-[10px] font-medium text-success mt-0.5 pl-1.5">
                                  R$ {Number(valor).toFixed(2)}
                                </div>
                              ) : null
                            })()}

                            <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteSession(session.id)
                                }}
                                className="h-4 w-4 md:h-5 md:w-5 p-0 text-primary-foreground hover:text-destructive"
                              >
                                <Trash className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}

                      {dayGoogleEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="text-[10px] md:text-xs p-1 rounded bg-primary/10 text-primary border border-primary/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full"></div>
                            <span className="truncate">{event.summary}</span>
                          </div>
                        </div>
                      ))}

                      {daySessionsData.length > 3 && (
                        <div className="text-[10px] md:text-xs text-muted-foreground">
                          +{daySessionsData.length - 3} mais
                        </div>
                      )}

                      {dayGoogleEvents.length > 2 && (
                        <div className="text-[10px] md:text-xs text-primary">
                          +{dayGoogleEvents.length - 2} eventos
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { AgendaViewMonth }
export default AgendaViewMonth