import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import RichTextEditor from "./RichTextEditor"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface EvolucaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  onEvolucaoCreated: () => void
  existingEvolucao?: any
  sessionData?: {
    id: string
    data: string
    horario: string
  }
}

export const EvolucaoModal = ({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName, 
  onEvolucaoCreated,
  existingEvolucao,
  sessionData
}: EvolucaoModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const [evolucao, setEvolucao] = useState({
    data_sessao: '',
    evolucao: ''
  })

  useEffect(() => {
    if (existingEvolucao) {
      setEvolucao({
        data_sessao: existingEvolucao.data_sessao,
        evolucao: existingEvolucao.evolucao
      })
    } else if (sessionData) {
      setEvolucao({
        data_sessao: sessionData.data,
        evolucao: ''
      })
    } else {
      const today = new Date().toISOString().split('T')[0]
      setEvolucao({
        data_sessao: today,
        evolucao: ''
      })
    }
  }, [existingEvolucao, sessionData, open])

  const handleSave = async () => {
    if (!user || !evolucao.evolucao.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a evolução.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (existingEvolucao) {
        // Atualizar evolução existente
        const { error } = await supabase
          .from('evolucoes')
          .update({
            data_sessao: evolucao.data_sessao,
            evolucao: evolucao.evolucao.trim()
          })
          .eq('id', existingEvolucao.id)

        if (error) throw error

        toast({
          title: "Evolução atualizada",
          description: "A evolução foi atualizada com sucesso.",
        })
      } else {
        // Criar nova evolução
        const { error } = await supabase
          .from('evolucoes')
          .insert({
            user_id: user.id,
            client_id: clientId,
            session_id: sessionData?.id || null,
            data_sessao: evolucao.data_sessao,
            evolucao: evolucao.evolucao.trim()
          })

        if (error) throw error

        toast({
          title: "Evolução criada",
          description: "A evolução foi criada com sucesso.",
        })
      }

      onEvolucaoCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar evolução:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a evolução.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {existingEvolucao ? 'Editar Evolução' : 'Nova Evolução'} - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="data_sessao">Data da Sessão</Label>
            <Input
              id="data_sessao"
              type="date"
              value={evolucao.data_sessao}
              onChange={(e) => setEvolucao(prev => ({ ...prev, data_sessao: e.target.value }))}
              disabled={!!sessionData} // Desabilita se vem de uma sessão específica
            />
            {sessionData && (
              <p className="text-sm text-muted-foreground mt-1">
                Vinculada à sessão de {format(new Date(sessionData.data), "dd/MM/yyyy", { locale: ptBR })} às {sessionData.horario}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="evolucao">Evolução/Nota Clínica</Label>
            <div className="mt-2 max-h-[400px] overflow-y-auto">
              <RichTextEditor
                value={evolucao.evolucao}
                onChange={(value) => setEvolucao(prev => ({ ...prev, evolucao: value }))}
                placeholder="Descreva a evolução do cliente nesta sessão, observações clínicas, progressos, etc."
                className="min-h-[200px]"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !evolucao.evolucao.trim()}>
              {loading ? 'Salvando...' : (existingEvolucao ? 'Atualizar Evolução' : 'Salvar Evolução')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}