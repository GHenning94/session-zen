import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface BatchEditModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (changes: BatchEditChanges) => void
  selectedCount: number
  type: 'sessions' | 'payments'
}

export interface BatchEditChanges {
  valor?: number
  metodo_pagamento?: string
  status?: string
}

export function BatchEditModal({ open, onClose, onConfirm, selectedCount, type }: BatchEditModalProps) {
  const [editValor, setEditValor] = useState(false)
  const [editMetodo, setEditMetodo] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  
  const [valor, setValor] = useState<string>('')
  const [metodo, setMetodo] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  const handleConfirm = () => {
    const changes: BatchEditChanges = {}
    if (editValor && valor) {
      changes.valor = parseFloat(valor)
    }
    if (editMetodo && metodo) {
      changes.metodo_pagamento = metodo
    }
    if (editStatus && status) {
      changes.status = status
    }
    onConfirm(changes)
    resetForm()
  }

  const resetForm = () => {
    setEditValor(false)
    setEditMetodo(false)
    setEditStatus(false)
    setValor('')
    setMetodo('')
    setStatus('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const sessionStatusOptions = [
    { value: 'agendada', label: 'Agendada' },
    { value: 'realizada', label: 'Realizada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'falta', label: 'Falta' },
  ]

  const paymentStatusOptions = [
    { value: 'pago', label: 'Pago' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'cancelado', label: 'Cancelado' },
  ]

  const paymentMethodOptions = [
    { value: 'pix', label: 'PIX' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'A definir', label: 'A definir' },
  ]

  const statusOptions = type === 'sessions' ? sessionStatusOptions : paymentStatusOptions
  const hasChanges = (editValor && valor) || (editMetodo && metodo) || (editStatus && status)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar {selectedCount} {type === 'sessions' ? (selectedCount === 1 ? 'sessão' : 'sessões') : (selectedCount === 1 ? 'pagamento' : 'pagamentos')}</DialogTitle>
          <DialogDescription>
            Selecione os campos que deseja alterar. As mudanças serão aplicadas a todos os itens selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Valor */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-valor" 
                checked={editValor} 
                onCheckedChange={(checked) => setEditValor(checked === true)}
              />
              <Label htmlFor="edit-valor" className="cursor-pointer">Alterar valor</Label>
            </div>
            {editValor && (
              <div className="pl-6">
                <Label htmlFor="valor">Novo valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-metodo" 
                checked={editMetodo} 
                onCheckedChange={(checked) => setEditMetodo(checked === true)}
              />
              <Label htmlFor="edit-metodo" className="cursor-pointer">Alterar método de pagamento</Label>
            </div>
            {editMetodo && (
              <div className="pl-6">
                <Label htmlFor="metodo">Novo método</Label>
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
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-status" 
                checked={editStatus} 
                onCheckedChange={(checked) => setEditStatus(checked === true)}
              />
              <Label htmlFor="edit-status" className="cursor-pointer">Alterar status</Label>
            </div>
            {editStatus && (
              <div className="pl-6">
                <Label htmlFor="status">Novo status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
            )}
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
