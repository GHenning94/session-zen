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
  Calendar,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserX
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"

const Clientes = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentPlan, planLimits, canAddClient } = useSubscription()
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Formulário para novo cliente
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    profession: "",
    age: "",
    notes: ""
  })

  // Carregar clientes do Supabase
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
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [user])

  const handleSaveClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, e-mail e telefone.",
        variant: "destructive"
      })
      return
    }

    // Validar limite do plano
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
        dados_clinicos: `Profissão: ${newClient.profession}\nIdade: ${newClient.age}\nObservações: ${newClient.notes}`
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

      setNewClient({ name: "", email: "", phone: "", profession: "", age: "", notes: "" })
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
    setNewClient({
      name: client.nome || "",
      email: client.email || "",
      phone: client.telefone || "",
      profession: "",
      age: "",
      notes: client.dados_clinicos || ""
    })
    setIsNewClientOpen(true)
  }

  const filteredClients = clients.filter(client =>
    client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telefone?.includes(searchTerm)
  )

  const activeClients = clients.filter(client => client.ativo !== false)
  const inactiveClients = clients.filter(client => client.ativo === false)

  const canAddMore = canAddClient(activeClients.length)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie seus pacientes e acompanhe seu progresso
            </p>
          </div>
          <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
            <DialogTrigger asChild>
                <Button 
                className="bg-gradient-primary hover:opacity-90"
                disabled={!canAddMore}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente {!canAddMore && `(${activeClients.length}/${planLimits.maxClients})`}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
                <DialogDescription>
                  Preencha os dados básicos do paciente
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input 
                    id="name" 
                    placeholder="Nome do paciente"
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@exemplo.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    placeholder="(11) 99999-9999"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="age">Idade</Label>
                    <Input 
                      id="age" 
                      type="number" 
                      placeholder="30"
                      value={newClient.age}
                      onChange={(e) => setNewClient({...newClient, age: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profession">Profissão</Label>
                    <Input 
                      id="profession" 
                      placeholder="Engenheiro"
                      value={newClient.profession}
                      onChange={(e) => setNewClient({...newClient, profession: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações Iniciais</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Motivo da consulta, observações importantes..." 
                    className="resize-none"
                    value={newClient.notes}
                    onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsNewClientOpen(false)
                  setEditingClient(null)
                  setNewClient({ name: "", email: "", phone: "", profession: "", age: "", notes: "" })
                }}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-gradient-primary hover:opacity-90" 
                  onClick={handleSaveClient}
                  disabled={isLoading}
                >
                  {isLoading ? "Salvando..." : (editingClient ? "Atualizar Cliente" : "Cadastrar Cliente")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total de Clientes</CardTitle>
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

        {/* Search and Filters */}
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
            </div>
          </CardHeader>
        </Card>

        {/* Clients List */}
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
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-card rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{client.nome}</h3>
                          {client.ativo === false ? (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-yellow-500 text-yellow-600 bg-yellow-50"
                            >
                              inativo
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">
                              ativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.telefone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background border shadow-lg z-50">
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Calendar className="w-4 h-4 mr-2" />
                            Agendar Sessão
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-yellow-600" 
                            onClick={() => handleToggleClientStatus(client.id, client.ativo !== false)}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            {client.ativo === false ? 'Reativar' : 'Desativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={() => handleDeleteClient(client.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Details Modal */}
        {selectedClient && (
          <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {selectedClient.nome}
                </DialogTitle>
                <DialogDescription>
                  Informações completas do cliente
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Informações Básicas</TabsTrigger>
                  <TabsTrigger value="clinical">Dados Clínicos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">E-mail</Label>
                      <p className="text-sm">{selectedClient.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                      <p className="text-sm">{selectedClient.telefone}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Cadastro</Label>
                    <p className="text-sm">{new Date(selectedClient.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="clinical" className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Dados Clínicos</Label>
                    <p className="text-sm whitespace-pre-line">{selectedClient.dados_clinicos || 'Nenhum dado clínico registrado.'}</p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedClient(null)}>
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  )
}

export default Clientes