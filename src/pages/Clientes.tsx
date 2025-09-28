import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { ClientAvatarUpload } from "@/components/ClientAvatarUpload"
import { ClientDetailsModal } from "@/components/ClientDetailsModal"
import { NewClientModal } from "@/components/NewClientModal"
import { GenerateRegistrationLinkModal } from "@/components/GenerateRegistrationLinkModal"
import { supabase } from "@/integrations/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useNavigate } from 'react-router-dom'

const Clientes = () => {
  console.log("Clientes component is loading - build system test")
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentPlan, planLimits, canAddClient } = useSubscription()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("todos")

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
      // Use direct client table access since security functions are working
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
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
      
      if (error) throw error
      
      toast({
        title: "Cliente removido",
        description: "O cliente foi excluído do sistema.",
      })
      
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
  const filteredClients = [...clients]
    .filter(client => {
      const matchesSearch = client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telefone?.includes(searchTerm)
      
      const matchesStatus = statusFilter === "todos" || 
        (statusFilter === "ativo" && client.ativo !== false) ||
        (statusFilter === "inativo" && client.ativo === false)
      
      return matchesSearch && matchesStatus
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie seus pacientes e acompanhe seu progresso
            </p>
          </div>
          <div className="flex gap-2">
            <GenerateRegistrationLinkModal>
              <Button variant="outline">
                <Link className="w-4 h-4 mr-2" />
                Gerar Link
              </Button>
            </GenerateRegistrationLinkModal>
            <Button 
              className="bg-gradient-primary hover:opacity-90"
              disabled={!canAddMore}
              onClick={() => {
                setEditingClient(null) // Limpar estado de edição para novo cliente
                setIsNewClientOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente {!canAddMore && `(${activeClients.length}/${planLimits.maxClients})`}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total de Clientes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{activeClients.length}</div>
              <p className="text-sm text-muted-foreground">
                {canAddMore ? 'Clientes ativos no sistema' : `Limite do plano ${currentPlan} atingido`}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Plano Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary capitalize">{currentPlan}</div>
              <p className="text-sm text-muted-foreground">
                {activeClients.length}/{planLimits.maxClients === Infinity ? '∞' : planLimits.maxClients} clientes ativos
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total de Clientes Inativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'hsl(45 93% 47%)' }}>
                {inactiveClients.length}
              </div>
              <p className="text-sm text-muted-foreground">Clientes desativados</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, e-mail ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {filteredClients.length} cliente(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client) => {
                  return (
                    <div
                      key={client.id} 
                      className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleClientClick(client)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              {client.avatar_url ? (
                                <img 
                                  src={client.avatar_url} 
                                  alt={client.nome} 
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{client.nome}</h3>
                              <Badge 
                                variant={client.ativo !== false ? "default" : "secondary"}
                                className={client.ativo === false ? "bg-yellow-500 text-white hover:bg-yellow-500/80" : ""}
                              >
                                {client.ativo !== false ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span>{client.email || "Email não informado"}</span>
                                 {(client.medicamentos && client.medicamentos.length > 0) && (
                                   <div className="flex items-center justify-center ml-2">
                                     <Pill className="w-4 h-4 text-red-500" />
                                   </div>
                                 )}
                                 {client.eh_crianca_adolescente && (
                                   <div className="flex items-center justify-center ml-2">
                                     <Baby className="w-4 h-4 text-blue-500" />
                                   </div>
                                 )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{client.telefone}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* WhatsApp button centralizado */}
                        <div className="flex items-center justify-center">
                          {client.telefone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-10 h-10 rounded-full bg-success hover:bg-success/90 text-success-foreground p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                const phone = client.telefone.replace(/\D/g, '')
                                const whatsappUrl = `https://wa.me/55${phone}`
                                window.open(whatsappUrl, '_blank')
                              }}
                              title="Enviar mensagem no WhatsApp"
                            >
                              <svg 
                                viewBox="0 0 24 24" 
                                className="w-5 h-5 fill-current"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                              </svg>
                            </Button>
                          )}
                        </div>
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
      </div>
    </Layout>
  )
 }

 export default Clientes