import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Layout } from "@/components/Layout"
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  Pill,
  Filter,
  MessageCircle,
  Baby,
  Link,
  AlertTriangle,
  ChevronDown,
  Cake,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { useTerminology } from "@/hooks/useTerminology"
import { ClientAvatarUpload } from "@/components/ClientAvatarUpload"
import { ClientDetailsModal } from "@/components/ClientDetailsModal"
import { NewClientModal } from "@/components/NewClientModal"
import { GenerateRegistrationLinkModal } from "@/components/GenerateRegistrationLinkModal"
import { ClientCard } from "@/components/ClientCard"
import { BatchSelectionBar, SelectableItemCheckbox } from "@/components/BatchSelectionBar"
import { ClientLimitBanner, LockedClientOverlay } from "@/components/ClientLimitBanner"
import { UpgradeModal } from "@/components/UpgradeModal"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from "@/lib/utils"

const Clientes = () => {
  console.log("Clientes component is loading - build system test")
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentPlan, planLimits, canAddClient } = useSubscription()
  const { clientTerm, clientTermPlural, getClientTerm } = useTerminology()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [birthdayFilter, setBirthdayFilter] = useState<boolean>(false)
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<any>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  
  // Estados para seleção em lote
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (statusFilter && statusFilter !== 'todos') count++
    if (searchTerm) count++
    if (birthdayFilter) count++
    return count
  }, [statusFilter, searchTerm, birthdayFilter])

  // Check URL params for filter on mount
  useEffect(() => {
    const filter = searchParams.get('filter')
    if (filter === 'aniversariantes') {
      setBirthdayFilter(true)
      setIsFiltersOpen(true)
    }
  }, [searchParams])

  // Check URL params to open specific client modal
  useEffect(() => {
    const clientId = searchParams.get('cliente')
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setSelectedClient(client)
        setIsClientDetailsOpen(true)
        // Clear the URL param after opening
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, clients, setSearchParams])

  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    profession: "",
    age: "",
    notes: "",
    avatarUrl: "",
    cpf: "",
    dataNascimento: "",
    endereco: "",
    pais: "",
    genero: "",
    planoSaude: "",
    tratamento: "",
    medicamentos: [] as string[],
    contatoEmergencia1Nome: "",
    contatoEmergencia1Telefone: "",
    contatoEmergencia2Nome: "",
    contatoEmergencia2Telefone: "",
    nomePai: "",
    telefonePai: "",
    nomeMae: "",
    telefoneMae: "",
    ehCriancaAdolescente: false,
    emergenciaIgualPais: false
  })

  const loadClients = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Erro ao carregar clientes:', error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os clientes.",
          variant: "destructive"
        })
      } else {
        setClients(data || [])
      }
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar clientes.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [user])

  // Escutar evento de cliente adicionado
  useEffect(() => {
    const handleClientAdded = () => {
      loadClients()
    }
    
    window.addEventListener('clientAdded', handleClientAdded)
    return () => {
      window.removeEventListener('clientAdded', handleClientAdded)
    }
  }, [user])

  const handleAvatarChange = async (clientId: string, avatarUrl: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ avatar_url: avatarUrl })
        .eq('id', clientId)
      
      if (error) throw error
      
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, avatar_url: avatarUrl }
            : client
        )
      )
      
      toast({
        title: "Avatar atualizado",
        description: "A foto do cliente foi atualizada com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o avatar do cliente.",
        variant: "destructive"
      })
    }
  }

  const handleClientClick = (client: any) => {
    setSelectedClient(client)
    setIsClientDetailsOpen(true)
  }

  const handleSaveClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, e-mail e telefone.",
        variant: "destructive"
      })
      return
    }

    const activeClients = clients.filter(client => client.ativo !== false)
    if (!editingClient && !canAddClient(activeClients.length)) {
      toast({
        title: "Limite Atingido",
        description: `Seu plano ${currentPlan} permite apenas ${planLimits.maxClients} clientes ativos.`,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const clientData = {
        user_id: user?.id,
        nome: newClient.name,
        email: newClient.email,
        telefone: newClient.phone,
        avatar_url: newClient.avatarUrl,
        cpf: newClient.cpf || null,
        data_nascimento: newClient.dataNascimento || null,
        endereco: newClient.endereco || null,
        pais: newClient.pais || null,
        genero: newClient.genero || null,
        profissao: newClient.profession || null,
        plano_saude: newClient.planoSaude || null,
        tratamento: newClient.tratamento || null,
        medicamentos: newClient.medicamentos.length > 0 ? newClient.medicamentos : null,
        contato_emergencia_1_nome: newClient.contatoEmergencia1Nome || null,
        contato_emergencia_1_telefone: newClient.contatoEmergencia1Telefone || null,
        contato_emergencia_2_nome: newClient.contatoEmergencia2Nome || null,
        contato_emergencia_2_telefone: newClient.contatoEmergencia2Telefone || null,
        nome_pai: newClient.nomePai || null,
        telefone_pai: newClient.telefonePai || null,
        nome_mae: newClient.nomeMae || null,
        telefone_mae: newClient.telefoneMae || null,
        eh_crianca_adolescente: newClient.ehCriancaAdolescente,
        emergencia_igual_pais: newClient.emergenciaIgualPais,
        dados_clinicos: `${newClient.notes ? `Observações: ${newClient.notes}` : ''}${newClient.age ? `\nIdade: ${newClient.age}` : ''}${newClient.profession ? `\nProfissão: ${newClient.profession}` : ''}`
      }

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
        
        if (error) throw error
        
        toast({
          title: "Cliente atualizado!",
          description: "As informações foram salvas com sucesso.",
        })
        setEditingClient(null)
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([clientData])
        
        if (error) throw error
        
        toast({
          title: "Cliente adicionado!",
          description: "O novo cliente foi cadastrado com sucesso.",
        })
      }

      setNewClient({
        name: "",
        email: "",
        phone: "",
        profession: "",
        age: "",
        notes: "",
        avatarUrl: "",
        cpf: "",
        dataNascimento: "",
        endereco: "",
        pais: "",
        genero: "",
        planoSaude: "",
        tratamento: "",
        medicamentos: [],
        contatoEmergencia1Nome: "",
        contatoEmergencia1Telefone: "",
        contatoEmergencia2Nome: "",
        contatoEmergencia2Telefone: "",
        nomePai: "",
        telefonePai: "",
        nomeMae: "",
        telefoneMae: "",
        ehCriancaAdolescente: false,
        emergenciaIgualPais: false
      })
      setIsNewClientOpen(false)
      await loadClients()
      
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cliente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    // Close the details modal and open the confirmation dialog
    setIsClientDetailsOpen(false)
    const clientToDelete = clients.find(c => c.id === clientId)
    setDeleteConfirmClient(clientToDelete)
  }

  const confirmDeleteClient = async () => {
    if (!deleteConfirmClient) return
    
    setIsLoading(true)
    try {
      // Primeiro, deletar pacotes relacionados (que cascateiam as sessões do pacote)
      await supabase
        .from('packages')
        .delete()
        .eq('client_id', deleteConfirmClient.id)
      
      // Deletar sessões recorrentes relacionadas
      await supabase
        .from('recurring_sessions')
        .delete()
        .eq('client_id', deleteConfirmClient.id)
      
      // Deletar sessões relacionadas
      await supabase
        .from('sessions')
        .delete()
        .eq('client_id', deleteConfirmClient.id)
      
      // Deletar pagamentos relacionados
      await supabase
        .from('payments')
        .delete()
        .eq('client_id', deleteConfirmClient.id)
      
      // Por fim, deletar o cliente
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deleteConfirmClient.id)
      
      if (error) throw error
      
      toast({
        title: "Cliente removido",
        description: "O cliente e todos os dados relacionados foram excluídos do sistema.",
      })
      
      setDeleteConfirmClient(null)
      await loadClients()
    } catch (error) {
      console.error('Erro ao deletar cliente:', error)
      toast({
        title: "Erro",
        description: "Não foi possível remover o cliente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({ ativo: !currentStatus })
        .eq('id', clientId)
      
      if (error) throw error
      
      toast({
        title: currentStatus ? "Cliente desativado" : "Cliente ativado",
        description: currentStatus 
          ? "O cliente foi desativado e não aparecerá nas listas."
          : "O cliente foi reativado com sucesso.",
      })
      
      await loadClients()
    } catch (error) {
      console.error('Erro ao alterar status do cliente:', error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do cliente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funções de seleção em lote
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev)
      if (next.has(clientId)) {
        next.delete(clientId)
      } else {
        next.add(clientId)
      }
      return next
    })
  }

  const selectAllClients = () => {
    setSelectedClients(new Set(filteredClients.map(c => c.id)))
    setIsSelectionMode(true)
  }

  const clearClientSelection = () => {
    setSelectedClients(new Set())
    setIsSelectionMode(false)
  }

  const handleBatchDeleteClients = () => {
    // Abre o modal de confirmação
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDeleteClients = async () => {
    try {
      const ids = Array.from(selectedClients)
      
      // Deletar dados relacionados primeiro
      for (const clientId of ids) {
        await supabase.from('packages').delete().eq('client_id', clientId)
        await supabase.from('recurring_sessions').delete().eq('client_id', clientId)
        await supabase.from('sessions').delete().eq('client_id', clientId)
        await supabase.from('payments').delete().eq('client_id', clientId)
      }
      
      // Deletar clientes
      const { error } = await supabase
        .from('clients')
        .delete()
        .in('id', ids)

      if (error) throw error

      toast({
        title: `${clientTermPlural} excluídos`,
        description: `${ids.length} ${getClientTerm(ids.length).toLowerCase()}(s) excluído(s) com sucesso.`,
      })
      setSelectedClients(new Set())
      setIsSelectionMode(false)
      setBatchDeleteDialogOpen(false)
      await loadClients()
    } catch (error) {
      console.error('Erro ao excluir clientes:', error)
      toast({
        title: "Erro",
        description: `Não foi possível excluir os ${clientTermPlural.toLowerCase()}.`,
        variant: "destructive",
      })
    }
  }

  const handleBatchStatusChange = async (status: string) => {
    try {
      const ids = Array.from(selectedClients)
      const isActive = status === 'ativo'

      const { error } = await supabase
        .from('clients')
        .update({ ativo: isActive })
        .in('id', ids)

      if (error) throw error

      toast({
        title: `${clientTermPlural} ${isActive ? 'ativados' : 'desativados'}`,
        description: `${ids.length} ${getClientTerm(ids.length).toLowerCase()}(s) ${isActive ? 'ativado' : 'desativado'}(s) com sucesso.`,
      })
      setSelectedClients(new Set())
      setIsSelectionMode(false)
      await loadClients()
    } catch (error) {
      console.error('Erro ao alterar status dos clientes:', error)
      toast({
        title: "Erro",
        description: `Não foi possível alterar o status dos ${clientTermPlural.toLowerCase()}.`,
        variant: "destructive",
      })
    }
  }

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedClients(new Set())
    }
    setIsSelectionMode(!isSelectionMode)
  }

  const handleEditClient = (client: any) => {
    setEditingClient(client)
    
    // Parse existing clinical data
    const clinicalData = client.dados_clinicos || ""
    const ageMatch = clinicalData.match(/Idade: ([^\n]+)/)
    const professionMatch = clinicalData.match(/Profissão: ([^\n]+)/)
    const notesMatch = clinicalData.match(/Observações: ([^\n]+)/)
    
    setNewClient({
      name: client.nome || "",
      email: client.email || "",
      phone: client.telefone || "",
      profession: client.profissao || (professionMatch ? professionMatch[1] : ""),
      age: ageMatch ? ageMatch[1] : "",
      notes: notesMatch ? notesMatch[1] : "",
      avatarUrl: client.avatar_url || "",
      cpf: client.cpf || "",
      dataNascimento: client.data_nascimento || "",
      endereco: client.endereco || "",
      pais: client.pais || "",
      genero: client.genero || "",
      planoSaude: client.plano_saude || "",
      tratamento: client.tratamento || "",
      medicamentos: client.medicamentos || [],
      contatoEmergencia1Nome: client.contato_emergencia_1_nome || "",
      contatoEmergencia1Telefone: client.contato_emergencia_1_telefone || "",
      contatoEmergencia2Nome: client.contato_emergencia_2_nome || "",
      contatoEmergencia2Telefone: client.contato_emergencia_2_telefone || "",
      nomePai: client.nome_pai || "",
      telefonePai: client.telefone_pai || "",
      nomeMae: client.nome_mae || "",
      telefoneMae: client.telefone_mae || "",
      ehCriancaAdolescente: client.eh_crianca_adolescente || false,
      emergenciaIgualPais: client.emergencia_igual_pais || false
    })
    setIsNewClientOpen(true)
    setIsClientDetailsOpen(false)
  }

  // Filtrar clientes por busca, status e ordenar por data de criação (mais recente primeiro)
  // Helper function to check if birthday is this month
  const isBirthdayThisMonth = (dataNascimento: string | null) => {
    if (!dataNascimento) return false
    const birthMonth = new Date(dataNascimento).getMonth()
    const currentMonth = new Date().getMonth()
    return birthMonth === currentMonth
  }

  const filteredClients = [...clients]
    .filter(client => {
      const matchesSearch = client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telefone?.includes(searchTerm)
      
      const matchesStatus = statusFilter === "todos" || 
        (statusFilter === "ativo" && client.ativo !== false) ||
        (statusFilter === "inativo" && client.ativo === false)
      
      const matchesBirthday = !birthdayFilter || isBirthdayThisMonth(client.data_nascimento)
      
      return matchesSearch && matchesStatus && matchesBirthday
    })
    .sort((a, b) => {
      return new Date(b.created_at || b.view_accessed_at).getTime() - new Date(a.created_at || a.view_accessed_at).getTime()
    })

  // Separar clientes ativos e inativos
  const activeClients = filteredClients.filter(client => client.ativo !== false)
  const inactiveClients = filteredClients.filter(client => client.ativo === false)

  // Verificar se pode adicionar mais clientes
  const canAddMore = canAddClient(activeClients.length)

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{clientTermPlural}</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus {clientTermPlural.toLowerCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <GenerateRegistrationLinkModal disabled={!canAddMore}>
              <Button variant="outline" size="sm" disabled={!canAddMore} className="flex-1 md:flex-none">
                <Link className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Gerar Link</span>
                <span className="sm:hidden">Link</span>
              </Button>
            </GenerateRegistrationLinkModal>
            <Button 
              size="sm"
              className="bg-gradient-primary hover:opacity-90 flex-1 md:flex-none"
              onClick={() => {
                if (!canAddMore) {
                  toast({
                    title: "Limite de pacientes atingido",
                    description: (
                      <div className="space-y-3">
                        <p>Seu plano {currentPlan === 'basico' ? 'Básico' : currentPlan === 'pro' ? 'Pro' : 'Premium'} permite até {planLimits.maxClients} {clientTermPlural.toLowerCase()} ativos. Faça upgrade para adicionar mais.</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowUpgradeModal(true)}
                        >
                          Fazer Upgrade
                        </Button>
                      </div>
                    )
                  })
                  return
                }
                setEditingClient(null)
                setIsNewClientOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo {clientTerm}</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* Client Limit Banner - shows when limit is reached */}
        <ClientLimitBanner currentCount={activeClients.length} />

        {/* Stats Cards - Grid 2x2 no mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-lg">{clientTermPlural} Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-primary">{activeClients.length}</div>
              <p className="text-[10px] md:text-sm text-muted-foreground truncate">
                {canAddMore ? 'Ativos no sistema' : `Limite atingido`}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-lg">Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-primary capitalize">{currentPlan}</div>
              <p className="text-[10px] md:text-sm text-muted-foreground">
                {activeClients.length}/{planLimits.maxClients === Infinity ? '∞' : planLimits.maxClients}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft col-span-2 md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-lg">{clientTermPlural} Inativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold" style={{ color: 'hsl(45 93% 47%)' }}>
                {inactiveClients.length}
              </div>
              <p className="text-[10px] md:text-sm text-muted-foreground">Desativados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros - Collapsible dropdown */}
        <Card className="shadow-soft">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="search" className="text-xs">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Nome, e-mail ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                          "h-9 text-sm pl-9 transition-all",
                          searchTerm !== '' && "ring-2 ring-primary ring-offset-1 border-primary"
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="status-filter" className="text-xs">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className={cn(
                        "h-9 text-sm transition-all",
                        statusFilter !== 'todos' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ativo">Ativos</SelectItem>
                        <SelectItem value="inativo">Inativos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Aniversariantes</Label>
                    <Button 
                      variant={birthdayFilter ? "default" : "outline"}
                      size="sm" 
                      className={cn(
                        "w-full h-9 gap-2 transition-all",
                        birthdayFilter && "bg-pink-500 hover:bg-pink-600 text-white ring-2 ring-pink-500 ring-offset-1"
                      )}
                      onClick={() => {
                        setBirthdayFilter(!birthdayFilter)
                        // Clear URL param when toggling off
                        if (birthdayFilter) {
                          searchParams.delete('filter')
                          setSearchParams(searchParams, { replace: true })
                        }
                      }}
                    >
                      <Cake className="w-4 h-4" />
                      <span className="hidden sm:inline">Do mês</span>
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Limpar</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-9"
                      onClick={() => {
                        setSearchTerm('')
                        setStatusFilter('todos')
                        setBirthdayFilter(false)
                        searchParams.delete('filter')
                        setSearchParams(searchParams, { replace: true })
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

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Lista de {clientTermPlural}</CardTitle>
            <CardDescription>
              {filteredClients.length} {getClientTerm(filteredClients.length).toLowerCase()}(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Barra de seleção em lote */}
            {filteredClients.length > 0 && (
              <BatchSelectionBar
                selectedCount={selectedClients.size}
                totalCount={filteredClients.length}
                onSelectAll={selectAllClients}
                onClearSelection={clearClientSelection}
                onBatchDelete={handleBatchDeleteClients}
                onBatchStatusChange={handleBatchStatusChange}
                showDelete={true}
                showStatusChange={true}
                statusOptions={[
                  { value: 'ativo', label: 'Ativar' },
                  { value: 'inativo', label: 'Desativar' }
                ]}
                selectLabel={`Selecionar ${clientTermPlural.toLowerCase()}`}
                deleteLabel={`Excluir ${clientTermPlural.toLowerCase()}`}
                isSelectionMode={isSelectionMode}
                onToggleSelectionMode={toggleSelectionMode}
                skipDeleteConfirmation={true}
              />
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando {clientTermPlural.toLowerCase()}...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum {clientTerm.toLowerCase()} encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client, index) => {
                  // Check if this client is over the limit (only for active clients in non-filtered views)
                  const isOverLimit = !canAddMore && 
                    statusFilter !== 'inativo' && 
                    client.ativo !== false && 
                    index >= (planLimits.maxClients || Infinity)
                  
                  return (
                    <div
                      key={client.id}
                      className={cn(
                        "flex items-center gap-3 relative",
                        isSelectionMode && "cursor-pointer",
                        isOverLimit && "opacity-60"
                      )}
                      onClick={() => isSelectionMode && toggleClientSelection(client.id)}
                    >
                      {isSelectionMode && (
                        <SelectableItemCheckbox
                          isSelected={selectedClients.has(client.id)}
                          onSelect={() => toggleClientSelection(client.id)}
                        />
                      )}
                      <div className="flex-1 relative">
                        {isOverLimit && (
                          <LockedClientOverlay
                            clientIndex={index}
                            maxClients={planLimits.maxClients || 10}
                            onUpgradeClick={() => setShowUpgradeModal(true)}
                          />
                        )}
                        <ClientCard
                          client={client}
                          onClick={() => !isSelectionMode && !isOverLimit && handleClientClick(client)}
                          onWhatsAppClick={(phone) => {
                            if (isOverLimit) {
                              setShowUpgradeModal(true)
                              return
                            }
                            const rawNumbers = String(phone || '').replace(/\D/g, '')
                            if (!rawNumbers) return
                            const countryCode = client.telefone_codigo_pais || '+55'
                            const countryDigits = countryCode.replace(/\D/g, '')
                            const whatsappUrl = `https://wa.me/${countryDigits}${rawNumbers}`
                            window.open(whatsappUrl, '_blank')
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <NewClientModal
          open={isNewClientOpen}
          onOpenChange={setIsNewClientOpen}
          onClientAdded={loadClients}
          editingClient={editingClient}
          onEditComplete={() => {
            setEditingClient(null)
            loadClients()
          }}
        />

        <ClientDetailsModal
          open={isClientDetailsOpen}
          onOpenChange={setIsClientDetailsOpen}
          client={selectedClient}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onToggleStatus={handleToggleClientStatus}
          onOpenProntuario={(clientId) => navigate(`/prontuarios?cliente=${clientId}`)}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmClient} onOpenChange={(open) => !open && setDeleteConfirmClient(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmar exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Tem certeza que deseja excluir <strong>{deleteConfirmClient?.nome}</strong>?
                </p>
                <p className="text-destructive font-medium">
                  Atenção: Esta ação irá excluir permanentemente todas as sessões e pagamentos relacionados a este {clientTerm.toLowerCase()}.
                </p>
                <p>Esta ação não pode ser desfeita.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteClient}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir {clientTerm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batch Delete Confirmation Dialog */}
        <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmar exclusão em lote
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Tem certeza que deseja excluir <strong>{selectedClients.size} {getClientTerm(selectedClients.size).toLowerCase()}(s)</strong>?
                </p>
                <p className="text-destructive font-medium">
                  Atenção: Esta ação irá excluir permanentemente todas as sessões, pacotes e pagamentos relacionados a {selectedClients.size > 1 ? 'estes' : 'este'} {getClientTerm(selectedClients.size).toLowerCase()}{selectedClients.size > 1 ? 's' : ''}.
                </p>
                <p>Esta ação não pode ser desfeita.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBatchDeleteClients}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir {selectedClients.size} {getClientTerm(selectedClients.size).toLowerCase()}(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upgrade Modal for client limit */}
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="Pacientes Ilimitados"
        />
      </div>
    </Layout>
  )
 }

 export default Clientes