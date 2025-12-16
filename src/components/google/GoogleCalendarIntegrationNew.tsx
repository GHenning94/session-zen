import { useState } from "react"
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
import { PlanProtection } from "@/components/PlanProtection"
import { GoogleEventCard } from "./GoogleEventCard"
import { PlatformSessionCard } from "./PlatformSessionCard"
import { getRecurringMasterId } from "@/types/googleCalendar"
import { 
  Calendar, Crown, RefreshCw, Link, Download, Upload, 
  CheckCircle2, HelpCircle, Unlink, CheckSquare, Square,
  ArrowLeftRight, EyeOff, Copy, Info, Repeat
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
  } = useGoogleCalendarSync()

  const [activeInfoTab, setActiveInfoTab] = useState("concepts")

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
  }

  const handleBatchSend = async () => {
    if (selectedPlatformSessions.size === 0) return
    const count = await batchSendToGoogle(Array.from(selectedPlatformSessions))
    clearSelections()
  }

  const handleBatchIgnore = async () => {
    if (selectedGoogleEvents.size === 0) return
    await batchIgnoreGoogleEvents(Array.from(selectedGoogleEvents))
    await loadAllData()
  }

  const handleImportAll = async () => {
    const eventIds = filteredGoogleEvents.map(e => e.id)
    await batchImportGoogleEvents(eventIds, true)
  }

  const handleSendAll = async () => {
    const sessionIds = localSessions.map(s => s.id)
    await batchSendToGoogle(sessionIds)
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
                    <p className="font-medium">
                      {isSignedIn ? 'Conectado' : 'Não conectado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isSignedIn 
                        ? `${googleEvents.length} eventos do Google • ${platformSessions.length} sessões na plataforma`
                        : 'Conecte para visualizar e sincronizar eventos'
                      }
                    </p>
                  </div>
                </div>
                
                {isSignedIn ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={loadAllData}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Sincronizar
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
                      <Badge variant="secondary">{filteredGoogleEvents.length}</Badge>
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
                      <p className="text-sm mt-1">Todos os eventos foram importados ou ignorados</p>
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
                      <Badge variant="secondary">{platformSessions.length}</Badge>
                    </CardTitle>
                  </div>
                  
                  {/* Filtros */}
                  <Tabs defaultValue="local" className="w-full pt-2">
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
                      {/* Ações para sessões locais */}
                      {localSessions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={selectAllPlatformSessions}
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
                      )}
                      
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
                                onMirror={() => {}}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                      
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
                                onSendToGoogle={() => {}}
                                onMirror={() => {}}
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
                                onMirror={() => {}}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardHeader>
              </Card>
            </div>
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
                      <span>Importar do Google</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Traz o evento do Google Agenda para a plataforma como cópia. 
                      Alterações feitas no Google <strong>não afetam</strong> automaticamente a cópia importada.
                      Ideal para eventos que você deseja gerenciar apenas na plataforma.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="copy">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-primary" />
                      <span>Criar cópia editável</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Duplica o evento do Google como uma sessão totalmente editável. 
                      Não altera o evento original no Google. 
                      Use quando quiser personalizar os dados do evento na plataforma.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="mirror">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-success" />
                      <span>Espelhar com Google (bidirecional)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Sincronização em duas vias. Alterações feitas na plataforma atualizam o Google 
                      e vice-versa. Funciona com eventos únicos e recorrentes.
                      O evento ficará marcado com a tag <Badge variant="success" className="mx-1">Espelhado</Badge>.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="send">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-warning" />
                      <span>Enviar para Google</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Publica o evento da plataforma no Google Agenda (sentido único). 
                      Alterações futuras no Google <strong>não afetam</strong> a plataforma.
                      O evento ficará marcado com a tag <Badge variant="warning" className="mx-1">Enviado</Badge>.
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
                        Eventos recorrentes são identificados com o ícone <Badge variant="outline" className="mx-1"><Repeat className="w-3 h-3 mr-1" />Recorrente</Badge> 
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
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </PlanProtection>
  )
}

export default GoogleCalendarIntegrationNew
