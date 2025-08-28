import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { Plus } from "lucide-react"

interface NewClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientAdded?: () => void
}

export const NewClientModal = ({ open, onOpenChange, onClientAdded }: NewClientModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { planLimits, canAddClient } = useSubscription()
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    profession: "",
    age: "",
    notes: ""
  })

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
    }
  }, [open, user])


  const handleSaveClient = async () => {
    if (!user) return

    if (!newClient.name || !newClient.email || !newClient.phone) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos nome, email e telefone",
        variant: "destructive",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newClient.email)) {
      toast({
        title: "Erro",
        description: "Digite um email válido",
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
      const { error } = await supabase
        .from('clients')
        .insert([{
          user_id: user.id,
          nome: newClient.name,
          email: newClient.email,
          telefone: newClient.phone,
          dados_clinicos: `Profissão: ${newClient.profession}\nIdade: ${newClient.age}\nObservações: ${newClient.notes}`
        }])

      if (error) throw error

      toast({
        title: "Cliente cadastrado",
        description: "Cliente adicionado com sucesso!",
      })

      setNewClient({ name: "", email: "", phone: "", profession: "", age: "", notes: "" })
      onOpenChange(false)
      
      if (onClientAdded) {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Cadastrar Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados básicos do paciente
          </DialogDescription>
        </DialogHeader>
        
        {!canAddMore && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
            <p className="text-destructive font-medium">Limite atingido ({clients.length}/{planLimits.maxClients})</p>
            <p className="text-muted-foreground">Faça upgrade do seu plano para adicionar mais clientes.</p>
          </div>
        )}
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input 
              id="name" 
              placeholder="Nome do paciente"
              value={newClient.name}
              onChange={(e) => setNewClient({...newClient, name: e.target.value})}
              disabled={!canAddMore}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="email@exemplo.com"
              value={newClient.email}
              onChange={(e) => setNewClient({...newClient, email: e.target.value})}
              disabled={!canAddMore}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input 
              id="phone" 
              placeholder="(11) 99999-9999"
              value={newClient.phone}
              onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
              disabled={!canAddMore}
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
                disabled={!canAddMore}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profession">Profissão</Label>
              <Input 
                id="profession" 
                placeholder="Engenheiro"
                value={newClient.profession}
                onChange={(e) => setNewClient({...newClient, profession: e.target.value})}
                disabled={!canAddMore}
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
              disabled={!canAddMore}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false)
              setNewClient({ name: "", email: "", phone: "", profession: "", age: "", notes: "" })
            }}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-gradient-primary hover:opacity-90" 
            onClick={handleSaveClient}
            disabled={isLoading || !canAddMore}
          >
            {isLoading ? "Salvando..." : "Cadastrar Cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}