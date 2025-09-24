import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layout } from "@/components/Layout"
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Link
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSubscription } from "@/hooks/useSubscription"
import { useCalendarData } from "@/hooks/useCalendarData"
import { AgendaViewDay } from "@/components/agenda/AgendaViewDay"
import { AgendaViewWeek } from "@/components/agenda/AgendaViewWeek"
import AgendaViewMonth from "@/components/agenda/AgendaViewMonth"
import { cn } from "@/lib/utils"
import { format, addDays, subDays, addMonths, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/integrations/supabase/client"

const Agenda = () => {
  const { toast } = useToast()
  const { canAddSession, planLimits } = useSubscription()
  
  // Usar o novo hook centralizado para dados do calendário
  const {
    sessions,
    clients,
    googleEvents,
    isLoading,
    isGoogleConnected,
    connectToGoogle,
    disconnectFromGoogle,
    loadGoogleEvents,
    createSession,
    updateSession,
    deleteSession,
    moveSession,
    getClientName
  } = useCalendarData()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('month')
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any>(null)
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showReactivationMessage, setShowReactivationMessage] = useState(false)

  // Formulário para nova sessão
  const [newSession, setNewSession] = useState({
    client_id: "",
    data: "",
    horario: "",
    valor: "",
    anotacoes: ""
  })

  // Check for highlighted session from URL params
  useEffect(() => {
    const highlightParam = searchParams.get('highlight')
    const dateParam = searchParams.get('date')
    
    if (highlightParam) {
      setHighlightedSessionId(highlightParam)
      
      // Set the date if provided
      if (dateParam) {
        setSelectedDate(new Date(dateParam))
      } else {
        // Try to find the session date from loaded sessions
        const session = sessions.find(s => s.id === highlightParam)
        if (session) {
          setSelectedDate(new Date(session.data))
        }
      }
      
      // Clear the URL parameters
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, sessions])

  const handleSaveSession = async () => {
    if (!newSession.client_id || !newSession.data || !newSession.horario) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, data e horário.",
        variant: "destructive"
      })
      return
    }

    // Validação de limite de sessões por cliente
    const clientSessions = sessions.filter(s => s.client_id === newSession.client_id).length
    if (!editingSession && !canAddSession(clientSessions)) {
      toast({
        title: "Limite Atingido",
        description: `Limite de ${planLimits.maxSessionsPerClient === Infinity ? '∞' : planLimits.maxSessionsPerClient} sessões por cliente atingido.`,
        variant: "destructive"
      })
      return
    }

    // Verificar se o cliente está inativo e reativá-lo se necessário
    const selectedClient = clients.find(c => c.id === newSession.client_id)
    if (selectedClient && !selectedClient.ativo) {
      await supabase.from('clients')
        .update({ ativo: true })
        .eq('id', newSession.client_id)
      
      toast({
        title: "Cliente reativado",
        description: "O cliente foi reativado automaticamente.",
      })
    }

    const sessionData = {
      client_id: newSession.client_id,
      data: newSession.data,
      horario: newSession.horario,
      valor: newSession.valor ? parseFloat(newSession.valor) : undefined,
      anotacoes: newSession.anotacoes,
      status: editingSession?.status || 'agendada'
    }

    let success = false
    if (editingSession) {
      success = await updateSession(editingSession.id, sessionData)
    } else {
      success = await createSession(sessionData)
    }

    if (success) {
      setNewSession({
        client_id: "",
        data: "",
        horario: "",
        valor: "",
        anotacoes: ""
      })
      setEditingSession(null)
      setIsNewSessionOpen(false)
      setShowReactivationMessage(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId)
  }

  const handleEditSession = (session: any) => {
    // Clear highlight when session is clicked
    setHighlightedSessionId(null)
    setEditingSession(session)
    setNewSession({
      client_id: session.client_id,
      data: session.data,
      horario: session.horario,
      valor: session.valor?.toString() || "",
      anotacoes: session.anotacoes || ""
    })
    setIsNewSessionOpen(true)
  }

  const handleDragSession = async (sessionId: string, newDate: string, newTime?: string) => {
    await moveSession(sessionId, newDate, newTime)
  }

  const handleCreateSession = (date: Date, time?: string) => {
    setEditingSession(null)
    setNewSession({
      client_id: "",
      data: date.toISOString().split('T')[0],
      horario: time || "",
      valor: "",
      anotacoes: ""
    })
    setShowReactivationMessage(false)
    setIsNewSessionOpen(true)
  }

  const handleClientChange = (value: string) => {
    setNewSession({...newSession, client_id: value})
    
    // Verificar se o cliente selecionado está inativo
    const selectedClient = clients.find(c => c.id === value)
    setShowReactivationMessage(selectedClient && !selectedClient.ativo)
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (currentView === 'day') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1))
    } else if (currentView === 'week') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 7) : subDays(selectedDate, 7))
    } else {
      setSelectedDate(direction === 'next' ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1))
    }
  }

  const timeSlots = [
    "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30",
    "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
  ]

  // Calcular estatísticas baseadas na data de hoje (sempre hoje, não a data selecionada) - useMemo para reatividade
  const todaySessionsStats = useMemo(() => {
    console.log('🔄 Recalculando estatísticas, sessions length:', sessions.length)
    const today = new Date()
    const todayFormatted = format(today, 'yyyy-MM-dd')
    
    const todaySessionsData = sessions.filter(session => {
      return session.data === todayFormatted
    })
    
    console.log('📊 Sessões de hoje encontradas:', todaySessionsData.length, 'para data:', todayFormatted)
    
    const todaySessionsCount = todaySessionsData.length
    const todayRevenue = todaySessionsData.reduce((sum, s) => sum + (s.valor || 0), 0)
    const occupationRate = timeSlots.length > 0 ? ((todaySessionsCount / timeSlots.length) * 100).toFixed(0) : 0
    
    return {
      todaySessionsData,
      todaySessionsCount,
      todayRevenue,
      occupationRate
    }
  }, [sessions, timeSlots.length])

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie seus agendamentos e sessões
            </p>
          </div>
          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Sessão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSession ? "Editar Sessão" : "Agendar Nova Sessão"}
                </DialogTitle>
                <DialogDescription>
                  {editingSession ? "Modifique os dados da sessão" : "Preencha os dados para criar um novo agendamento"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={newSession.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            <span>{client.nome}</span>
                            {!client.ativo && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                inativo
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showReactivationMessage && (
                    <div className="text-sm p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                      Ao agendar, este cliente será reativado automaticamente.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Data</Label>
                    <Input 
                      type="date" 
                      id="date" 
                      value={newSession.data}
                      onChange={(e) => setNewSession({...newSession, data: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time">Horário</Label>
                    <Select value={newSession.horario} onValueChange={(value) => setNewSession({...newSession, horario: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Valor (opcional)</Label>
                  <Input 
                    type="number" 
                    id="value" 
                    placeholder="200.00"
                    value={newSession.valor}
                    onChange={(e) => setNewSession({...newSession, valor: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Notas sobre a sessão..." 
                    className="resize-none"
                    value={newSession.anotacoes}
                    onChange={(e) => setNewSession({...newSession, anotacoes: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-gradient-primary hover:opacity-90" 
                  onClick={handleSaveSession}
                  disabled={isLoading}
                >
                  {isLoading ? "Salvando..." : editingSession ? "Atualizar Sessão" : "Salvar Sessão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Navigation and Google Calendar Integration */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-lg font-semibold px-4">
              {currentView === 'month' && format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
              {currentView === 'week' && `${format(selectedDate, "dd/MM", { locale: ptBR })} - ${format(addDays(selectedDate, 6), "dd/MM/yyyy", { locale: ptBR })}`}
              {currentView === 'day' && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              disabled={isLoading}
            >
              Hoje
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Google Calendar Integration */}
            {isGoogleConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" style={{ backgroundColor: 'hsl(142 71% 45% / 0.1)', color: 'hsl(142 71% 45%)' }}>
                  <Link className="h-3 w-3 mr-1" />
                  Google Calendar
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadGoogleEvents}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectFromGoogle}
                >
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={connectToGoogle}
                disabled={isLoading}
              >
                <Link className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>
            )}

            {/* View Selector */}
            <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'day' | 'week' | 'month')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Agenda Views */}
        <div className="space-y-4">
          {currentView === 'day' && (
            <AgendaViewDay
              currentDate={selectedDate}
              sessions={sessions}
              clients={clients}
              googleEvents={googleEvents}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onCreateSession={handleCreateSession}
              onDragSession={handleDragSession}
              highlightedSessionId={highlightedSessionId}
            />
          )}

          {currentView === 'week' && (
            <AgendaViewWeek
              currentDate={selectedDate}
              sessions={sessions}
              clients={clients}
              googleEvents={googleEvents}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onCreateSession={handleCreateSession}
              onDragSession={handleDragSession}
              highlightedSessionId={highlightedSessionId}
            />
          )}

          {currentView === 'month' && (
            <AgendaViewMonth
              selectedDate={selectedDate}
              sessions={sessions}
              clients={clients}
              googleEvents={googleEvents}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onCreateSession={handleCreateSession}
              onDragSession={handleDragSession}
              onDateSelect={setSelectedDate}
              highlightedSessionId={highlightedSessionId}
            />
          )}
        </div>

        {/* Resumo do Dia */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sessões Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{todaySessionsStats.todaySessionsCount}</div>
              <p className="text-sm text-muted-foreground">Total de atendimentos</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Receita Prevista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'hsl(142 71% 45%)' }}>
                R$ {todaySessionsStats.todayRevenue.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Valor total do dia</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Taxa de Ocupação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {todaySessionsStats.occupationRate}%
              </div>
              <p className="text-sm text-muted-foreground">{todaySessionsStats.todaySessionsCount} de {timeSlots.length} horários</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default Agenda