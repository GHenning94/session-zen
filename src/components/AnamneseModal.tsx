import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { sanitizeMedicalTextClientSide, validateMedicalDataInput } from "@/utils/secureClientData"
import { Shield, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { encryptSensitiveData } from "@/utils/encryptionMiddleware"

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

    // Validate all medical data fields before submission
    const fieldsToValidate = [
      { field: 'motivo_consulta', value: anamnese.motivo_consulta },
      { field: 'queixa_principal', value: anamnese.queixa_principal },
      { field: 'historico_familiar', value: anamnese.historico_familiar },
      { field: 'historico_medico', value: anamnese.historico_medico },
      { field: 'antecedentes_relevantes', value: anamnese.antecedentes_relevantes },
      { field: 'observacoes_adicionais', value: anamnese.observacoes_adicionais }
    ]

    // Validate and sanitize all inputs
    for (const { field, value } of fieldsToValidate) {
      if (value) {
        const validation = validateMedicalDataInput(value)
        if (!validation.isValid) {
          toast({
            title: "Dados inválidos",
            description: `${field}: ${validation.error}`,
            variant: "destructive",
          })
          return
        }
      }
    }

    // Sanitize all medical data
    const sanitizedAnamnese = {
      motivo_consulta: sanitizeMedicalTextClientSide(anamnese.motivo_consulta),
      queixa_principal: sanitizeMedicalTextClientSide(anamnese.queixa_principal),
      historico_familiar: sanitizeMedicalTextClientSide(anamnese.historico_familiar),
      historico_medico: sanitizeMedicalTextClientSide(anamnese.historico_medico),
      antecedentes_relevantes: sanitizeMedicalTextClientSide(anamnese.antecedentes_relevantes),
      diagnostico_inicial: sanitizeMedicalTextClientSide(anamnese.diagnostico_inicial),
      observacoes_adicionais: sanitizeMedicalTextClientSide(anamnese.observacoes_adicionais)
    }

    setLoading(true)
    try {
      // Encrypt sensitive anamnese data before saving
      const encryptedAnamnese = await encryptSensitiveData('anamneses', sanitizedAnamnese);

      if (existingAnamnese) {
        // Atualizar anamnese existente - com auditoria automática via trigger
        const { error } = await supabase
          .from('anamneses')
          .update(encryptedAnamnese)
          .eq('id', existingAnamnese.id)
          .eq('user_id', user.id) // Additional security check

        if (error) throw error

        toast({
          title: "Anamnese atualizada com segurança",
          description: "A anamnese foi atualizada e o acesso foi registrado para auditoria.",
        })
      } else {
        // Criar nova anamnese - com auditoria automática via trigger
        const { error } = await supabase
          .from('anamneses')
          .insert({
            user_id: user.id,
            client_id: clientId,
            ...encryptedAnamnese
          })

        if (error) throw error

        toast({
          title: "Anamnese criada com segurança",
          description: "A anamnese inicial foi criada e o acesso foi registrado para auditoria.",
        })
      }

      onAnamneseCreated()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar anamnese:', error)
      toast({
        title: "Erro de segurança",
        description: error.message?.includes('Access denied') 
          ? "Acesso negado. Você não tem permissão para modificar esta anamnese."
          : "Não foi possível salvar a anamnese. Verifique os dados e tente novamente.",
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
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-success" />
            <DialogTitle>
              {existingAnamnese ? 'Editar Anamnese' : 'Criar Anamnese'} - {clientName}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Dados Protegidos
            </Badge>
            <span className="text-xs text-muted-foreground">
              Todas as modificações são auditadas para conformidade LGPD/HIPAA
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="motivo_consulta" className="font-bold">Motivo da Consulta</Label>
            <Textarea
              id="motivo_consulta"
              value={anamnese.motivo_consulta}
              onChange={(e) => {
                const validation = validateMedicalDataInput(e.target.value)
                if (validation.isValid) {
                  setAnamnese(prev => ({ ...prev, motivo_consulta: e.target.value }))
                }
              }}
              placeholder="Por que o cliente procurou atendimento?"
              className="min-h-[80px]"
              maxLength={10000}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{anamnese.motivo_consulta.length}/10000 caracteres</span>
              {anamnese.motivo_consulta.length > 9000 && (
                <span className="text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Próximo ao limite
                </span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="queixa_principal" className="font-bold">Queixa Principal</Label>
            <Textarea
              id="queixa_principal"
              value={anamnese.queixa_principal}
              onChange={(e) => setAnamnese(prev => ({ ...prev, queixa_principal: e.target.value }))}
              placeholder="Principal sintoma ou problema relatado"
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="historico_familiar" className="font-bold">Histórico Familiar</Label>
            <Textarea
              id="historico_familiar"
              value={anamnese.historico_familiar}
              onChange={(e) => setAnamnese(prev => ({ ...prev, historico_familiar: e.target.value }))}
              placeholder="Histórico de doenças ou condições na família"
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="historico_medico" className="font-bold">Histórico Médico/Psicológico</Label>
            <Textarea
              id="historico_medico"
              value={anamnese.historico_medico}
              onChange={(e) => setAnamnese(prev => ({ ...prev, historico_medico: e.target.value }))}
              placeholder="Histórico médico e psicológico do cliente"
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="antecedentes_relevantes" className="font-bold">Antecedentes Relevantes</Label>
            <Textarea
              id="antecedentes_relevantes"
              value={anamnese.antecedentes_relevantes}
              onChange={(e) => setAnamnese(prev => ({ ...prev, antecedentes_relevantes: e.target.value }))}
              placeholder="Outros antecedentes importantes (traumáticos, sociais, etc.)"
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="diagnostico_inicial" className="font-bold">Diagnóstico Inicial (Opcional)</Label>
            <Input
              id="diagnostico_inicial"
              value={anamnese.diagnostico_inicial}
              onChange={(e) => setAnamnese(prev => ({ ...prev, diagnostico_inicial: e.target.value }))}
              placeholder="Hipótese diagnóstica inicial"
            />
          </div>

          <div>
            <Label htmlFor="observacoes_adicionais" className="font-bold">Observações Adicionais</Label>
            <Textarea
              id="observacoes_adicionais"
              value={anamnese.observacoes_adicionais}
              onChange={(e) => setAnamnese(prev => ({ ...prev, observacoes_adicionais: e.target.value }))}
              placeholder="Outras observações relevantes"
              className="min-h-[80px]"
            />
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