import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { SimpleRichTextEditor } from "./SimpleRichTextEditor"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSessionStatusColor, getSessionStatusLabel, calculateSessionStatus } from "@/utils/sessionStatusUtils"
import { formatDateBR, formatTimeBR } from "@/utils/formatters"
import { Badge } from "@/components/ui/badge"
import { encryptSensitiveData } from "@/utils/encryptionMiddleware"
import { AlertTriangle } from "lucide-react"

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
  initialContent?: string
}

export const EvolucaoModal = ({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName, 
  onEvolucaoCreated,
  existingEvolucao,
  sessionData,
  initialContent
}: EvolucaoModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [inputMode, setInputMode] = useState<'manual' | 'session'>('manual')
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false)
  const [existingEvolucaoForSession, setExistingEvolucaoForSession] = useState<any>(null)

  const [evolucao, setEvolucao] = useState({
    data_sessao: '',
    horario_sessao: '',
    session_id: '',
    evolucao: ''
  })

  useEffect(() => {
    if (existingEvolucao) {
      setEvolucao({
        data_sessao: existingEvolucao.data_sessao,
        horario_sessao: '',
        session_id: existingEvolucao.session_id || '',
        evolucao: existingEvolucao.evolucao
      })
      setInputMode(existingEvolucao.session_id ? 'session' : 'manual')
    } else if (sessionData) {
      setEvolucao({
        data_sessao: sessionData.data,
        horario_sessao: sessionData.horario,
        session_id: sessionData.id,
        evolucao: initialContent || ''
      })
      setInputMode('session')
    } else {
      const today = new Date().toISOString().split('T')[0]
      setEvolucao({
        data_sessao: today,
        horario_sessao: '',
        session_id: '',
        evolucao: initialContent || ''
      })
      setInputMode('manual')
    }
  }, [existingEvolucao, sessionData, initialContent, open])

  // Carregar sessões do cliente quando o modal abre
  useEffect(() => {
    if (open && clientId && user) {
      loadClientSessions()
    }
  }, [open, clientId, user])

  const loadClientSessions = async () => {
    try {
      console.log('Carregando sessões para cliente:', clientId, 'usuário:', user?.id)
      const { data, error } = await supabase
        .from('sessions')
        .select('id, data, horario, status')
        .eq('client_id', clientId)
        .eq('user_id', user?.id)
        .order('data', { ascending: false })
        .order('horario', { ascending: false })

      if (error) {
        console.error('Erro na query:', error)
        throw error
      }
      
      // Aplicar o mesmo cálculo de status que é usado na página de sessões
      const updatedSessions = (data || []).map(session => ({
        ...session,
        status: calculateSessionStatus(session.data, session.horario, session.status)
      }))
      
      console.log('Sessões encontradas:', data)
      console.log('Sessões com status atualizados:', updatedSessions)
      setSessions(updatedSessions)
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
      toast({
        title: "Aviso",
        description: "Não foi possível carregar as sessões do cliente.",
        variant: "default",
      })
    }
  }

  const checkExistingEvolucao = async (sessionId: string): Promise<any | null> => {
    if (!user || !sessionId) return null
    
    const { data, error } = await supabase
      .from('evolucoes')
      .select('id, data_sessao, evolucao, session_id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar evolução existente:', error)
    }
    
    return data || null
  }

  const handleSessionSelect = async (sessionId: string) => {
    const selectedSession = sessions.find(s => s.id === sessionId)
    if (selectedSession) {
      // Verificar se já existe evolução para esta sessão
      if (!existingEvolucao) {
        const existing = await checkExistingEvolucao(sessionId)
        if (existing) {
          setExistingEvolucaoForSession(existing)
          setDuplicateWarningOpen(true)
          return
        }
      }
      
      setEvolucao(prev => ({
        ...prev,
        data_sessao: selectedSession.data,
        horario_sessao: selectedSession.horario,
        session_id: sessionId
      }))
    }
  }

  const handleSave = async () => {
    if (!user || !evolucao.evolucao.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a evolução.",
        variant: "destructive",
      })
      return
    }

    // Verificar duplicidade antes de salvar (para novas evoluções)
    if (!existingEvolucao && evolucao.session_id) {
      const existing = await checkExistingEvolucao(evolucao.session_id)
      if (existing) {
        setExistingEvolucaoForSession(existing)
        setDuplicateWarningOpen(true)
        return
      }
    }

    setLoading(true)
    try {
      const evolucaoData = {
        data_sessao: evolucao.data_sessao,
        evolucao: evolucao.evolucao.trim()
      };

      // Encrypt sensitive evolucao data before saving
      const encryptedEvolucao = await encryptSensitiveData('evolucoes', evolucaoData);

      if (existingEvolucao) {
        // Atualizar evolução existente
        const { error } = await supabase
          .from('evolucoes')
          .update(encryptedEvolucao)
          .eq('id', existingEvolucao.id)

        if (error) throw error

        toast({
          title: "Evolução atualizada",
          description: "A evolução foi atualizada com sucesso.",
        })
      } else {
        // Criar nova evolução
        const insertData = {
          user_id: user.id,
          client_id: clientId,
          session_id: evolucao.session_id || null,
          data_sessao: encryptedEvolucao.data_sessao as string,
          evolucao: encryptedEvolucao.evolucao as string
        };
        
        const { error } = await supabase
          .from('evolucoes')
          .insert(insertData)

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
    <>
    <AlertDialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Evolução já existente
          </AlertDialogTitle>
          <AlertDialogDescription>
            Já existe uma evolução registrada para esta sessão. Deseja editar a evolução existente?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setDuplicateWarningOpen(false)
            setExistingEvolucaoForSession(null)
            setEvolucao(prev => ({ ...prev, session_id: '' }))
          }}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            setDuplicateWarningOpen(false)
            onOpenChange(false)
            // Trigger edit of existing evolucao - would need callback
            toast({
              title: "Dica",
              description: "Localize a evolução existente e clique em editar.",
            })
          }}>
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {existingEvolucao ? 'Editar Evolução' : 'Nova Evolução'} - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Modo de entrada */}
          {!sessionData && (
            <div>
              <Label>Modo de Entrada</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={inputMode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('manual')}
                >
                  Manual
                </Button>
                <Button
                  type="button"
                  variant={inputMode === 'session' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode('session')}
                >
                  Selecionar Sessão
                </Button>
              </div>
            </div>
          )}

          {/* Entrada manual */}
          {inputMode === 'manual' && !sessionData && (
            <>
              <div>
                <Label htmlFor="data_sessao">Data da Sessão</Label>
                <Input
                  id="data_sessao"
                  type="date"
                  value={evolucao.data_sessao}
                  onChange={(e) => setEvolucao(prev => ({ ...prev, data_sessao: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="horario_sessao">Horário da Sessão</Label>
                <Input
                  id="horario_sessao"
                  type="time"
                  value={evolucao.horario_sessao}
                  onChange={(e) => setEvolucao(prev => ({ ...prev, horario_sessao: e.target.value }))}
                  placeholder="09:00"
                />
              </div>
            </>
          )}

          {/* Seleção de sessão */}
          {inputMode === 'session' && !sessionData && (
            <div>
              <Label>Selecionar Sessão</Label>
              <Select
                value={evolucao.session_id}
                onValueChange={(value) => {
                  setEvolucao(prev => ({ ...prev, session_id: value }))
                  handleSessionSelect(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma sessão" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>
                          {formatDateBR(session.data)} às {formatTimeBR(session.horario)}
                        </span>
                        <Badge variant={getSessionStatusColor(session.status)} className="ml-2">
                          {getSessionStatusLabel(session.status)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {evolucao.session_id && (
                <p className="text-sm text-muted-foreground mt-1">
                  Sessão de {formatDateBR(evolucao.data_sessao)} às {formatTimeBR(evolucao.horario_sessao)}
                </p>
              )}
            </div>
          )}

          {/* Entrada via sessionData (quando vem de uma sessão específica) */}
          {sessionData && (
            <div>
              <Label>Sessão Vinculada</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  {formatDateBR(sessionData.data)} às {formatTimeBR(sessionData.horario)}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="evolucao">Evolução/Nota Clínica</Label>
            <div className="mt-2 max-h-[400px] overflow-y-auto">
              <SimpleRichTextEditor
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
    </>
  )
}