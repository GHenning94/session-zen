import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Package, Repeat, Info } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

type SessionType = 'individual' | 'package' | 'recurring' | 'mixed'

interface Session {
  id: string
  package_id?: string
  recurring_session_id?: string
  google_sync_type?: string
  [key: string]: any
}

interface Client {
  id: string
  nome: string
  ativo?: boolean
}

interface BatchEditByTypeModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (changes: BatchEditChanges) => void
  selectedSessions: Session[]
  clients?: Client[]
}

export interface BatchEditChanges {
  client_id?: string
  data?: string
  valor?: number
  metodo_pagamento?: string
  status?: string
  anotacoes?: string
}

export function BatchEditByTypeModal({ open, onClose, onConfirm, selectedSessions, clients = [] }: BatchEditByTypeModalProps) {
  const [clientId, setClientId] = useState<string>('')
  const [data, setData] = useState<string>('')
  const [valor, setValor] = useState<string>('')
  const [metodo, setMetodo] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [anotacoes, setAnotacoes] = useState<string>('')
  const [clientsWithPackages, setClientsWithPackages] = useState<Set<string>>(new Set())

  // Fetch clients with active packages
  useEffect(() => {
    const fetchClientsWithPackages = async () => {
      const { data: packagesData } = await supabase
        .from('packages')
        .select('client_id')
        .eq('status', 'ativo')
      
      if (packagesData) {
        setClientsWithPackages(new Set(packagesData.map(p => p.client_id)))
      }
    }
    
    if (open) {
      fetchClientsWithPackages()
    }
  }, [open])

  // Determine the session type(s) selected
  const sessionTypeInfo = useMemo(() => {
    let hasPackage = false
    let hasRecurring = false
    let hasIndividual = false

    selectedSessions.forEach(session => {
      if (session.package_id) {
        hasPackage = true
      } else if (session.recurring_session_id) {
        hasRecurring = true
      } else {
        hasIndividual = true
      }
    })

    const typeCount = [hasPackage, hasRecurring, hasIndividual].filter(Boolean).length

    if (typeCount > 1) {
      return { type: 'mixed' as SessionType, hasPackage, hasRecurring, hasIndividual }
    }
    
    if (hasPackage) return { type: 'package' as SessionType, hasPackage, hasRecurring, hasIndividual }
    if (hasRecurring) return { type: 'recurring' as SessionType, hasPackage, hasRecurring, hasIndividual }
    return { type: 'individual' as SessionType, hasPackage, hasRecurring, hasIndividual }
  }, [selectedSessions])

  // Filter clients for package sessions - only show clients with active packages
  const availableClients = useMemo(() => {
    if (sessionTypeInfo.type === 'package') {
      return clients.filter(c => clientsWithPackages.has(c.id))
    }
    return clients
  }, [clients, clientsWithPackages, sessionTypeInfo.type])

  const handleConfirm = () => {
    const changes: BatchEditChanges = {}
    
    if (sessionTypeInfo.type === 'individual') {
      if (clientId) changes.client_id = clientId
      if (data) changes.data = data
      if (valor) changes.valor = parseFloat(valor)
      if (metodo) changes.metodo_pagamento = metodo
      if (status) changes.status = status
      if (anotacoes) changes.anotacoes = anotacoes
    } else if (sessionTypeInfo.type === 'recurring') {
      if (status) changes.status = status
      if (anotacoes) changes.anotacoes = anotacoes
    } else if (sessionTypeInfo.type === 'package') {
      if (clientId) changes.client_id = clientId
      if (data) changes.data = data
      if (status) changes.status = status
      if (anotacoes) changes.anotacoes = anotacoes
    }
    
    onConfirm(changes)
    resetForm()
  }

  const resetForm = () => {
    setClientId('')
    setData('')
    setValor('')
    setMetodo('')
    setStatus('')
    setAnotacoes('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const statusOptions = [
    { value: 'agendada', label: 'Agendada' },
    { value: 'realizada', label: 'Realizada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'falta', label: 'Falta' },
  ]

  const paymentMethodOptions = [
    { value: 'pix', label: 'PIX' },
    { value: 'cartao', label: 'Cartão' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'A definir', label: 'A definir' },
  ]

  const hasChanges = useMemo(() => {
    if (sessionTypeInfo.type === 'individual') {
      return !!clientId || !!data || !!valor || !!metodo || !!status || !!anotacoes
    }
    if (sessionTypeInfo.type === 'package') {
      return !!clientId || !!data || !!status || !!anotacoes
    }
    return !!status || !!anotacoes
  }, [clientId, data, valor, metodo, status, anotacoes, sessionTypeInfo.type])

  const getTitle = () => {
    const count = selectedSessions.length
    const sessionWord = count === 1 ? 'sessão' : 'sessões'
    
    switch (sessionTypeInfo.type) {
      case 'recurring':
        return `Editar ${count} ${sessionWord} recorrente${count > 1 ? 's' : ''}`
      case 'package':
        return `Editar ${count} ${sessionWord} de pacote`
      case 'individual':
        return `Editar ${count} ${sessionWord} individual${count > 1 ? 'is' : ''}`
      default:
        return `Editar ${count} ${sessionWord}`
    }
  }

  // Mixed types - show warning message
  if (sessionTypeInfo.type === 'mixed') {
    const types: string[] = []
    if (sessionTypeInfo.hasPackage) types.push('pacote')
    if (sessionTypeInfo.hasRecurring) types.push('recorrentes')
    if (sessionTypeInfo.hasIndividual) types.push('individuais')

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Tipos de sessão diferentes
            </DialogTitle>
            <DialogDescription>
              Você selecionou sessões de tipos diferentes ({types.join(', ')}).
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-warning/10 border-warning/20">
            <Info className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              Para editar outros dados além de exclusão, selecione apenas sessões do mesmo tipo. 
              Cada tipo de sessão possui campos editáveis diferentes.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Sessões individuais:</strong> Cliente, data, valor, método, status e anotações.</p>
            <p><strong>Sessões recorrentes:</strong> Apenas status e anotações.</p>
            <p><strong>Sessões de pacote:</strong> Cliente, data, status e anotações.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Recurring sessions - only status and notes
  if (sessionTypeInfo.type === 'recurring') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              {getTitle()}
            </DialogTitle>
            <DialogDescription>
              Altere o status ou adicione anotações às sessões selecionadas.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Sessões recorrentes: apenas status e anotações podem ser editados em lote. Para editar cliente, data, horário, valor ou método de pagamento, acesse a página de <strong>Sessões Recorrentes</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="anotacoes">Anotações</Label>
              <Textarea
                id="anotacoes"
                value={anotacoes}
                onChange={(e) => setAnotacoes(e.target.value)}
                placeholder="Adicionar anotações a todas as sessões selecionadas..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta anotação será adicionada a todas as sessões selecionadas.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!hasChanges}>
              Aplicar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Package sessions - client, date, status and notes (NO value and NO time)
  if (sessionTypeInfo.type === 'package') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {getTitle()}
            </DialogTitle>
            <DialogDescription>
              Altere os campos que deseja atualizar. Apenas os campos preenchidos serão modificados.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              O valor e método de pagamento são definidos no pacote. O horário não pode ser alterado em lote.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="client">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <span>{client.nome}</span>
                        {!client.ativo && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning">
                            inativo
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Apenas clientes com pacotes ativos são exibidos.
              </p>
            </div>

            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="anotacoes">Anotações</Label>
              <Textarea
                id="anotacoes"
                value={anotacoes}
                onChange={(e) => setAnotacoes(e.target.value)}
                placeholder="Adicionar anotações a todas as sessões selecionadas..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta anotação será adicionada a todas as sessões selecionadas.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!hasChanges}>
              Aplicar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Individual sessions - client, date, value, method, status, notes (NO time)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Altere os campos que deseja atualizar. Apenas os campos preenchidos serão modificados.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            O horário não pode ser alterado em lote.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="client">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <span>{client.nome}</span>
                      {!client.ativo && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning">
                          inativo
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Novo valor"
              />
            </div>
            <div>
              <Label htmlFor="metodo">Método de Pagamento</Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="anotacoes">Anotações</Label>
            <Textarea
              id="anotacoes"
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              placeholder="Adicionar anotações a todas as sessões selecionadas..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Esta anotação será adicionada a todas as sessões selecionadas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!hasChanges}>
            Aplicar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
