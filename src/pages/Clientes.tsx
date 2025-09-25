import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Layout } from "@/components/Layout"
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  UserX,
  UserCheck
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { ClientAvatarUpload } from "@/components/ClientAvatarUpload"
import { NewSessionModal } from "@/components/NewSessionModal"
import { supabase } from "@/integrations/supabase/client"

const Clientes = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentPlan, planLimits, canAddClient } = useSubscription()
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [newSessionClientId, setNewSessionClientId] = useState<string | null>(null)
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    profession: "",
    age: "",
    notes: "",
    avatarUrl: ""
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

  const setSelectedClientForSession = (client: any) => {
    setNewSessionClientId(client.id)
    setIsNewSessionOpen(true)
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
        dados_clinicos: newClient.notes || ""
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

      setNewClient({ name: "", email: "", phone: "", profession: "", age: "", notes: "", avatarUrl: "" })
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
      notes: client.dados_clinicos || "",
      avatarUrl: client.avatar_url || ""
    })
    setIsNewClientOpen(true)
  }

  const activeClients = clients.filter(client => client.ativo !== false)
  const inactiveClients = clients.filter(client => client.ativo === false)
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
                <div className="flex flex-col items-center gap-4">
                  <ClientAvatarUpload 
                    clientName={newClient.name || "Novo Cliente"}
                    currentAvatarUrl={newClient.avatarUrl}
                    onAvatarChange={(url) => setNewClient({...newClient, avatarUrl: url})}
                    size="lg"
                  />
                </div>
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
                  setNewClient({ name: "", email: "", phone: "", profession: "", age: "", notes: "", avatarUrl: "" })
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

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {clients.length} cliente(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando clientes...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active clients */}
                {activeClients.filter(client =>
                  client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.telefone?.includes(searchTerm)
                ).map((client) => (
                  <div key={client.id} className="bg-card p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ClientAvatarUpload
                          clientName={client.nome}
                          currentAvatarUrl={client.avatar_url}
                          onAvatarChange={(url) => handleAvatarChange(client.id, url)}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{client.nome}</h3>
                            <Badge variant="default">Ativo</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {client.email && <p>{client.email}</p>}
                            {client.telefone && <p>{client.telefone}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClient(client)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver detalhes
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg">
                            <DropdownMenuItem onClick={() => handleEditClient(client)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedClientForSession(client)}>
                              <Calendar className="w-4 h-4 mr-2" />
                              Agendar sessão
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleClientStatus(client.id, client.ativo)}>
                              <UserX className="w-4 h-4 mr-2" />
                              Desativar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClient(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Separator */}
                {inactiveClients.filter(client =>
                  client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.telefone?.includes(searchTerm)
                ).length > 0 && (
                  <div className="py-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-background px-4 text-muted-foreground">Clientes Inativos</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inactive clients */}
                {inactiveClients.filter(client =>
                  client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.telefone?.includes(searchTerm)
                ).map((client) => (
                  <div key={client.id} className="bg-card p-4 rounded-lg border shadow-sm opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ClientAvatarUpload
                          clientName={client.nome}
                          currentAvatarUrl={client.avatar_url}
                          onAvatarChange={(url) => handleAvatarChange(client.id, url)}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{client.nome}</h3>
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">Inativo</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {client.email && <p>{client.email}</p>}
                            {client.telefone && <p>{client.telefone}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClient(client)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver detalhes
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg">
                            <DropdownMenuItem onClick={() => handleEditClient(client)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedClientForSession(client)}>
                              <Calendar className="w-4 h-4 mr-2" />
                              Agendar sessão
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleClientStatus(client.id, client.ativo)}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Ativar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClient(client.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}

                {activeClients.length === 0 && inactiveClients.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClient && (
          <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Detalhes do Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <ClientAvatarUpload
                    clientName={selectedClient.nome}
                    currentAvatarUrl={selectedClient.avatar_url}
                    onAvatarChange={(url) => handleAvatarChange(selectedClient.id, url)}
                    size="lg"
                  />
                  <div>
                    <h3 className="text-xl font-semibold">{selectedClient.nome}</h3>
                    <Badge variant={selectedClient.ativo ? "default" : "outline"} 
                           className={selectedClient.ativo ? "" : "border-yellow-500 text-yellow-600 bg-yellow-50"}>
                      {selectedClient.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p><strong>Email:</strong> {selectedClient.email || "Não informado"}</p>
                  <p><strong>Telefone:</strong> {selectedClient.telefone || "Não informado"}</p>
                  <p><strong>Dados Clínicos:</strong> {selectedClient.dados_clinicos || "Não informado"}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <NewSessionModal
          open={isNewSessionOpen}
          onOpenChange={(open) => {
            setIsNewSessionOpen(open)
            if (!open) setNewSessionClientId(null)
          }}
          selectedClientId={newSessionClientId}
          onSessionCreated={() => {
            toast({
              title: "Sessão agendada!",
              description: "A sessão foi agendada com sucesso.",
            })
          }}
        />
      </div>
    </Layout>
  )
}

export default Clientes