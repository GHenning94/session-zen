import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Edit, Trash } from 'lucide-react'
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSmartData } from '@/hooks/useSmartData'
import { SessionEditModal } from '@/components/SessionEditModal'
import { NewSessionModal } from '@/components/NewSessionModal'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatTimeBR } from '@/utils/formatters'

export const OptimizedAgendaViews = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const smartSessionData = useSmartData({ type: 'sessions' })
  const smartClientData = useSmartData({ type: 'clients' })
  
  const { toast } = useToast()
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [draggedSession, setDraggedSession] = useState<any>(null)

  // Memoizar dados para performance
  const sessions = useMemo(() => 
    Array.isArray(smartSessionData.data) ? smartSessionData.data : [],
    [smartSessionData.data]
  )

  const clients = useMemo(() => 
    Array.isArray(smartClientData.data) ? smartClientData.data : [],
    [smartClientData.data]
  )

  // Memoizar sessões por data
  const sessionsByDate = useMemo(() => {
    const map = new Map()
    sessions.forEach(session => {
      const dateKey = session.data
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey).push(session)
    })
    return map
  }, [sessions])

  const getSessionsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return sessionsByDate.get(dateKey) || []
  }, [sessionsByDate])

  // Handlers otimizados
  const handleDragStart = useCallback((e: React.DragEvent, session: any) => {
    setDraggedSession(session)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, newDate: Date) => {
    e.preventDefault()
    
    if (!draggedSession) return

    const newDateString = format(newDate, 'yyyy-MM-dd')
    if (draggedSession.data === newDateString) {
      setDraggedSession(null)
      return
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ data: newDateString })
        .eq('id', draggedSession.id)

      if (error) throw error

      toast({
        title: "Reagendado",
        description: `Movido para ${format(newDate, 'dd/MM/yyyy')}`,
      })

      setDraggedSession(null)
      smartSessionData.refresh()
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: "Erro",
        description: "Falha ao reagendar",
        variant: "destructive",
      })
      setDraggedSession(null)
    }
  }, [draggedSession, toast, smartSessionData])

  const handleEditSession = useCallback((session: any) => {
    setSelectedSession(session)
    setIsEditModalOpen(true)
  }, [])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      toast({
        title: "Excluída",
        description: "Sessão removida",
      })
      smartSessionData.refresh()
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: "Erro",
        description: "Falha ao excluir",
        variant: "destructive",
      })
    }
  }, [toast, smartSessionData])

  const handleCreateSession = useCallback((date: Date) => {
    setSelectedDate(date)
    setIsNewSessionModalOpen(true)
  }, [])

  // Renderizar visualização do mês otimizada
  const renderMonthView = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 0 })
    
    const daysInCalendar = []
    let currentDay = calendarStart
    
    while (currentDay <= calendarEnd) {
      daysInCalendar.push(currentDay)
      currentDay = addDays(currentDay, 1)
    }

    return (
      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="p-4 text-center text-sm font-medium text-muted-foreground bg-muted">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-7 gap-px bg-border">
          {daysInCalendar.map((date) => {
            const daySessionsData = getSessionsForDate(date)
            return (
              <div
                key={date.getTime()}
                className={cn(
                  "min-h-[120px] border border-border p-2 bg-background cursor-pointer",
                  !isSameMonth(date, currentDate) && "text-muted-foreground bg-muted/50",
                  isSameDay(date, new Date()) && "bg-accent/50"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
                onClick={() => handleCreateSession(date)}
              >
                <div className="font-medium text-sm mb-2">
                  {format(date, 'd')}
                </div>
                
                <div className="space-y-1">
                  {daySessionsData.map((session) => (
                    <div 
                      key={session.id}
                      className="text-xs p-2 rounded bg-primary/10 text-primary cursor-move hover:bg-primary/20 transition-colors group relative"
                      draggable
                      onDragStart={(e) => handleDragStart(e, session)}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditSession(session)
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeBR(session.horario)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {clients.find(c => c.id === session.client_id)?.nome || 'Cliente'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {session.status}
                      </Badge>
                      
                      {/* Action buttons */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditSession(session)
                          }}
                          className="p-1 bg-white rounded shadow hover:bg-gray-50"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(session.id)
                          }}
                          className="p-1 bg-white rounded shadow hover:bg-gray-50 text-red-600"
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [currentDate, getSessionsForDate, clients, handleDragOver, handleDrop, handleCreateSession, handleDragStart, handleEditSession, handleDeleteSession])

  const loading = smartSessionData.isLoading || smartClientData.isLoading

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={view === 'month' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setView('month')}
          >
            Mês
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        renderMonthView
      )}

      {/* Modals */}
      {selectedSession && (
        <SessionEditModal
          session={selectedSession}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          clients={clients}
          onSessionUpdated={() => {
            setIsEditModalOpen(false)
            setSelectedSession(null)
            smartSessionData.refresh()
          }}
        />
      )}

      <NewSessionModal
        open={isNewSessionModalOpen}
        onOpenChange={setIsNewSessionModalOpen}
        selectedDate={selectedDate}
        onSessionCreated={() => {
          setIsNewSessionModalOpen(false)
          setSelectedDate(null)
          smartSessionData.refresh()
        }}
      />
    </div>
  )
}