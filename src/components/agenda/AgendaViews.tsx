import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Grid, List, User, Plus, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type ViewType = 'month' | 'week' | 'day'

interface AgendaViewsProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  sessions: any[]
  clients: any[]
  getClientName: (clientId: string) => string
  onNewSession: (time?: string, date?: Date) => void
  onDeleteSession: (sessionId: string) => void
  timeSlots: string[]
}

const AgendaViews = ({ 
  selectedDate, 
  setSelectedDate, 
  sessions, 
  clients, 
  getClientName,
  onNewSession,
  onDeleteSession,
  timeSlots 
}: AgendaViewsProps) => {
  const [currentView, setCurrentView] = useState<ViewType>('day')

  const addDays = (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  const addWeeks = (date: Date, weeks: number) => {
    return addDays(date, weeks * 7)
  }

  const addMonths = (date: Date, months: number) => {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }

  const getNavigationLabel = () => {
    switch (currentView) {
      case 'month':
        return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      case 'week':
        const weekStart = getWeekStart(selectedDate)
        const weekEnd = addDays(weekStart, 6)
        return `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
      case 'day':
        return selectedDate.toLocaleDateString('pt-BR', { 
          weekday: 'long', 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        })
    }
  }

  const handlePrevious = () => {
    switch (currentView) {
      case 'month':
        setSelectedDate(addMonths(selectedDate, -1))
        break
      case 'week':
        setSelectedDate(addWeeks(selectedDate, -1))
        break
      case 'day':
        setSelectedDate(addDays(selectedDate, -1))
        break
    }
  }

  const handleNext = () => {
    switch (currentView) {
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1))
        break
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1))
        break
      case 'day':
        setSelectedDate(addDays(selectedDate, 1))
        break
    }
  }

  const getWeekStart = (date: Date) => {
    const result = new Date(date)
    const day = result.getDay()
    const diff = result.getDate() - day
    return new Date(result.setDate(diff))
  }

  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return sessions.filter(session => session.data === dateStr)
  }

  const getSessionForDateTime = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0]
    return sessions.find(session => session.data === dateStr && session.horario === time)
  }

  const renderMonthView = () => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    const startDate = getWeekStart(monthStart)
    const endDate = addDays(getWeekStart(monthEnd), 6)
    
    const days = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      days.push(new Date(currentDate))
      currentDate = addDays(currentDate, 1)
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-muted-foreground border-b">
            {day}
          </div>
        ))}
        {days.map(day => {
          const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
          const isToday = day.toDateString() === new Date().toDateString()
          const isSelected = day.toDateString() === selectedDate.toDateString()
          const daySessions = getSessionsForDate(day)
          
          return (
            <div 
              key={day.toISOString()}
              className={`min-h-[100px] p-2 border cursor-pointer hover:bg-accent/50 transition-colors ${
                isCurrentMonth ? 'bg-background' : 'bg-muted/30'
              } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {daySessions.slice(0, 3).map(session => (
                  <div 
                    key={session.id}
                    className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded truncate"
                  >
                    {session.horario} - {getClientName(session.client_id)}
                  </div>
                ))}
                {daySessions.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{daySessions.length - 3} mais
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
    const weekStart = getWeekStart(selectedDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="grid grid-cols-8 gap-1">
        <div className="p-2"></div>
        {weekDays.map(day => {
          const isToday = day.toDateString() === new Date().toDateString()
          const isSelected = day.toDateString() === selectedDate.toDateString()
          
          return (
            <div 
              key={day.toISOString()}
              className={`p-2 text-center cursor-pointer hover:bg-accent/50 transition-colors border-b ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="text-xs text-muted-foreground">
                {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
              </div>
              <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
        
        {timeSlots.map(time => (
          <div key={time} className="contents">
            <div className="p-2 text-xs text-muted-foreground border-r">
              {time}
            </div>
            {weekDays.map(day => {
              const session = getSessionForDateTime(day, time)
              return (
                <div 
                  key={`${day.toISOString()}-${time}`}
                  className="min-h-[50px] p-1 border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => !session && onNewSession(time, day)}
                >
                  {session ? (
                    <div className="bg-primary/10 text-primary text-xs p-1 rounded h-full flex items-center justify-between">
                      <span className="truncate">{getClientName(session.client_id)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 ml-1">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background border shadow-lg z-50">
                          <DropdownMenuItem onClick={() => onDeleteSession(session.id)}>
                            Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  const renderDayView = () => {
    return (
      <div className="space-y-2">
        {timeSlots.map((time) => {
          const session = getSessionForDateTime(selectedDate, time)
          return (
            <div key={time} className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <div className="w-16 text-sm font-mono text-muted-foreground">
                {time}
              </div>
              <div className="flex-1">
                {session ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{getClientName(session.client_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          Sessão • 50 min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium text-sm">R$ {session.valor?.toFixed(2) || '0,00'}</p>
                        <Badge 
                          variant={session.status === 'agendada' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {session.status}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background border shadow-lg z-50">
                          <DropdownMenuItem onClick={() => onDeleteSession(session.id)}>
                            Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Horário disponível</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary"
                      onClick={() => onNewSession(time, selectedDate)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agendar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {getNavigationLabel()}
            </CardTitle>
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              <Button 
                variant={currentView === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('month')}
                className="h-8"
              >
                <Grid className="w-4 h-4 mr-1" />
                Mês
              </Button>
              <Button 
                variant={currentView === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('week')}
                className="h-8"
              >
                <List className="w-4 h-4 mr-1" />
                Semana
              </Button>
              <Button 
                variant={currentView === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('day')}
                className="h-8"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Dia
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handlePrevious}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
            >
              Hoje
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleNext}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && renderWeekView()}
        {currentView === 'day' && renderDayView()}
      </CardContent>
    </Card>
  )
}

export default AgendaViews