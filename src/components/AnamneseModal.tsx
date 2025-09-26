import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

interface AnamneseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  onAnamneseCreated: () => void
  existingAnamnese?: any
}

export const AnamneseModal = ({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName, 
  onAnamneseCreated,
  existingAnamnese
}: AnamneseModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const [anamnese, setAnamnese] = useState({
    motivo_consulta: '',
    queixa_principal: '',
    historico_familiar: '',
    historico_medico: '',
    antecedentes_relevantes: '',
    diagnostico_inicial: '',
    observacoes_adicionais: ''
  })

  useEffect(() => {
    if (existingAnamnese) {
      setAnamnese({
        motivo_consulta: existingAnamnese.motivo_consulta || '',
        queixa_principal: existingAnamnese.queixa_principal || '',
        historico_familiar: existingAnamnese.historico_familiar || '',
        historico_medico: existingAnamnese.historico_medico || '',
        antecedentes_relevantes: existingAnamnese.antecedentes_relevantes || '',
        diagnostico_inicial: existingAnamnese.diagnostico_inicial || '',
        observacoes_adicionais: existingAnamnese.observacoes_adicionais || ''
      })
    } else {
      setAnamnese({
        motivo_consulta: '',
        queixa_principal: '',
        historico_familiar: '',
        historico_medico: '',
        antecedentes_relevantes: '',
        diagnostico_inicial: '',
        observacoes_adicionais: ''
      })
    }
  }, [existingAnamnese, open])

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      if (existingAnamnese) {
        // Atualizar anamnese existente
        const { error } = await supabase
          .from('anamneses')
          .update(anamnese)
          .eq('id', existingAnamnese.id)

        if (error) throw error

        toast({
          title: "Anamnese atualizada",
          description: "A anamnese foi atualizada com sucesso.",
        })
      } else {
        // Criar nova anamnese
        const { error } = await supabase
          .from('anamneses')
          .insert({
            user_id: user.id,
            client_id: clientId,
            ...anamnese
          })

        if (error) throw error

        toast({
          title: "Anamnese criada",
          description: "A anamnese inicial foi criada com sucesso.",
        })
      }

      onAnamneseCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar anamnese:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a anamnese.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingAnamnese ? 'Editar Anamnese' : 'Criar Anamnese'} - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="motivo_consulta">Motivo da Consulta</Label>
              <Textarea
                id="motivo_consulta"
                value={anamnese.motivo_consulta}
                onChange={(e) => setAnamnese(prev => ({ ...prev, motivo_consulta: e.target.value }))}
                placeholder="Por que o cliente procurou atendimento?"
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="queixa_principal">Queixa Principal</Label>
              <Textarea
                id="queixa_principal"
                value={anamnese.queixa_principal}
                onChange={(e) => setAnamnese(prev => ({ ...prev, queixa_principal: e.target.value }))}
                placeholder="Principal sintoma ou problema relatado"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="historico_familiar">Histórico Familiar</Label>
            <Textarea
              id="historico_familiar"
              value={anamnese.historico_familiar}
              onChange={(e) => setAnamnese(prev => ({ ...prev, historico_familiar: e.target.value }))}
              placeholder="Histórico de doenças ou condições na família"
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="historico_medico">Histórico Médico/Psicológico</Label>
            <Textarea
              id="historico_medico"
              value={anamnese.historico_medico}
              onChange={(e) => setAnamnese(prev => ({ ...prev, historico_medico: e.target.value }))}
              placeholder="Histórico médico e psicológico do cliente"
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="antecedentes_relevantes">Antecedentes Relevantes</Label>
            <Textarea
              id="antecedentes_relevantes"
              value={anamnese.antecedentes_relevantes}
              onChange={(e) => setAnamnese(prev => ({ ...prev, antecedentes_relevantes: e.target.value }))}
              placeholder="Outros antecedentes importantes (traumáticos, sociais, etc.)"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="diagnostico_inicial">Diagnóstico Inicial (Opcional)</Label>
              <Input
                id="diagnostico_inicial"
                value={anamnese.diagnostico_inicial}
                onChange={(e) => setAnamnese(prev => ({ ...prev, diagnostico_inicial: e.target.value }))}
                placeholder="Hipótese diagnóstica inicial"
              />
            </div>

            <div>
              <Label htmlFor="observacoes_adicionais">Observações Adicionais</Label>
              <Textarea
                id="observacoes_adicionais"
                value={anamnese.observacoes_adicionais}
                onChange={(e) => setAnamnese(prev => ({ ...prev, observacoes_adicionais: e.target.value }))}
                placeholder="Outras observações relevantes"
                className="min-h-[80px]"
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
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : (existingAnamnese ? 'Atualizar Anamnese' : 'Criar Anamnese')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}