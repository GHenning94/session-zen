import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Edit, Trash } from 'lucide-react'
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSmartData } from '@/hooks/useSmartData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SessionEditModal } from '@/components/SessionEditModal'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export const AgendaViews = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const smartSessionData = useSmartData({ type: 'sessions' })
  const smartClientData = useSmartData({ type: 'clients' })
  const sessions = smartSessionData.data || []
  const clients = smartClientData.data || []
  const loading = smartSessionData.isLoading || smartClientData.isLoading
  const calendarRef = useRef<HTMLDivElement>(null)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [draggedSession, setDraggedSession] = useState<any>(null)
  const { toast } = useToast()

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.data)
      return isSameDay(sessionDate, date)
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

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ data: format(newDate, 'yyyy-MM-dd') })
        .eq('id', draggedSession.id)

      if (error) throw error

      toast({
        title: "Sessão movida com sucesso",
        description: `Sessão reagendada para ${format(newDate, 'dd/MM/yyyy')}`,
      })

      setDraggedSession(null)
    } catch (error) {
      console.error('Erro ao mover sessão:', error)
      toast({
        title: "Erro ao mover sessão",
        description: "Não foi possível reagendar a sessão.",
        variant: "destructive",
      })
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
    } catch (error) {
      console.error('Erro ao excluir sessão:', error)
      toast({
        title: "Erro ao excluir sessão",
        description: "Não foi possível excluir a sessão.",
        variant: "destructive",
      })
    }
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
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{session.horario}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {clients.find(c => c.id === session.client_id)?.nome || 'Cliente não encontrado'}
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

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        renderMonthView()
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
    </div>
  )
}