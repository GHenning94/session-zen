import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { Plus, Zap, ArrowUpRight, Trash2 } from "lucide-react"
import { ClientAvatarUpload } from "@/components/ClientAvatarUpload"

interface NewClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientAdded?: () => void
  editingClient?: any
  onEditComplete?: () => void
}

export const NewClientModal = ({ open, onOpenChange, onClientAdded, editingClient, onEditComplete }: NewClientModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { planLimits, canAddClient } = useSubscription()
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [isQuickRegistration, setIsQuickRegistration] = useState(true)
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
  const [currentMedicamento, setCurrentMedicamento] = useState("")

  // Phone formatting function
  const formatPhone = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '')
    
    // Apply mask: (XX) XXXXX-XXXX
    if (numbers.length === 0) {
      return ''
    } else if (numbers.length <= 2) {
      return `(${numbers}`
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  // Phone validation function
  const isValidPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '')
    return numbers.length === 11 // DDD (2 digits) + 9 digits
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setNewClient({...newClient, phone: formatted})
  }

  const loadClients = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
    
    if (!error && data) {
      setClients(data)
    }
  }

  useEffect(() => {
    if (open) {
      loadClients()
      
      // If editing client, populate form
      if (editingClient) {
        setNewClient({
          name: editingClient.nome || "",
          email: editingClient.email || "",
          phone: editingClient.telefone || "",
          profession: editingClient.profissao || "",
          age: "",
          notes: editingClient.dados_clinicos || "",
          avatarUrl: editingClient.avatar_url || "",
          cpf: editingClient.cpf || "",
          dataNascimento: editingClient.data_nascimento || "",
          endereco: editingClient.endereco || "",
          pais: editingClient.pais || "",
          genero: editingClient.genero || "",
          planoSaude: editingClient.plano_saude || "",
          tratamento: editingClient.tratamento || "",
          medicamentos: editingClient.medicamentos || [],
          contatoEmergencia1Nome: editingClient.contato_emergencia_1_nome || "",
          contatoEmergencia1Telefone: editingClient.contato_emergencia_1_telefone || "",
          contatoEmergencia2Nome: editingClient.contato_emergencia_2_nome || "",
          contatoEmergencia2Telefone: editingClient.contato_emergencia_2_telefone || "",
          nomePai: editingClient.nome_pai || "",
          telefonePai: editingClient.telefone_pai || "",
          nomeMae: editingClient.nome_mae || "",
          telefoneMae: editingClient.telefone_mae || "",
          ehCriancaAdolescente: editingClient.eh_crianca_adolescente || false,
          emergenciaIgualPais: editingClient.emergencia_igual_pais || false
        })
      }
    }
  }, [open, user, editingClient])


  const addMedicamento = () => {
    if (currentMedicamento.trim()) {
      setNewClient({
        ...newClient,
        medicamentos: [...newClient.medicamentos, currentMedicamento.trim()]
      })
      setCurrentMedicamento("")
    }
  }

  const removeMedicamento = (index: number) => {
    setNewClient({
      ...newClient,
      medicamentos: newClient.medicamentos.filter((_, i) => i !== index)
    })
  }

  const resetForm = () => {
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
    setCurrentMedicamento("")
    setIsQuickRegistration(true)
  }

  const handleSaveClient = async () => {
    if (!user) return

    if (!newClient.name || (!isQuickRegistration && !newClient.email) || !newClient.phone) {
      toast({
        title: "Erro",
        description: isQuickRegistration 
          ? "Preencha pelo menos nome e telefone" 
          : "Preencha pelo menos nome, email e telefone",
        variant: "destructive",
      })
      return
    }

    if (!isQuickRegistration && newClient.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newClient.email)) {
        toast({
          title: "Erro",
          description: "Digite um email válido",
          variant: "destructive",
        })
        return
      }
    }

    if (!isValidPhone(newClient.phone)) {
      toast({
        title: "Erro",
        description: "Digite um telefone válido no formato (11) 98919-6789",
        variant: "destructive",
      })
      return
    }

    if (!canAddClient(clients.length)) {
      toast({
        title: "Limite atingido",
        description: `Seu plano permite apenas ${planLimits.maxClients} clientes. Faça upgrade para adicionar mais.`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      const clientData = {
        user_id: user.id,
        nome: newClient.name,
        email: newClient.email || null,
        telefone: newClient.phone,
        avatar_url: newClient.avatarUrl || null,
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
        dados_clinicos: newClient.notes ? `Observações: ${newClient.notes}` : null
      }

      let error
      if (editingClient) {
        // Update existing client
        const result = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
        error = result.error
      } else {
        // Insert new client
        const result = await supabase
          .from('clients')
          .insert([clientData])
        error = result.error
      }

      if (error) throw error

      toast({
        title: editingClient ? "Cliente atualizado" : "Cliente cadastrado",
        description: editingClient ? "Cliente atualizado com sucesso!" : "Cliente adicionado com sucesso!",
      })

      resetForm()
      onOpenChange(false)
      
      if (editingClient && onEditComplete) {
        onEditComplete()
      } else if (onClientAdded) {
        onClientAdded()
      }

      // Trigger a custom event to update other components
      window.dispatchEvent(new CustomEvent('clientAdded'))
      
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error)
      toast({
        title: "Erro",
        description: "Falha ao cadastrar cliente. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const canAddMore = canAddClient(clients.length)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {editingClient ? "Editar Paciente" : "Adicionar Paciente"}
          </DialogTitle>
          <div className="flex items-center gap-4">
            <Button
              variant={isQuickRegistration ? "default" : "outline"}
              size="sm"
              onClick={() => setIsQuickRegistration(true)}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Cadastro rápido
            </Button>
            <Button
              variant={!isQuickRegistration ? "default" : "outline"}
              size="sm"
              onClick={() => setIsQuickRegistration(false)}
              className="flex items-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              Cadastro completo
            </Button>
          </div>
        </DialogHeader>
        
        {!canAddMore && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
            <p className="text-destructive font-medium">Limite atingido ({clients.length}/{planLimits.maxClients})</p>
            <p className="text-muted-foreground">Faça upgrade do seu plano para adicionar mais clientes.</p>
          </div>
        )}
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <ClientAvatarUpload 
                clientName={newClient.name || "Novo Cliente"}
                currentAvatarUrl={newClient.avatarUrl}
                onAvatarChange={(url) => setNewClient({...newClient, avatarUrl: url})}
                size="lg"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="crianca-adolescente" 
                checked={newClient.ehCriancaAdolescente}
                onCheckedChange={(checked) => 
                  setNewClient({...newClient, ehCriancaAdolescente: checked as boolean})
                }
                disabled={!canAddMore}
              />
              <Label htmlFor="crianca-adolescente">Criança/Adolescente</Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input 
                id="name" 
                placeholder="Digite o nome"
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                disabled={!canAddMore}
              />
            </div>

            {!isQuickRegistration && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input 
                    id="cpf" 
                    placeholder="Digite o CPF"
                    value={newClient.cpf}
                    onChange={(e) => setNewClient({...newClient, cpf: e.target.value})}
                    disabled={!canAddMore}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="data-nascimento">Data de Nascimento</Label>
                  <Input 
                    id="data-nascimento" 
                    type="date"
                    placeholder="dd/mm/aaaa"
                    value={newClient.dataNascimento}
                    onChange={(e) => setNewClient({...newClient, dataNascimento: e.target.value})}
                    disabled={!canAddMore}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="Digite o email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    disabled={!canAddMore}
                  />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone *</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select defaultValue="+55">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+55">🇧🇷 +55 (Brasil)</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  id="phone" 
                  placeholder="Digite o telefone"
                  value={newClient.phone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  disabled={!canAddMore}
                  className="col-span-2"
                />
              </div>
            </div>

            {newClient.ehCriancaAdolescente && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome-pai">Nome do Pai</Label>
                    <Input 
                      id="nome-pai" 
                      placeholder="Digite o nome do pai"
                      value={newClient.nomePai}
                      onChange={(e) => setNewClient({...newClient, nomePai: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone-pai">Telefone do Pai</Label>
                    <Input 
                      id="telefone-pai" 
                      placeholder="Digite o telefone do pai"
                      value={newClient.telefonePai}
                      onChange={(e) => setNewClient({...newClient, telefonePai: formatPhone(e.target.value)})}
                      disabled={!canAddMore}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome-mae">Nome da Mãe</Label>
                    <Input 
                      id="nome-mae" 
                      placeholder="Digite o nome da mãe"
                      value={newClient.nomeMae}
                      onChange={(e) => setNewClient({...newClient, nomeMae: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone-mae">Telefone da Mãe</Label>
                    <Input 
                      id="telefone-mae" 
                      placeholder="Digite o telefone da mãe"
                      value={newClient.telefoneMae}
                      onChange={(e) => setNewClient({...newClient, telefoneMae: formatPhone(e.target.value)})}
                      disabled={!canAddMore}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="emergencia-igual-pais" 
                    checked={newClient.emergenciaIgualPais}
                    onCheckedChange={(checked) => 
                      setNewClient({...newClient, emergenciaIgualPais: checked as boolean})
                    }
                    disabled={!canAddMore}
                  />
                  <Label htmlFor="emergencia-igual-pais">Contato de emergência igual ao contato de pai e mãe</Label>
                </div>
              </>
            )}

            {!isQuickRegistration && !newClient.ehCriancaAdolescente && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emergencia1-nome">Nome Contato Emergência 1</Label>
                    <Input 
                      id="emergencia1-nome" 
                      placeholder="Digite o nome"
                      value={newClient.contatoEmergencia1Nome}
                      onChange={(e) => setNewClient({...newClient, contatoEmergencia1Nome: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencia1-telefone">Telefone Contato de Emergência 1</Label>
                    <Input 
                      id="emergencia1-telefone" 
                      placeholder="Digite o telefone de emergência 1"
                      value={newClient.contatoEmergencia1Telefone}
                      onChange={(e) => setNewClient({...newClient, contatoEmergencia1Telefone: formatPhone(e.target.value)})}
                      disabled={!canAddMore}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emergencia2-nome">Nome Contato Emergência 2</Label>
                    <Input 
                      id="emergencia2-nome" 
                      placeholder="Digite o nome"
                      value={newClient.contatoEmergencia2Nome}
                      onChange={(e) => setNewClient({...newClient, contatoEmergencia2Nome: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencia2-telefone">Telefone Contato de Emergência 2</Label>
                    <Input 
                      id="emergencia2-telefone" 
                      placeholder="Digite o telefone de emergência 2"
                      value={newClient.contatoEmergencia2Telefone}
                      onChange={(e) => setNewClient({...newClient, contatoEmergencia2Telefone: formatPhone(e.target.value)})}
                      disabled={!canAddMore}
                    />
                  </div>
                </div>
              </>
            )}

            {!isQuickRegistration && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input 
                    id="endereco" 
                    placeholder="Digite o endereço completo: CEP / Bairro etc (opcional)"
                    value={newClient.endereco}
                    onChange={(e) => setNewClient({...newClient, endereco: e.target.value})}
                    disabled={!canAddMore}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pais">País</Label>
                  <Input 
                    id="pais" 
                    placeholder="Digite para buscar..."
                    value={newClient.pais}
                    onChange={(e) => setNewClient({...newClient, pais: e.target.value})}
                    disabled={!canAddMore}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="genero">Gênero</Label>
                    <Input 
                      id="genero" 
                      placeholder="Digite para buscar..."
                      value={newClient.genero}
                      onChange={(e) => setNewClient({...newClient, genero: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input 
                      id="profissao" 
                      placeholder="Digite para buscar..."
                      value={newClient.profession}
                      onChange={(e) => setNewClient({...newClient, profession: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="plano-saude">Plano de Saúde</Label>
                    <Input 
                      id="plano-saude" 
                      placeholder="Digite para buscar..."
                      value={newClient.planoSaude}
                      onChange={(e) => setNewClient({...newClient, planoSaude: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tratamento">Tratamento</Label>
                    <Input 
                      id="tratamento" 
                      placeholder="Digite para buscar..."
                      value={newClient.tratamento}
                      onChange={(e) => setNewClient({...newClient, tratamento: e.target.value})}
                      disabled={!canAddMore}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="medicamento">Medicamento</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="medicamento" 
                      placeholder="Digite para buscar..."
                      value={currentMedicamento}
                      onChange={(e) => setCurrentMedicamento(e.target.value)}
                      disabled={!canAddMore}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addMedicamento}
                      disabled={!currentMedicamento.trim() || !canAddMore}
                      className="bg-gradient-primary hover:opacity-90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Medicamento
                    </Button>
                  </div>
                  {newClient.medicamentos.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {newClient.medicamentos.map((med, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{med}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMedicamento(index)}
                            disabled={!canAddMore}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false)
              resetForm()
            }}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-gradient-primary hover:opacity-90" 
            onClick={handleSaveClient}
            disabled={isLoading || !canAddMore}
          >
            {isLoading ? "Salvando..." : (editingClient ? "Salvar Alterações" : "Cadastrar Cliente")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}