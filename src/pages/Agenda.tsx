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
import { SessionModal } from "@/components/SessionModal"
import { UpgradeModal } from "@/components/UpgradeModal"
import { NewFeatureBadge } from "@/components/NewFeatureBadge"
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Link,
  Lock,
  Crown
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
  const { canAddSession, planLimits, hasAccessToFeature } = useSubscription()
  const [showGoogleUpgradeModal, setShowGoogleUpgradeModal] = useState(false)
  
  // Usar o novo hook centralizado para dados do calendário
  const {
    sessions,
    clients,
    packages,
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
    getClientName,
    refreshData
  } = useCalendarData()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('month')
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any>(null)
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [showReactivationMessage, setShowReactivationMessage] = useState(false)
  const [prefilledTime, setPrefilledTime] = useState<string>("")

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
    setSelectedDate(date)
    setPrefilledTime(time || "")
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
      <div className="space-y-4 md:space-y-6">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus agendamentos
            </p>
          </div>
          <Button 
            className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none"
            size="sm"
            onClick={() => setIsNewSessionOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Sessão
          </Button>
        </div>

        {/* Session Modal */}
        <SessionModal
          open={isNewSessionOpen}
          onOpenChange={setIsNewSessionOpen}
          session={editingSession}
          selectedDate={selectedDate}
          prefilledTime={prefilledTime}
          onSuccess={() => {
            setIsNewSessionOpen(false)
            setEditingSession(null)
            setPrefilledTime("")
            refreshData() // Reload data to show the new session immediately
          }}
        />

        {/* Navigation - Mobile optimized */}
        <div className="space-y-3">
          {/* Date Navigation - Desktop layout */}
          <div className="hidden md:flex items-center justify-between gap-2">
            {/* Left side - Period navigation arrows + Hoje */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => navigateDate('prev')}
                disabled={isLoading}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => navigateDate('next')}
                disabled={isLoading}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedDate(new Date())}
                disabled={isLoading}
              >
                Hoje
              </Button>
            </div>
            
            {/* Center - Date display */}
            <div className="text-center flex-1 min-w-0">
              <div className="text-lg font-semibold truncate">
                {currentView === 'month' && format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                {currentView === 'week' && `${format(selectedDate, "dd/MM", { locale: ptBR })} - ${format(addDays(selectedDate, 6), "dd/MM/yyyy", { locale: ptBR })}`}
                {currentView === 'day' && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>
            
            {/* Right side - Google Calendar, View Selector */}
            <div className="flex items-center gap-2">
              {/* Google Calendar Integration */}
              {isGoogleConnected ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-success/10 text-success border-success/20 hover:bg-success/20"
                  >
                    <Link className="h-4 w-4 mr-1" />
                    Google Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
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
              ) : hasAccessToFeature('google_calendar') ? (
                <div 
                  className="flex items-center gap-2 shrink-0"
                  onMouseEnter={() => {
                    // Dismiss the badge when hovering over the container
                    const { dismissFeatureBadge } = require('@/components/NewFeatureBadge')
                    dismissFeatureBadge('google_calendar')
                  }}
                >
                  <NewFeatureBadge featureKey="google_calendar" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={connectToGoogle}
                    disabled={isLoading}
                  >
                    <Link className="h-4 w-4 mr-1" />
                    Conectar Google Calendar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="warning" className="text-[9px] px-1.5 py-0.5 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" />
                    Premium
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setShowGoogleUpgradeModal(true)}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Google Calendar
                  </Button>
                </div>
              )}

              {/* View Selector */}
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'day' | 'week' | 'month')} className="shrink-0">
                <TabsList className="h-9">
                  <TabsTrigger value="day" className="text-sm px-3 h-8">Dia</TabsTrigger>
                  <TabsTrigger value="week" className="text-sm px-3 h-8">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="text-sm px-3 h-8">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Date Navigation - Mobile layout */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => navigateDate('prev')}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {currentView === 'month' && format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  {currentView === 'week' && `${format(selectedDate, "dd/MM", { locale: ptBR })} - ${format(addDays(selectedDate, 6), "dd/MM/yyyy", { locale: ptBR })}`}
                  {currentView === 'day' && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => navigateDate('next')}
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedDate(new Date())}
                disabled={isLoading}
              >
                Hoje
              </Button>
            </div>

            {/* Controls Row - Scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {/* Google Calendar Integration */}
              {isGoogleConnected ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-success/10 text-success border-success/20 hover:bg-success/20 text-xs px-2"
                  >
                    <Link className="h-3 w-3 mr-1" />
                    <span className="sm:hidden">Google</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={loadGoogleEvents}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2"
                    onClick={disconnectFromGoogle}
                  >
                    X
                  </Button>
                </div>
              ) : hasAccessToFeature('google_calendar') ? (
                <div className="flex items-center gap-1.5 shrink-0 group/googlebtn">
                  <NewFeatureBadge featureKey="google_calendar" className="group-hover/googlebtn:hidden" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={connectToGoogle}
                    disabled={isLoading}
                  >
                    <Link className="h-3 w-3 mr-1" />
                    Google
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="warning" className="text-[8px] px-1 py-0 flex items-center gap-0.5">
                    <Crown className="w-2 h-2" />
                    Premium
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setShowGoogleUpgradeModal(true)}
                  >
                    <Lock className="h-3 w-3" />
                    Google
                  </Button>
                </div>
              )}

              {/* View Selector */}
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'day' | 'week' | 'month')} className="shrink-0 ml-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="day" className="text-xs px-2 h-7">Dia</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-2 h-7">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2 h-7">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Agenda Views */}
        <div className="space-y-4">
          {currentView === 'day' && (
            <AgendaViewDay
              currentDate={selectedDate}
              sessions={sessions}
              clients={clients}
              packages={packages}
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
              packages={packages}
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
              packages={packages}
              googleEvents={googleEvents}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onCreateSession={handleCreateSession}
              onDragSession={handleDragSession}
              onDateSelect={setSelectedDate}
              onSwitchToWeekView={(date) => {
                setSelectedDate(date)
                setCurrentView('week')
              }}
              highlightedSessionId={highlightedSessionId}
            />
          )}
        </div>

        {/* Resumo do Dia - Mobile vertical layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          <Card className="shadow-soft">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-3">
              <CardTitle className="text-sm md:text-lg">Sessões Hoje</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold text-primary">{todaySessionsStats.todaySessionsCount}</div>
              <p className="text-xs md:text-sm text-muted-foreground">Total de atendimentos</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-3">
              <CardTitle className="text-sm md:text-lg">Receita Prevista</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold text-success">
                R$ {todaySessionsStats.todayRevenue.toFixed(2)}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Valor total do dia</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-3">
              <CardTitle className="text-sm md:text-lg">Taxa de Ocupação</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold text-warning">
                {todaySessionsStats.occupationRate}%
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">{todaySessionsStats.todaySessionsCount} de {timeSlots.length} horários</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Upgrade para Google Calendar */}
      <UpgradeModal
        open={showGoogleUpgradeModal}
        onOpenChange={setShowGoogleUpgradeModal}
        feature="Integração Google Calendar"
        premiumOnly
      />
    </Layout>
  )
}

export default Agenda