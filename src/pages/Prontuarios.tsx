import { useState, useEffect, useMemo } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FileText, Calendar, Plus, Edit2, Trash2, AlertTriangle, BookOpen, Filter, Search, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { ClientAvatar } from '@/components/ClientAvatar'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnamneseModal } from '@/components/AnamneseModal'
import { EvolucaoModal } from '@/components/EvolucaoModal'
import { EvolucaoReadOnlyModal } from '@/components/EvolucaoReadOnlyModal'
import { TextPreview } from '@/components/TextPreview'
import DOMPurify from 'dompurify'
import { getSessionStatusColor, getSessionStatusLabel } from '@/utils/sessionStatusUtils'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { decryptSensitiveDataBatch } from '@/utils/encryptionMiddleware'

interface Client {
  id: string
  nome: string
  email?: string
  telefone?: string
  avatar_url?: string
  ativo: boolean
  created_at: string
}

interface Anamnese {
  id: string
  client_id: string
  motivo_consulta?: string
  queixa_principal?: string
  historico_familiar?: string
  historico_medico?: string
  antecedentes_relevantes?: string
  diagnostico_inicial?: string
  observacoes_adicionais?: string
  created_at: string
  updated_at: string
}

interface Evolucao {
  id: string
  client_id: string
  session_id?: string
  data_sessao: string
  evolucao: string
  created_at: string
  updated_at: string
  session?: {
    id: string
    data: string
    horario: string
    status: string
  }
}

export default function Prontuarios() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Estados principais
  const [clients, setClients] = useState<Client[]>([])
  const [anamneses, setAnamneses] = useState<Anamnese[]>([])
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  // Estados para modais
  const [anamneseModalOpen, setAnamneseModalOpen] = useState(false)
  const [evolucaoModalOpen, setEvolucaoModalOpen] = useState(false)
  const [editingAnamnese, setEditingAnamnese] = useState<Anamnese | null>(null)
  const [editingEvolucao, setEditingEvolucao] = useState<Evolucao | null>(null)
  const [viewingEvolucao, setViewingEvolucao] = useState<Evolucao | null>(null)
  const [evolucaoReadOnlyModalOpen, setEvolucaoReadOnlyModalOpen] = useState(false)
  const [deleteEvolucaoId, setDeleteEvolucaoId] = useState<string | null>(null)
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    search: '',
    client: '',
    anamnese: 'all' as 'all' | 'realizada' | 'pendente'
  })
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  
  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.anamnese !== 'all') count++
    if (filters.search) count++
    return count
  }, [filters.anamnese, filters.search])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Refetch on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  useEffect(() => {
    // Verificar se há um cliente específico na URL
    const clientId = searchParams.get('cliente')
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setSelectedClient(client)
      }
    }
  }, [searchParams, clients])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Execute all queries in parallel for faster loading
      const [clientsResult, anamnesesResult, evolucoesResult] = await Promise.all([
        // Carregar clientes ativos
        supabase
          .from('clients')
          .select('id, nome, email, telefone, avatar_url, ativo, created_at')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome'),
        
        // Carregar anamneses
        supabase
          .from('anamneses')
          .select('id, client_id, queixa_principal, motivo_consulta, historico_medico, historico_familiar, antecedentes_relevantes, diagnostico_inicial, observacoes_adicionais, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        // Carregar evoluções
        supabase
          .from('evolucoes')
          .select('id, client_id, session_id, data_sessao, evolucao, created_at, updated_at')
          .eq('user_id', user.id)
          .order('data_sessao', { ascending: false })
      ])

      if (clientsResult.error) throw clientsResult.error
      if (anamnesesResult.error) throw anamnesesResult.error
      if (evolucoesResult.error) throw evolucoesResult.error

      // Batch decrypt anamneses and evolucoes in parallel (single API call each)
      const [decryptedAnamneses, decryptedEvolucoes] = await Promise.all([
        decryptSensitiveDataBatch('anamneses', anamnesesResult.data || []),
        decryptSensitiveDataBatch('evolucoes', evolucoesResult.data || [])
      ])

      // Carregar sessões para associar com as evoluções
      const sessionIds = evolucoesResult.data?.filter(e => e.session_id).map(e => e.session_id) || []
      let sessionsData: any[] = []
      
      if (sessionIds.length > 0) {
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, data, horario, status')
          .in('id', sessionIds)

        if (!sessionsError) {
          sessionsData = sessions || []
        }
      }

      // Combinar evoluções descriptografadas com dados das sessões
      const evolucoesWithSessions = decryptedEvolucoes.map(evolucao => ({
        ...evolucao,
        session: evolucao.session_id ? sessionsData.find(s => s.id === evolucao.session_id) : null
      })) as Evolucao[]

      setClients(clientsResult.data || [])
      setAnamneses(decryptedAnamneses as Anamnese[])
      setEvolucoes(evolucoesWithSessions)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client)
    navigate(`/prontuarios?cliente=${client.id}`)
  }

  const handleBackToList = () => {
    setSelectedClient(null)
    navigate('/prontuarios')
  }

  const getClientAnamnese = (clientId: string): Anamnese | null => {
    return anamneses.find(a => a.client_id === clientId) || null
  }

  const getClientEvolucoes = (clientId: string): Evolucao[] => {
    return evolucoes.filter(e => e.client_id === clientId)
  }

  const handleCreateAnamnese = (client: Client) => {
    setEditingAnamnese(null)
    setSelectedClient(client)
    setAnamneseModalOpen(true)
  }

  const handleEditAnamnese = (anamnese: Anamnese) => {
    setEditingAnamnese(anamnese)
    setAnamneseModalOpen(true)
  }

  const handleCreateEvolucao = (client: Client) => {
    setEditingEvolucao(null)
    setSelectedClient(client)
    setEvolucaoModalOpen(true)
  }

  const handleEditEvolucao = (evolucao: Evolucao) => {
    setEditingEvolucao(evolucao)
    setEvolucaoModalOpen(true)
  }

  const handleDeleteEvolucao = async (evolucaoId: string) => {
    try {
      const { error } = await supabase
        .from('evolucoes')
        .delete()
        .eq('id', evolucaoId)

      if (error) throw error

      toast({
        title: "Evolução excluída",
        description: "A evolução foi excluída com sucesso.",
      })
      await loadData()
    } catch (error) {
      console.error('Erro ao excluir evolução:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a evolução.",
        variant: "destructive",
      })
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = !filters.search || 
      client.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      client.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      client.telefone?.includes(filters.search)
    
    // Filtro de anamnese
    const clientAnamnese = getClientAnamnese(client.id)
    const matchesAnamnese = filters.anamnese === 'all' ||
      (filters.anamnese === 'realizada' && clientAnamnese) ||
      (filters.anamnese === 'pendente' && !clientAnamnese)
    
    return matchesSearch && matchesAnamnese
  })

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </Layout>
    )
  }

  // Se há um cliente selecionado, mostra o prontuário individual
  if (selectedClient) {
    const clientAnamnese = getClientAnamnese(selectedClient.id)
    const clientEvolucoes = getClientEvolucoes(selectedClient.id)

    return (
      <Layout>
        <div className="space-y-4 md:space-y-6">
          {/* Header com informações do cliente */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBackToList}
                className="shrink-0"
              >
                ← Voltar
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold truncate">{selectedClient.nome}</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Desde {format(new Date(selectedClient.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Resumo do cliente - Compacto no mobile */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <ClientAvatar 
                  avatarPath={selectedClient.avatar_url}
                  clientName={selectedClient.nome}
                  size="sm"
                />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
                <p className="text-sm">{selectedClient.nome}</p>
              </div>
              {selectedClient.email && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">E-mail</Label>
                  <p className="text-sm truncate">{selectedClient.email}</p>
                </div>
              )}
              {selectedClient.telefone && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Telefone</Label>
                  <p className="text-sm">{selectedClient.telefone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Abas do prontuário */}
          <Tabs defaultValue="anamnese" className="space-y-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="anamnese" className="flex items-center gap-1.5 text-xs md:text-sm">
                <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Anamnese</span>
                <span className="sm:hidden">Anamnese</span>
              </TabsTrigger>
              <TabsTrigger value="evolucoes" className="flex items-center gap-1.5 text-xs md:text-sm">
                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                <span>Evoluções</span>
                <Badge variant="secondary" className="ml-1 text-[10px] h-5">{clientEvolucoes.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Aba Anamnese */}
            <TabsContent value="anamnese">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Anamnese Inicial</CardTitle>
                    {clientAnamnese ? (
                      <Button 
                        variant="outline" 
                        onClick={() => handleEditAnamnese(clientAnamnese)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar Anamnese
                      </Button>
                    ) : (
                      <Button onClick={() => handleCreateAnamnese(selectedClient)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Anamnese
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {clientAnamnese ? (
                    <div className="space-y-4">
                      {clientAnamnese.motivo_consulta && (
                        <div>
                          <Label className="text-sm font-bold">Motivo da Consulta</Label>
                          <p className="mt-1 text-sm">{clientAnamnese.motivo_consulta}</p>
                        </div>
                      )}
                      {clientAnamnese.queixa_principal && (
                        <div>
                          <Label className="text-sm font-bold">Queixa Principal</Label>
                          <p className="mt-1 text-sm">{clientAnamnese.queixa_principal}</p>
                        </div>
                      )}
                      {clientAnamnese.historico_familiar && (
                        <div>
                          <Label className="text-sm font-bold">Histórico Familiar</Label>
                          <p className="mt-1 text-sm">{clientAnamnese.historico_familiar}</p>
                        </div>
                      )}
                      {clientAnamnese.historico_medico && (
                        <div>
                          <Label className="text-sm font-bold">Histórico Médico/Psicológico</Label>
                          <p className="mt-1 text-sm">{clientAnamnese.historico_medico}</p>
                        </div>
                      )}
                      {clientAnamnese.antecedentes_relevantes && (
                        <div>
                          <Label className="text-sm font-bold">Antecedentes Relevantes</Label>
                          <p className="mt-1 text-sm">{clientAnamnese.antecedentes_relevantes}</p>
                        </div>
                      )}
                      {clientAnamnese.diagnostico_inicial && (
                        <div>
                          <Label className="text-sm font-bold">Diagnóstico Inicial</Label>
                          <p className="mt-1 text-sm">{clientAnamnese.diagnostico_inicial}</p>
                        </div>
                      )}
                      {clientAnamnese.observacoes_adicionais && (
                        <div>
                          <Label className="text-sm font-bold">Observações Adicionais</Label>
                          <p className="mt-1 text-sm">{clientAnamnese.observacoes_adicionais}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        Nenhuma anamnese registrada para este cliente.
                      </p>
                      <Button onClick={() => handleCreateAnamnese(selectedClient)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Anamnese Inicial
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Evoluções */}
            <TabsContent value="evolucoes">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Evoluções Clínicas</CardTitle>
                    <Button onClick={() => handleCreateEvolucao(selectedClient)} size="sm" className="bg-gradient-primary hover:opacity-90">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Evolução
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {clientEvolucoes.length > 0 ? (
                    <div className="space-y-4">
                      {clientEvolucoes.map((evolucao) => (
                        <div 
                          key={evolucao.id} 
                          className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setViewingEvolucao(evolucao)
                            setEvolucaoReadOnlyModalOpen(true)
                          }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                              <ClientAvatar 
                                avatarPath={selectedClient?.avatar_url}
                                clientName={selectedClient?.nome || 'Cliente'}
                                size="lg"
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="text-base sm:text-lg font-semibold break-words">{selectedClient?.nome || 'Cliente'}</h3>
                                  {evolucao.session && (
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                                        {format(new Date(evolucao.session.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })} às {evolucao.session.horario.substring(0, 5)}
                                      </Badge>
                                      <Badge variant={getSessionStatusColor(evolucao.session.status)} className="text-xs">
                                        {getSessionStatusLabel(evolucao.session.status)}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                <div 
                                  className="text-sm text-foreground/80 mb-2 line-clamp-5 max-w-none break-words overflow-hidden [&_*]:!text-foreground/80"
                                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evolucao.evolucao) }}
                                />
                                <div className="text-xs text-muted-foreground">
                                  Criado em {format(new Date(evolucao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0 self-end sm:self-start">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditEvolucao(evolucao)
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDeleteEvolucaoId(evolucao.id)
                                      }}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        Nenhuma evolução registrada para este cliente.
                      </p>
                      <Button onClick={() => handleCreateEvolucao(selectedClient)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Primeira Evolução
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modais */}
        <AnamneseModal
          open={anamneseModalOpen}
          onOpenChange={setAnamneseModalOpen}
          clientId={selectedClient.id}
          clientName={selectedClient.nome}
          onAnamneseCreated={loadData}
          existingAnamnese={editingAnamnese}
        />

        <EvolucaoModal
          open={evolucaoModalOpen}
          onOpenChange={setEvolucaoModalOpen}
          clientId={selectedClient.id}
          clientName={selectedClient.nome}
          onEvolucaoCreated={loadData}
          existingEvolucao={editingEvolucao}
        />

        <EvolucaoReadOnlyModal
          evolucao={viewingEvolucao}
          clientName={selectedClient.nome}
          clientAvatar={selectedClient.avatar_url}
          open={evolucaoReadOnlyModalOpen}
          onOpenChange={setEvolucaoReadOnlyModalOpen}
        />
      </Layout>
    )
  }

  // Lista de clientes
  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Prontuários Clínicos</h1>
          </div>
        </div>
        
        {/* Filtros - Collapsible dropdown */}
        <Card className="mb-6">
          <CardHeader className="py-3 md:py-4">
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm md:text-base font-semibold">Filtros</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isFiltersOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="search" className="text-xs">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Nome, e-mail ou telefone..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className={cn(
                          "h-9 text-sm pl-9 transition-all",
                          filters.search !== '' && "ring-2 ring-primary ring-offset-1 border-primary"
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="anamnese-filter" className="text-xs">Anamnese</Label>
                    <Select 
                      value={filters.anamnese} 
                      onValueChange={(value: 'all' | 'realizada' | 'pendente') => setFilters(prev => ({ ...prev, anamnese: value }))}
                    >
                      <SelectTrigger className={cn(
                        "h-9 text-sm transition-all",
                        filters.anamnese !== 'all' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Limpar</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-9"
                      onClick={() => {
                        setFilters({ search: '', client: '', anamnese: 'all' })
                      }}
                      disabled={activeFiltersCount === 0}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>
        
        {/* Lista de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const clientAnamnese = getClientAnamnese(client.id)
            const clientEvolucoes = getClientEvolucoes(client.id)
            
            return (
              <Card 
                key={client.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleSelectClient(client)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <ClientAvatar 
                        avatarPath={client.avatar_url}
                        clientName={client.nome}
                        size="lg"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {client.nome}
                        </CardTitle>
                        {client.email && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {client.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Anamnese:</span>
                      <Badge variant={clientAnamnese ? "default" : "secondary"}>
                        {clientAnamnese ? "Realizada" : "Pendente"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Evoluções:</span>
                      <span className="font-medium">{clientEvolucoes.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Cliente desde {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredClients.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Nenhum cliente encontrado. Cadastre clientes na página de Clientes para criar prontuários.
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de confirmação para excluir evolução */}
      <AlertDialog open={!!deleteEvolucaoId} onOpenChange={(open) => !open && setDeleteEvolucaoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evolução</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta evolução? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteEvolucaoId) {
                  handleDeleteEvolucao(deleteEvolucaoId)
                  setDeleteEvolucaoId(null)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}