import React, { useState, useEffect, useRef } from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Trash, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  // Create 48 time slots (24 hours * 2 for 30-minute intervals)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = i % 2 === 0 ? 0 : 30
    return { hour, minute, timeString: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
  })
  
  // Current time tracking for red line
  const [, setCurrentTime] = useState(new Date())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to current time on component mount
  useEffect(() => {
    const scrollToCurrentTime = () => {
      if (!scrollAreaRef.current) return
      
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Find the closest time slot index
      const currentSlotIndex = currentHour * 2 + (currentMinute >= 30 ? 1 : 0)
      
      // Calculate scroll position (each row is approximately 60px)
      const scrollPosition = Math.max(0, (currentSlotIndex - 4) * 60) // Show 4 slots before current time
      
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = scrollPosition
      }
    }

    // Delay to ensure component is fully rendered
    const timer = setTimeout(scrollToCurrentTime, 100)
    return () => clearTimeout(timer)
  }, [currentDate])
  
  console.log('🗓️ AgendaViewWeek dados:', { currentDate, weekStart, days: days.length, timeSlots: timeSlots.length })

  const getSessionsForTimeSlot = (date: Date, timeSlot: { hour: number; minute: number }) => {
    return sessions.filter(session => {
      const [sessionHour, sessionMinute] = session.horario.split(':').map(Number)
      return session.data === format(date, 'yyyy-MM-dd') && 
             sessionHour === timeSlot.hour && 
             (sessionMinute === timeSlot.minute || (sessionMinute >= timeSlot.minute && sessionMinute < timeSlot.minute + 30))
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'realizada':
        return { backgroundColor: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success) / 0.2)' }
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getGoogleEventsForTimeSlot = (date: Date, timeSlot: { hour: number; minute: number }) => {
    return googleEvents.filter(event => {
      if (!event.start?.dateTime) return false
      const eventDate = new Date(event.start.dateTime)
      const eventHour = eventDate.getHours()
      const eventMinute = eventDate.getMinutes()
      return isSameDay(eventDate, date) && 
             eventHour === timeSlot.hour && 
             eventMinute >= timeSlot.minute && 
             eventMinute < timeSlot.minute + 30
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
          {/* Header com dias da semana - fixo */}
          <div className="grid grid-cols-8 border-b border-border sticky top-0 z-20 bg-background">
            <div className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted">
              Horário
            </div>
            {days.map((day) => (
              <div key={day.getTime()} className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted">
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

          {/* Grid de horários com scroll */}
          <ScrollArea className="h-[600px]" ref={scrollAreaRef}>
            <div className="grid grid-cols-8">
              {timeSlots.map((timeSlot, index) => (
                <React.Fragment key={index}>
                  <div className="p-2 text-center text-xs text-muted-foreground bg-muted border-r border-border min-h-[60px] flex items-center justify-center">
                    <span className={cn(
                      "font-medium",
                      timeSlot.minute === 0 && "text-sm font-semibold"
                    )}>
                      {timeSlot.timeString}
                    </span>
                  </div>
                  {days.map((day) => {
                    const daySessions = getSessionsForTimeSlot(day, timeSlot)
                    const dayGoogleEvents = getGoogleEventsForTimeSlot(day, timeSlot)
                    return (
                      <div
                        key={`${day.getTime()}-${index}`}
                        className={cn(
                          "min-h-[60px] p-1 border border-border cursor-pointer hover:bg-accent/20 transition-colors relative",
                          isSameDay(day, new Date()) && "bg-primary/5"
                        )}
                        onClick={() => onCreateSession?.(day, timeSlot.timeString)}
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
                            const newTime = timeSlot.timeString
                            onDragSession(sessionId, newDate, newTime)
                          }
                        }}
                      >
                        {/* Current time red line for today only */}
                        {(() => {
                          const now = new Date()
                          const isToday = isSameDay(day, now)
                          const currentHour = now.getHours()
                          const currentMinute = now.getMinutes()
                          
                          if (isToday && currentHour === timeSlot.hour) {
                            // Show red line in the correct 30-minute slot
                            const isInCorrectSlot = timeSlot.minute === 0 ? 
                              currentMinute < 30 : currentMinute >= 30
                            
                            if (isInCorrectSlot) {
                              const slotMinute = timeSlot.minute === 0 ? currentMinute : currentMinute - 30
                              const currentTimePosition = (slotMinute / 30) * 100
                              return (
                                <div 
                                  className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                                  style={{ top: `${currentTimePosition}%` }}
                                >
                                  <div className="w-1 h-1 bg-red-500 rounded-full mr-1" />
                                  <div className="flex-1 h-0.5 bg-red-500" />
                                  <span className="text-xs text-red-500 ml-1 bg-white px-1 rounded text-[10px]">
                                    {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )
                            }
                          }
                          return null
                        })()}
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
                              <CardContent className="p-1.5">
                                <div className="flex items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span className="text-[10px] font-medium">{formatTimeBR(session.horario)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <User className="h-2.5 w-2.5" />
                                  <span className="text-[10px] truncate">
                                    {clients.find(c => c.id === session.client_id)?.nome || 'N/A'}
                                  </span>
                                </div>
                                
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDeleteSession(session.id)
                                    }}
                                  >
                                    <Trash className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {/* Google Events */}
                          {dayGoogleEvents.map((event) => (
                            <div
                              key={event.id}
                              className="text-[10px] p-1 rounded bg-blue-50 text-blue-700 border border-blue-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}