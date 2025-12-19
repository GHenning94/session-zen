import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { DollarSign, Calendar } from "lucide-react"
import { formatCurrencyBR, formatTimeBR } from "@/utils/formatters"

interface NewPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentAdded?: () => void
}

interface Client {
  id: string
  nome: string
  email: string
}

interface Session {
  id: string
  client_id: string
  data: string
  horario: string
  valor: number
  status: string
}

export const NewPaymentModal = ({ open, onOpenChange, onPaymentAdded }: NewPaymentModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState("")
  const [paymentData, setPaymentData] = useState({
    valor: "",
    metodo: "",
    data: new Date().toISOString().split('T')[0],
    observacoes: "",
    sessaoExterna: false
  })

  const loadClients = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('clients')
      .select('id, nome, email')
      .eq('user_id', user.id)
      .order('nome')
    
    if (!error && data) {
      setClients(data)
    }
  }

  const loadSessions = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('sessions')
      .select('id, data, horario, status, valor, client_id')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
    
    if (!error && data) {
      setSessions(data)
    }
  }

  useEffect(() => {
    if (open) {
      loadClients()
      loadSessions()
    }
  }, [open, user])

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.nome || 'Cliente não encontrado'
  }

  const getSessionsForSelect = () => {
    return sessions.map(session => {
      const sessionDate = new Date(session.data).toLocaleDateString('pt-BR')
      const clientName = getClientName(session.client_id)
      return {
        ...session,
        label: `${clientName} - ${sessionDate} ${formatTimeBR(session.horario)} (${formatCurrencyBR(session.valor)})`
      }
    })
  }

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId)
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setPaymentData(prev => ({
        ...prev,
        valor: session.valor?.toString() || ""
      }))
    }
  }

  const handleSavePayment = async () => {
    if (!user || !selectedSession) {
      toast({
        title: "Erro",
        description: "Selecione uma sessão para registrar o pagamento",
        variant: "destructive",
      })
      return
    }

    if (!paymentData.valor || !paymentData.metodo) {
      toast({
        title: "Erro",
        description: "Preencha valor e método de pagamento",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Atualizar o status da sessão para 'realizada' e o método de pagamento
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ 
          status: 'realizada',
          valor: parseFloat(paymentData.valor),
          metodo_pagamento: paymentData.metodo
        })
        .eq('id', selectedSession)

      if (sessionError) throw sessionError

      toast({
        title: "Pagamento registrado",
        description: "Pagamento adicionado com sucesso!",
      })

      setSelectedSession("")
      setPaymentData({
        valor: "",
        metodo: "",
        data: new Date().toISOString().split('T')[0],
        observacoes: "",
        sessaoExterna: false
      })
      onOpenChange(false)
      
      if (onPaymentAdded) {
        onPaymentAdded()
      }

      // Trigger a custom event to update other components
      window.dispatchEvent(new CustomEvent('paymentAdded'))
      
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error)
      toast({
        title: "Erro",
        description: "Falha ao registrar pagamento. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            Registre o pagamento de uma sessão realizada
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="session">Sessão *</Label>
            <Select value={selectedSession} onValueChange={handleSessionSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sessão" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background max-h-[300px]">
                {getSessionsForSelect().map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sessaoExterna"
                checked={paymentData.sessaoExterna}
                onChange={(e) => setPaymentData({...paymentData, sessaoExterna: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="sessaoExterna" className="text-sm">
                Sessão realizada por fora da plataforma
              </Label>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="valor">Valor (R$) *</Label>
            <Input 
              id="valor"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={paymentData.valor}
              onChange={(e) => setPaymentData({...paymentData, valor: e.target.value})}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="metodo">Método de Pagamento *</Label>
            <Select value={paymentData.metodo} onValueChange={(value) => setPaymentData({...paymentData, metodo: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                <SelectItem value="pix">📱 PIX</SelectItem>
                <SelectItem value="cartao">💳 Cartão</SelectItem>
                <SelectItem value="transferencia">🏦 Transferência Bancária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          
          <div className="grid gap-2">
            <Label htmlFor="data">Data do Pagamento *</Label>
            <Input 
              id="data"
              type="date"
              value={paymentData.data}
              onChange={(e) => setPaymentData({...paymentData, data: e.target.value})}
            />
          </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false)
              setSelectedSession("")
              setPaymentData({
                valor: "",
                metodo: "",
                data: new Date().toISOString().split('T')[0],
                observacoes: "",
                sessaoExterna: false
              })
            }}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-gradient-primary hover:opacity-90" 
            onClick={handleSavePayment}
            disabled={isLoading}
          >
            {isLoading ? "Registrando..." : "Registrar Pagamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}