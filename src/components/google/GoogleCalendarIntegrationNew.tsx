import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useSubscription } from "@/hooks/useSubscription"
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync"
import { useConflictDetection } from "@/hooks/useConflictDetection"
import { useActionHistory } from "@/hooks/useActionHistory"
import { PlanProtection } from "@/components/PlanProtection"
import { GoogleEventCard } from "./GoogleEventCard"
import { PlatformSessionCard } from "./PlatformSessionCard"
import { ConflictDetectionPanel } from "./ConflictDetectionPanel"
import { SeriesSelectionModal } from "./SeriesSelectionModal"
import { ActionHistoryPanel } from "./ActionHistoryPanel"
import { getRecurringMasterId, GoogleEvent, isRecurringEvent } from "@/types/googleCalendar"
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss"
import { 
  Calendar, Crown, RefreshCw, Link, Download, Upload, 
  CheckCircle2, HelpCircle, Unlink, CheckSquare, Square,
  ArrowLeftRight, EyeOff, Copy, Info, Repeat, AlertTriangle, XCircle,
  History, BookOpen, X
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TooltipProvider} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type SeriesActionType = 'import' | 'copy' | 'mirror' | 'ignore'

const GoogleCalendarIntegrationNew = () => {
  const { hasFeature } = useSubscription()
  const { toast } = useToast()
  const {
    isInitialized,
    isSignedIn,
    googleEvents,
    platformSessions,
    loading,
    syncing,
    selectedGoogleEvents,
    selectedPlatformSessions,
    filteredGoogleEvents,
    groupedRecurringEvents,
    connectToGoogle,
    disconnectFromGoogle,
    loadAllData,
    importGoogleEvent,
    mirrorGoogleEvent,
    mirrorPlatformSession,
    ignoreGoogleEvent,
    sendToGoogle,
    fetchRecurringInstances,
    getRecurringSeriesInstances,
    batchImportGoogleEvents,
    batchSendToGoogle,
    batchIgnoreGoogleEvents,
    toggleGoogleEventSelection,
    togglePlatformSessionSelection,
    selectAllGoogleEvents,
    selectAllPlatformSessions,
    clearSelections,
    markAttendeesAsClients,
    syncMirroredSessions,
    checkCancelledEvents,
    getAccessToken,
  } = useGoogleCalendarSync()

  // Hook de detecção de conflitos (com função de token)
  const {
    conflicts,
    conflictStats,
    isDetecting,
    isResolving,
    detectAllConflicts,
    resolveConflict,
    resolveAllConflicts,
  } = useConflictDetection({ getAccessToken })

  // Hook de histórico de ações
  const { history, addToHistory, clearHistory, undoAction } = useActionHistory()

  const [activeInfoTab, setActiveInfoTab] = useState("concepts")
  
  // State para o modal de seleção de série
  const [seriesModalOpen, setSeriesModalOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(() => {
    const dismissed = localStorage.getItem('google-integration-warning-dismissed')
    return dismissed !== 'true'
  })
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const [isGoogleSelectionMode, setIsGoogleSelectionMode] = useState(false)
  const [isPlatformSelectionMode, setIsPlatformSelectionMode] = useState(false)
  const [seriesModalEvents, setSeriesModalEvents] = useState<GoogleEvent[]>([])
  const [seriesModalAction, setSeriesModalAction] = useState<SeriesActionType>('import')
  const [seriesModalLoading, setSeriesModalLoading] = useState(false)

  // Swipe to dismiss para o banner de aviso
  const swipeHandlers = useSwipeToDismiss({
    threshold: 100,
    onDismiss: () => setShowWarning(false)
  })

  // Função helper para formatar data do evento
  const formatEventDate = (event: GoogleEvent) => {
    const dateStr = event.start?.dateTime || event.start?.date
    if (!dateStr) return 'Data não disponível'
    return format(new Date(dateStr), "dd/MM/yy", { locale: ptBR })
  }

  // Wrappers para ações com histórico
  const handleImportWithHistory = async (event: GoogleEvent, isEditable: boolean) => {
    const sessionId = await importGoogleEvent(event, isEditable)
    if (sessionId) {
      addToHistory({
        type: isEditable ? 'copy' : 'import',
        eventId: event.id,
        eventTitle: event.summary || 'Evento sem título',
        eventDate: formatEventDate(event),
        canUndo: true,
        undoData: { sessionId }
      })
    }
    return sessionId
  }

  const handleMirrorWithHistory = async (event: GoogleEvent) => {
    const sessionId = await mirrorGoogleEvent(event)
    if (sessionId) {
      addToHistory({
        type: 'mirror',
        eventId: event.id,
        eventTitle: event.summary || 'Evento sem título',
        eventDate: formatEventDate(event),
        canUndo: true,
        undoData: { sessionId }
      })
    }
    return sessionId
  }

  const handleIgnoreWithHistory = async (eventId: string, event: GoogleEvent) => {
    const sessionId = await ignoreGoogleEvent(eventId)
    if (sessionId) {
      addToHistory({
        type: 'ignore',
        eventId: eventId,
        eventTitle: event.summary || 'Evento sem título',
        eventDate: formatEventDate(event),
        canUndo: true,
        undoData: { sessionId }
      })
    }
    return sessionId
  }

  // Sessões espelhadas (para detecção de conflitos)
  const mirroredSessions = platformSessions.filter(s => s.google_sync_type === 'espelhado')

  // Handler para verificar conflitos (recarrega dados primeiro)
  const handleDetectConflicts = async () => {
    // Recarregar dados do Google e plataforma
    // A detecção será feita automaticamente pelo useEffect quando os dados atualizarem
    await loadAllData()
  }

  // Detectar conflitos automaticamente quando os dados são carregados
  useEffect(() => {
    if (isSignedIn && mirroredSessions.length > 0 && googleEvents.length > 0) {
      // Usar os dados mais recentes calculados a partir do estado atual
      const currentMirroredSessions = platformSessions.filter(s => s.google_sync_type === 'espelhado')
      detectAllConflicts(currentMirroredSessions, googleEvents)
    }
  }, [isSignedIn, platformSessions, googleEvents, detectAllConflicts])

  // Listener para refresh após undo
  useEffect(() => {
    const handleRefresh = () => {
      loadAllData()
    }
    window.addEventListener('googleCalendarRefresh', handleRefresh)
    return () => window.removeEventListener('googleCalendarRefresh', handleRefresh)
  }, [loadAllData])

  // Helper para obter contagem de instâncias de série
  const getSeriesCount = (event: any): number => {
    const masterId = getRecurringMasterId(event)
    if (!masterId || !groupedRecurringEvents) return 1
    const series = groupedRecurringEvents.get(masterId)
    return series?.totalCount || 1
  }

  // Sessões locais (não importadas do Google)
  const localSessions = platformSessions.filter(s => 
    !s.google_sync_type || s.google_sync_type === 'local'
  )
  
  // Sessões sincronizadas com Google
  const syncedSessions = platformSessions.filter(s => 
    s.google_sync_type && s.google_sync_type !== 'local'
  )

  // Handlers para ações em lote
  const handleBatchImport = async () => {
    if (selectedGoogleEvents.size === 0) return
    const count = await batchImportGoogleEvents(Array.from(selectedGoogleEvents), true)
    clearSelections()
    await loadAllData()
  }

  const handleBatchSend = async () => {
    if (selectedPlatformSessions.size === 0) return
    const count = await batchSendToGoogle(Array.from(selectedPlatformSessions))
    clearSelections()
    await loadAllData()
  }

  const handleBatchIgnore = async () => {
    if (selectedGoogleEvents.size === 0) return
    await batchIgnoreGoogleEvents(Array.from(selectedGoogleEvents))
    clearSelections()
    await loadAllData()
  }

  const handleImportAll = async () => {
    const eventIds = filteredGoogleEvents.map(e => e.id)
    const count = await batchImportGoogleEvents(eventIds, true)
    await loadAllData()
  }

  const handleSendAll = async () => {
    const sessionIds = localSessions.map(s => s.id)
    const count = await batchSendToGoogle(sessionIds)
    await loadAllData()
  }

  // Handlers para ações em série com modal de seleção
  const handleSeriesAction = async (event: GoogleEvent, action: SeriesActionType) => {
    // Buscar todas as instâncias da série
    toast({
      title: "Buscando série...",
      description: "Carregando todos os eventos da série recorrente.",
    })
    
    let seriesInstances = getRecurringSeriesInstances(event)
    
    // Se só tem 1 instância local mas é evento recorrente, buscar mais do Google
    if (seriesInstances.length <= 1 && isRecurringEvent(event)) {
      seriesInstances = await fetchRecurringInstances(event)
    }
    
    if (seriesInstances.length <= 1) {
      // Se mesmo assim só tem 1, executar ação diretamente no evento único
      toast({
        title: "Série não encontrada",
        description: "Apenas este evento será processado.",
      })
      
      switch (action) {
        case 'import':
          await importGoogleEvent(event, false)
          break
        case 'copy':
          await importGoogleEvent(event, true)
          break
        case 'mirror':
          await mirrorGoogleEvent(event)
          break
        case 'ignore':
          await ignoreGoogleEvent(event.id)
          break
      }
      await loadAllData()
      return
    }
    
    // Abrir modal para seleção
    setSeriesModalEvents(seriesInstances)
    setSeriesModalAction(action)
    setSeriesModalOpen(true)
  }

  // Handler para confirmar ação no modal de série
  const handleSeriesConfirm = async (selectedEventIds: string[]) => {
    setSeriesModalLoading(true)
    
    try {
      const selectedEvents = seriesModalEvents.filter(e => selectedEventIds.includes(e.id))
      let successCount = 0
      
      for (const event of selectedEvents) {
        let success = false
        switch (seriesModalAction) {
          case 'import':
            success = await importGoogleEvent(event, false)
            break
          case 'copy':
            success = await importGoogleEvent(event, true)
            break
          case 'mirror':
            success = await mirrorGoogleEvent(event)
            break
          case 'ignore':
            success = await ignoreGoogleEvent(event.id)
            break
        }
        if (success) successCount++
      }
      
      const actionLabels: Record<SeriesActionType, string> = {
        import: 'importados',
        copy: 'copiados',
        mirror: 'espelhados',
        ignore: 'ignorados'
      }
      
      toast({
        title: "Operação concluída!",
        description: `${successCount} de ${selectedEvents.length} eventos foram ${actionLabels[seriesModalAction]}.`,
      })
      
      await loadAllData()
    } catch (error) {
      console.error('Erro na operação em série:', error)
      toast({
        title: "Erro",
        description: "Não foi possível completar a operação.",
        variant: "destructive"
      })
    } finally {
      setSeriesModalLoading(false)
      setSeriesModalOpen(false)
      setSeriesModalEvents([])
    }
  }

  return (
    <PlanProtection feature="hasAdvancedSettings">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Aviso no topo - acima de tudo */}
          {showWarning && (
            <div 
              {...swipeHandlers.handlers}
              style={swipeHandlers.style}
              className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-4"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-sm">
                    <strong>Recomendação:</strong> Leia a <strong>legenda</strong> abaixo para entender o funcionamento completo da integração. 
                    Utilize o <strong>Histórico de Ações</strong> para reverter ações indesejadas.
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDismissConfirm(true)} 
                    className="h-6 w-6 p-0"
                    title="Nunca mais mostrar"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowWarning(false)} className="h-6 w-6 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Confirmação de dispensar permanentemente */}
          <AlertDialog open={showDismissConfirm} onOpenChange={setShowDismissConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ocultar recomendação permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa mensagem não será exibida novamente. Você ainda poderá acessar a legenda 
                  clicando em "Como funciona a integração do Google?" abaixo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  localStorage.setItem('google-integration-warning-dismissed', 'true')
                  setShowWarning(false)
                  setShowDismissConfirm(false)
                }}>
                  Não mostrar novamente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Legenda explicativa em dropdown */}
          <Collapsible open={isLegendOpen} onOpenChange={setIsLegendOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
                <span>Como funciona a integração do Google?</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 bg-muted/50">
                <CardContent className="pt-4 space-y-3 text-sm">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="import" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-primary" />
                          <span>Importar do Google (somente leitura)</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Traz o evento do Google Agenda para a plataforma em <strong>modo de visualização</strong>. 
                          A sessão <strong>não pode ser editada</strong> na plataforma - apenas visualizada.
                          O evento ficará marcado com a tag <Badge variant="outline" className="mx-1">G: Importado</Badge>.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="copy" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Copy className="w-4 h-4 text-primary" />
                          <span>Criar cópia editável (independente)</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Cria uma <strong>sessão totalmente independente</strong> baseada no evento do Google. 
                          Você pode editar todos os dados livremente na plataforma.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="mirror" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="w-4 h-4 text-primary" />
                          <span>Espelhar com Google (bidirecional)</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Sincronização em duas vias. Alterações feitas na plataforma atualizam o Google 
                          e vice-versa. O evento ficará marcado com a tag <Badge variant="outline" className="mx-1">G: Espelhado</Badge>.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="send" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-primary" />
                          <span>Enviar para Google</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Publica o evento da plataforma no Google Agenda (sentido único). 
                          O evento ficará marcado com a tag <Badge variant="outline" className="mx-1">G: Enviado</Badge>.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="ignore" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-primary" />
                          <span>Ignorar evento</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Remove o evento da lista de pendentes sem afetar o Google. 
                          Útil para eventos pessoais que não são sessões.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="recurring" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-primary" />
                          <span>Eventos recorrentes</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Eventos recorrentes são identificados com a tag <Badge variant="outline" className="mx-1">G: Recorrente</Badge>.
                          Você pode importar uma única ocorrência ou toda a série de uma vez.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="history" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-primary" />
                          <span>Histórico de Ações</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Todas as ações são registradas no Histórico de Ações. Você pode reverter qualquer ação clicando em "Desfazer".
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="conflicts" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span>Detecção de conflitos</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Sessões espelhadas são monitoradas para detectar conflitos quando há alterações em ambos os lados.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Status da Conexão */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Integração Google Agenda
                <Crown className="w-4 h-4 text-warning" />
              </CardTitle>
              <CardDescription>
                Gerencie a sincronização entre sua agenda Google e a plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full`} 
                       style={{ backgroundColor: isSignedIn ? 'hsl(var(--success))' : '#d1d5db' }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {isSignedIn ? 'Conectado' : 'Não conectado'}
                      </p>
                      {isSignedIn && conflictStats.total > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {conflictStats.total} conflito{conflictStats.total !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isSignedIn 
                        ? `${googleEvents.length} eventos do Google (${filteredGoogleEvents.length} pendentes) • ${platformSessions.length} sessões na plataforma`
                        : 'Conecte para visualizar e sincronizar eventos'
                      }
                    </p>
                    {isSignedIn && (
                      <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Mostrando eventos dos próximos 30 dias
                      </p>
                    )}
                  </div>
                </div>
                
                {isSignedIn ? (
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        await loadAllData()
                        await checkCancelledEvents()
                        await syncMirroredSessions()
                      }}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Sincronizar Tudo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={disconnectFromGoogle}
                    >
                      <Unlink className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={connectToGoogle}
                    disabled={loading || !isInitialized}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Link className="w-4 h-4 mr-2" />
                    )}
                    Conectar Google
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>


          {/* Cards lado a lado */}
          {isSignedIn && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Eventos do Google */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <img 
                        src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" 
                        alt="Google Calendar" 
                        className="w-5 h-5"
                      />
                      Eventos do Google
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-semibold">
                        {filteredGoogleEvents.length}
                      </span>
                    </CardTitle>
                  </div>
                  
                  {/* Ações em lote */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button 
                      variant={isGoogleSelectionMode ? "secondary" : "ghost"} 
                      size="sm"
                      onClick={() => {
                        setIsGoogleSelectionMode(!isGoogleSelectionMode)
                        if (isGoogleSelectionMode) clearSelections()
                      }}
                      disabled={filteredGoogleEvents.length === 0}
                    >
                      {isGoogleSelectionMode ? (
                        <CheckSquare className="w-4 h-4 mr-1" />
                      ) : (
                        <Square className="w-4 h-4 mr-1" />
                      )}
                      Selecionar
                    </Button>
                    {isGoogleSelectionMode && selectedGoogleEvents.size === 0 && (
                      <span className="text-sm text-muted-foreground">Clique nos itens para selecionar</span>
                    )}
                    {selectedGoogleEvents.size > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="outline">{selectedGoogleEvents.size} selecionados</Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={selectAllGoogleEvents}
                        >
                          Selecionar todos
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleBatchImport}
                          disabled={loading}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleBatchIgnore}
                        >
                          <EyeOff className="w-4 h-4 mr-1" />
                          Ignorar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            clearSelections()
                            setIsGoogleSelectionMode(false)
                          }}
                        >
                          Limpar
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col min-h-[520px]">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                      <span>Carregando eventos...</span>
                    </div>
                  ) : filteredGoogleEvents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Nenhum evento pendente</p>
                      <p className="text-sm mt-1">
                        {googleEvents.length > 0 
                          ? 'Todos os eventos foram importados ou ignorados'
                          : 'Nenhum evento encontrado no calendário principal nos próximos 30 dias'
                        }
                      </p>
                      <p className="text-xs mt-2 text-muted-foreground/70">
                        Nota: Apenas eventos do calendário principal são sincronizados. Feriados e outros calendários secundários não aparecem aqui.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                         {filteredGoogleEvents.map((event) => (
                          <GoogleEventCard
                            key={event.id}
                            event={event}
                            isSelected={selectedGoogleEvents.has(event.id)}
                            isSyncing={syncing === event.id}
                            seriesCount={getSeriesCount(event)}
                            showCheckbox={isGoogleSelectionMode}
                            onSelect={() => toggleGoogleEventSelection(event.id)}
                            onImport={() => handleImportWithHistory(event, false).then(() => loadAllData())}
                            onCopy={() => handleImportWithHistory(event, true).then(() => loadAllData())}
                            onImportSeries={() => handleSeriesAction(event, 'import')}
                            onCopySeries={() => handleSeriesAction(event, 'copy')}
                            onMirror={() => handleMirrorWithHistory(event).then(() => loadAllData())}
                            onMirrorSeries={() => handleSeriesAction(event, 'mirror')}
                            onIgnore={() => handleIgnoreWithHistory(event.id, event).then(() => loadAllData())}
                            onIgnoreSeries={() => handleSeriesAction(event, 'ignore')}
                            onMarkAsClient={() => markAttendeesAsClients(event)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  
                  {/* Spacer para alinhar com o card da direita */}
                  <div className="flex-grow" />
                  
                  {filteredGoogleEvents.length > 0 && (
                    <div className="mt-auto pt-4 border-t flex justify-end gap-2">
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={handleImportAll}
                        disabled={loading}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar todos
                      </Button>
                    </div>
                  )}
                  {filteredGoogleEvents.length === 0 && (
                    <div className="mt-auto pt-4 border-t flex justify-end gap-2 invisible">
                      <Button variant="outline" size="sm" disabled>
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar todos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Eventos da Plataforma */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Sessões da Plataforma
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-semibold">
                        {platformSessions.length}
                      </span>
                    </CardTitle>
                  </div>
                  
                  {/* Ações em lote */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button 
                      variant={isPlatformSelectionMode ? "secondary" : "ghost"} 
                      size="sm"
                      onClick={() => {
                        setIsPlatformSelectionMode(!isPlatformSelectionMode)
                        if (isPlatformSelectionMode) clearSelections()
                      }}
                      disabled={localSessions.length === 0}
                    >
                      {isPlatformSelectionMode ? (
                        <CheckSquare className="w-4 h-4 mr-1" />
                      ) : (
                        <Square className="w-4 h-4 mr-1" />
                      )}
                      Selecionar
                    </Button>
                    {isPlatformSelectionMode && selectedPlatformSessions.size === 0 && (
                      <span className="text-sm text-muted-foreground">Clique nos itens para selecionar</span>
                    )}
                    {selectedPlatformSessions.size > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="outline">{selectedPlatformSessions.size} selecionados</Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={selectAllPlatformSessions}
                        >
                          Selecionar todos
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleBatchSend}
                          disabled={loading}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Enviar para Google
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            clearSelections()
                            setIsPlatformSelectionMode(false)
                          }}
                        >
                          Limpar
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col min-h-[520px]">
                  {/* Filtros */}
                  <Tabs defaultValue="local" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="local">
                        Locais ({localSessions.length})
                      </TabsTrigger>
                      <TabsTrigger value="synced">
                        Sincronizadas ({syncedSessions.length})
                      </TabsTrigger>
                      <TabsTrigger value="all">
                        Todas ({platformSessions.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="local" className="mt-3">
                      {localSessions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">Nenhuma sessão local</p>
                          <p className="text-sm mt-1">Todas as sessões estão sincronizadas</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[320px] pr-4">
                          <div className="space-y-3">
                            {localSessions.map((session) => (
                              <PlatformSessionCard
                                key={session.id}
                                session={session}
                                isSelected={selectedPlatformSessions.has(session.id)}
                                isSyncing={syncing === session.id}
                                showCheckbox={isPlatformSelectionMode}
                                onSelect={() => togglePlatformSessionSelection(session.id)}
                                onSendToGoogle={() => sendToGoogle(session)}
                                onMirror={() => mirrorPlatformSession(session)}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="synced" className="mt-3">
                      {syncedSessions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">Nenhuma sessão sincronizada</p>
                          <p className="text-sm mt-1">Importe ou envie sessões para sincronizar</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[320px] pr-4">
                          <div className="space-y-3">
                            {syncedSessions.map((session) => (
                              <PlatformSessionCard
                                key={session.id}
                                session={session}
                                isSelected={false}
                                isSyncing={syncing === session.id}
                                onSelect={() => {}}
                                onSendToGoogle={() => sendToGoogle(session)}
                                onMirror={() => mirrorPlatformSession(session)}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="all" className="mt-3">
                      {platformSessions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">Nenhuma sessão</p>
                          <p className="text-sm mt-1">Crie sessões ou importe do Google</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[320px] pr-4">
                          <div className="space-y-3">
                            {platformSessions.map((session) => (
                              <PlatformSessionCard
                                key={session.id}
                                session={session}
                                isSelected={false}
                                isSyncing={syncing === session.id}
                                onSelect={() => {}}
                                onSendToGoogle={() => sendToGoogle(session)}
                                onMirror={() => mirrorPlatformSession(session)}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </Tabs>
                  
                  {/* Spacer para alinhar com o card da esquerda */}
                  <div className="flex-grow" />
                  
                  {localSessions.length > 0 ? (
                    <div className="mt-auto pt-4 border-t flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSendAll}
                        disabled={loading}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Enviar todos para Google
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-auto pt-4 border-t flex justify-end gap-2 invisible">
                      <Button variant="outline" size="sm" disabled>
                        <Upload className="w-4 h-4 mr-1" />
                        Enviar todos para Google
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Painel de Detecção de Conflitos */}
          {isSignedIn && mirroredSessions.length > 0 && (
            <ConflictDetectionPanel
              conflicts={conflicts}
              conflictStats={conflictStats}
              isDetecting={isDetecting || loading}
              isResolving={isResolving}
              onDetect={handleDetectConflicts}
              onResolve={resolveConflict}
              onResolveAll={resolveAllConflicts}
            />
          )}

          {/* Histórico de Ações */}
          {isSignedIn && (
            <ActionHistoryPanel 
              history={history}
              onUndo={undoAction}
              onClearHistory={clearHistory}
            />
          )}

          {/* Modal de seleção de série */}
          <SeriesSelectionModal
            isOpen={seriesModalOpen}
            onClose={() => setSeriesModalOpen(false)}
            events={seriesModalEvents}
            actionType={seriesModalAction}
            loading={seriesModalLoading}
            onConfirm={handleSeriesConfirm}
          />
        </div>
      </TooltipProvider>
    </PlanProtection>
  )
}

export default GoogleCalendarIntegrationNew
