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
import { useSubscription } from "@/hooks/useSubscription"
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync"
import { useConflictDetection } from "@/hooks/useConflictDetection"
import { PlanProtection } from "@/components/PlanProtection"
import { GoogleEventCard } from "./GoogleEventCard"
import { PlatformSessionCard } from "./PlatformSessionCard"
import { ConflictDetectionPanel } from "./ConflictDetectionPanel"
import { getRecurringMasterId } from "@/types/googleCalendar"
import { 
  Calendar, Crown, RefreshCw, Link, Download, Upload, 
  CheckCircle2, HelpCircle, Unlink, CheckSquare, Square,
  ArrowLeftRight, EyeOff, Copy, Info, Repeat, AlertTriangle, XCircle
} from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"

const GoogleCalendarIntegrationNew = () => {
  const { hasFeature } = useSubscription()
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
    importRecurringSeries,
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

  const [activeInfoTab, setActiveInfoTab] = useState("concepts")

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

  return (
    <PlanProtection feature="hasAdvancedSettings">
      <TooltipProvider>
        <div className="space-y-6">
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
                      variant="ghost" 
                      size="sm"
                      onClick={selectAllGoogleEvents}
                      disabled={filteredGoogleEvents.length === 0}
                    >
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Selecionar todos
                    </Button>
                    {selectedGoogleEvents.size > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="outline">{selectedGoogleEvents.size} selecionados</Badge>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleBatchImport}
                          disabled={loading}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Importar
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
                          onClick={clearSelections}
                        >
                          Limpar
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
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
                            onSelect={() => toggleGoogleEventSelection(event.id)}
                            onImport={(createClient) => importGoogleEvent(event, createClient)}
                            onImportSeries={(createClient) => importRecurringSeries(event, createClient)}
                            onMirror={() => mirrorGoogleEvent(event)}
                            onIgnore={() => ignoreGoogleEvent(event.id).then(() => loadAllData())}
                            onMarkAsClient={() => markAttendeesAsClients(event)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  
                  {filteredGoogleEvents.length > 0 && (
                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={handleImportAll}
                        disabled={loading}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Importar todos
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
                      variant="ghost" 
                      size="sm"
                      onClick={selectAllPlatformSessions}
                      disabled={localSessions.length === 0}
                    >
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Selecionar todos
                    </Button>
                    {selectedPlatformSessions.size > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="outline">{selectedPlatformSessions.size} selecionados</Badge>
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
                          onClick={clearSelections}
                        >
                          Limpar
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
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
                  
                  {localSessions.length > 0 && (
                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
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

          {/* Área Informativa */}
          <Card className="shadow-soft border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="w-5 h-5 text-primary" />
                Como funciona a integração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="import">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-primary" />
                      <span>Importar do Google (somente leitura)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Traz o evento do Google Agenda para a plataforma em <strong>modo de visualização</strong>. 
                      A sessão <strong>não pode ser editada</strong> na plataforma - apenas visualizada 
                      (exceto valor e método de pagamento, para fins de métricas).
                      Ideal para manter eventos sincronizados sem risco de alterações acidentais.
                      O evento ficará marcado com a tag <Badge variant="outline" className="mx-1">G: Importado</Badge>.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="copy">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-primary" />
                      <span>Criar cópia editável (independente)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Cria uma <strong>sessão totalmente independente</strong> baseada no evento do Google. 
                      Você pode editar todos os dados livremente na plataforma.
                      <strong>Não mantém vínculo</strong> com o Google Calendar - é como criar uma nova sessão manualmente.
                      Não exibe tag de sincronização pois é uma sessão nativa da plataforma.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="mirror">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-primary" />
                      <span>Espelhar com Google (bidirecional)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Sincronização em duas vias. Alterações feitas na plataforma atualizam o Google 
                      e vice-versa. Funciona com eventos únicos e recorrentes.
                      O evento ficará marcado com a tag <Badge variant="outline" className="mx-1">G: Espelhado</Badge>.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="send">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      <span>Enviar para Google</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Publica o evento da plataforma no Google Agenda (sentido único). 
                      Alterações futuras no Google <strong>não afetam</strong> a plataforma.
                      O evento ficará marcado com a tag <Badge variant="outline" className="mx-1">G: Enviado</Badge>.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="ignore">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      <span>Ignorar evento</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Remove o evento da lista de pendentes sem afetar o Google. 
                      O evento não aparecerá na página de Sessões e não será importado automaticamente.
                      Útil para eventos pessoais que não são sessões de atendimento.
                    </p>
                    <p className="text-xs mt-2 text-muted-foreground/80 border-t pt-2">
                      <strong>Nota:</strong> Sessões importadas requerem definição manual de valor e método de pagamento para contabilização correta nas métricas.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="recurring">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-primary" />
                      <span>Eventos recorrentes (séries)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        Eventos recorrentes são identificados com a tag <Badge variant="outline" className="mx-1">Recorrente</Badge> 
                        e mostram a quantidade de instâncias na série.
                      </p>
                      <p>
                        <strong>Importar única:</strong> Importa apenas a ocorrência selecionada, ideal para casos onde você quer controle individual.
                      </p>
                      <p>
                        <strong>Importar série:</strong> Importa todas as instâncias da série de uma vez, criando um único cliente vinculado a todas as sessões.
                      </p>
                      <p className="text-xs pt-2 border-t mt-2">
                        Cada ocorrência importada mantém referência à série original para rastreamento.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="conflicts">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span>Detecção de conflitos</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        Sessões <Badge variant="outline" className="mx-1">G: Espelhadas</Badge> são monitoradas automaticamente para detectar conflitos 
                        quando há alterações em ambos os lados (plataforma e Google).
                      </p>
                      <p>
                        <strong>Prioridade Alta:</strong> Conflitos de data/horário que podem causar problemas de agendamento.
                      </p>
                      <p>
                        <strong>Prioridade Média/Baixa:</strong> Diferenças em descrição, localização ou outros detalhes.
                      </p>
                      <p>
                        Você pode resolver conflitos mantendo os dados da plataforma, do Google, 
                        ou fazendo um merge manual escolhendo campo a campo.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </PlanProtection>
  )
}

export default GoogleCalendarIntegrationNew
