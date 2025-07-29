import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, Edit, Trash2 } from "lucide-react"
import { Layout } from "@/components/Layout"
import { useSmartData } from "@/hooks/useSmartData"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { NewSessionModal } from "@/components/NewSessionModal"
import { SessionEditModal } from "@/components/SessionEditModal"

interface Session {
  id: string
  data: string
  horario: string
  client_id: string
  status: string
  valor?: number
  anotacoes?: string
  clients?: {
    nome: string
    email?: string
    telefone?: string
  }
}

const AgendaViews = () => {
  const sessionData = useSmartData({ type: 'sessions' })
  const clientData = useSmartData({ type: 'clients' })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [isEditSessionOpen, setIsEditSessionOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  useEffect(() => {
    sessionData.refresh()
    clientData.refresh()
  }, [])

  const sessions = sessionData.data || []
  const clients = clientData.data || []

  const getSessionsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return sessions.filter(session => session.data === dateStr)
      .sort((a, b) => a.horario.localeCompare(b.horario))
  }

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session)
    setIsEditSessionOpen(true)
  }

  const handleDateClick = (date: Date) => {
    setCurrentDate(date)
    setIsNewSessionOpen(true)
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-muted-foreground bg-muted/50">
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const daySessionsData = getSessionsForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={index}
              className={`min-h-24 p-1 border border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''
              } ${isToday ? 'bg-primary/10 border-primary' : ''}`}
              onClick={() => handleDateClick(day)}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {daySessionsData.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionClick(session)
                    }}
                    className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                      session.status === 'realizada' 
                        ? 'bg-success/20 text-success border border-success/30' 
                        : session.status === 'cancelada'
                        ? 'bg-destructive/20 text-destructive border border-destructive/30'
                        : 'bg-primary/20 text-primary border border-primary/30'
                    }`}
                  >
                    <div className="font-medium truncate">
                      {session.horario}
                    </div>
                    <div className="truncate">
                      {session.clients?.nome || 'Cliente'}
                    </div>
                  </div>
                ))}
                {daySessionsData.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{daySessionsData.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const daySessionsData = getSessionsForDate(day)
          const isToday = isSameDay(day, new Date())

          return (
            <div key={day.toString()} className="space-y-2">
              <div className={`text-center p-2 rounded ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <div className="font-medium">{format(day, 'EEE', { locale: ptBR })}</div>
                <div className="text-sm">{format(day, 'd')}</div>
              </div>
              <div 
                className="min-h-96 p-2 border border-border rounded cursor-pointer hover:bg-accent/50"
                onClick={() => handleDateClick(day)}
              >
                {daySessionsData.map((session) => (
                  <div
                    key={session.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionClick(session)
                    }}
                    className={`text-sm p-2 mb-2 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                      session.status === 'realizada' 
                        ? 'bg-success/20 text-success border border-success/30' 
                        : session.status === 'cancelada'
                        ? 'bg-destructive/20 text-destructive border border-destructive/30'
                        : 'bg-primary/20 text-primary border border-primary/30'
                    }`}
                  >
                    <div className="font-medium">{session.horario}</div>
                    <div className="truncate">{session.clients?.nome || 'Cliente'}</div>
                    {session.valor && (
                      <div className="text-xs">R$ {session.valor.toFixed(2)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDayView = () => {
    const daySessionsData = getSessionsForDate(currentDate)
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="space-y-1">
        {hours.map((hour) => {
          const hourStr = hour.toString().padStart(2, '0')
          const hourSessions = daySessionsData.filter(session => 
            session.horario.startsWith(hourStr)
          )

          return (
            <div key={hour} className="flex border-b border-border">
              <div className="w-16 p-2 text-sm text-muted-foreground bg-muted/50">
                {hourStr}:00
              </div>
              <div 
                className="flex-1 min-h-12 p-2 hover:bg-accent/50 cursor-pointer"
                onClick={() => handleDateClick(currentDate)}
              >
                {hourSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSessionClick(session)
                    }}
                    className={`p-2 mb-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                      session.status === 'realizada' 
                        ? 'bg-success/20 text-success border border-success/30' 
                        : session.status === 'cancelada'
                        ? 'bg-destructive/20 text-destructive border border-destructive/30'
                        : 'bg-primary/20 text-primary border border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{session.horario}</div>
                        <div>{session.clients?.nome || 'Cliente'}</div>
                      </div>
                      <Badge variant={session.status === 'realizada' ? 'default' : 'secondary'}>
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie suas sessões - clique para editar
            </p>
          </div>
          <Button 
            onClick={() => setIsNewSessionOpen(true)}
            className="bg-gradient-primary hover:opacity-90"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>

        {/* Controls */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentDate(addDays(currentDate, view === 'day' ? -1 : view === 'week' ? -7 : -30))}
                >
                  Anterior
                </Button>
                <h2 className="text-xl font-semibold">
                  {view === 'month' && format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  {view === 'week' && `${format(startOfWeek(currentDate), 'dd/MM')} - ${format(endOfWeek(currentDate), 'dd/MM/yyyy')}`}
                  {view === 'day' && format(currentDate, 'dd/MM/yyyy', { locale: ptBR })}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setCurrentDate(addDays(currentDate, view === 'day' ? 1 : view === 'week' ? 7 : 30))}
                >
                  Próximo
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
                <Select value={view} onValueChange={(value: 'day' | 'week' | 'month') => setView(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Legenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary/20 border border-primary/30 rounded"></div>
                <span>Agendada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-success/20 border border-success/30 rounded"></div>
                <span>Realizada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-destructive/20 border border-destructive/30 rounded"></div>
                <span>Cancelada</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <NewSessionModal
        open={isNewSessionOpen}
        onOpenChange={setIsNewSessionOpen}
        onSessionCreated={() => sessionData.refresh()}
      />

      {selectedSession && (
        <SessionEditModal
          open={isEditSessionOpen}
          onOpenChange={setIsEditSessionOpen}
          session={selectedSession}
          clients={clients}
          onSessionUpdated={() => sessionData.refresh()}
        />
      )}
    </Layout>
  )
}

export default AgendaViews