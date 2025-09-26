import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Edit, Trash, Plus } from 'lucide-react'
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSmartData } from '@/hooks/useSmartData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SessionEditModal } from '@/components/SessionEditModal'
import { NewSessionModal } from '@/components/NewSessionModal'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AgendaViewDay } from './AgendaViewDay'
import { AgendaViewWeek } from './AgendaViewWeek'
import { formatTimeBR } from '@/utils/formatters'

export const AgendaViews = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const smartSessionData = useSmartData({ type: 'sessions' })
  const smartClientData = useSmartData({ type: 'clients' })
  
  // Memoizar dados para evitar re-renders desnecessários
  const sessions = React.useMemo(() => {
    if (!smartSessionData.data) return []
    return Array.isArray(smartSessionData.data) ? smartSessionData.data : []
  }, [smartSessionData.data])

  const clients = React.useMemo(() => {
    if (!smartClientData.data) return []
    return Array.isArray(smartClientData.data) ? smartClientData.data : []
  }, [smartClientData.data])

  const loading = smartSessionData.isLoading || smartClientData.isLoading
  const calendarRef = useRef<HTMLDivElement>(null)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [draggedSession, setDraggedSession] = useState<any>(null)
  const { toast } = useToast()

  // Configurar realtime para atualizar dados automaticamente
  useEffect(() => {
    const channel = supabase
      .channel('agenda-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        () => {
          smartSessionData.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => {
      return session.data === format(date, 'yyyy-MM-dd')
    })
  }

  const handleDragStart = (e: React.DragEvent, session: any) => {
    setDraggedSession(session)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newDate: Date) => {
    e.preventDefault()
    
    if (!draggedSession) return

    const originalDate = draggedSession.data
    const newDateString = format(newDate, 'yyyy-MM-dd')

    // Se for a mesma data, não fazer nada
    if (originalDate === newDateString) {
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
        title: "Sessão reagendada",
        description: `Movida para ${format(newDate, 'dd/MM/yyyy')}`,
      })

      setDraggedSession(null)
      smartSessionData.refresh()

    } catch (error) {
      console.error('Erro ao mover sessão:', error)
      
      toast({
        title: "Erro",
        description: "Falha ao reagendar",
        variant: "destructive",
      })
      setDraggedSession(null)
    }
  }

  const handleEditSession = (session: any) => {
    setSelectedSession(session)
    setIsEditModalOpen(true)
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      toast({
        title: "Sessão excluída",
        description: "A sessão foi removida com sucesso.",
      })
      smartSessionData.refresh()
    } catch (error) {
      console.error('Erro ao excluir sessão:', error)
      toast({
        title: "Erro ao excluir sessão",
        description: "Não foi possível excluir a sessão.",
        variant: "destructive",
      })
    }
  }

  const handleCreateSession = (date: Date) => {
    setSelectedDate(date)
    setIsNewSessionModalOpen(true)
  }

  const renderMonthView = () => {
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
      <div className="w-full" ref={calendarRef}>
        {/* Header with weekday names */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="p-4 text-center text-sm font-medium text-muted-foreground bg-muted">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border">
          {daysInCalendar.map((date, index) => {
            const daySessionsData = getSessionsForDate(date)
            return (
              <div
                key={date.getTime()}
                className={cn(
                  "min-h-[120px] border border-border p-2 bg-background",
                  !isSameMonth(date, currentDate) && "text-muted-foreground bg-muted/50",
                  isSameDay(date, new Date()) && "bg-accent/50"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                <div className="font-medium text-sm mb-2">
                  {format(date, 'd')}
                </div>
                
                <div className="space-y-1">
                  {daySessionsData.map((session) => (
                    <div 
                      key={`${date.getDate()}-${session.id}`}
                      className="text-xs p-2 rounded bg-primary/10 text-primary cursor-move hover:bg-primary/20 transition-colors group relative"
                      draggable
                      onDragStart={(e) => handleDragStart(e, session)}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeBR(session.horario)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">
                            {clients.find(c => c.id === session.client_id)?.nome || 'Cliente não encontrado'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditSession(session)
                          }}
                          className="p-1 bg-background rounded shadow hover:bg-accent"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(session.id)
                          }}
                          className="p-1 bg-background rounded shadow hover:bg-accent text-destructive"
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
  }

  return (
    <div className="space-y-4">
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
            variant={view === 'day' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setView('day')}
          >
            Dia
          </Button>
          <Button 
            variant={view === 'week' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setView('week')}
          >
            Semana
          </Button>
          <Button 
            variant={view === 'month' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setView('month')}
          >
            Mês
          </Button>
        </div>
      </div>

      {loading && sessions.length === 0 && clients.length === 0 ? (
        <div className="text-center py-8">Carregando dados...</div>
      ) : (
        <>
          {view === 'month' && renderMonthView()}
          {view === 'week' && (
            <AgendaViewWeek
              currentDate={currentDate}
              sessions={sessions}
              clients={clients}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onCreateSession={handleCreateSession}
            />
          )}
          {view === 'day' && (
            <AgendaViewDay
              currentDate={currentDate}
              sessions={sessions}
              clients={clients}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onCreateSession={handleCreateSession}
            />
          )}
        </>
      )}

      {/* Session Edit Modal */}
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

      {/* New Session Modal */}
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