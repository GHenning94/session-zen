import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import RichTextEditor from "./RichTextEditor"

interface SessionNoteModalProps {
  session: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onNoteCreated: () => void
  editingNote?: any
}

export const SessionNoteModal = ({ 
  session, 
  open, 
  onOpenChange, 
  onNoteCreated,
  editingNote 
}: SessionNoteModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setNotes('')
    } else if (editingNote) {
      setNotes(editingNote.notes || '')
    }
  }, [open, editingNote])

  const handleSave = async () => {
    if (!user || !notes.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, adicione uma anotação.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (editingNote) {
        // Editando anotação existente
        const { error } = await supabase
          .from('session_notes')
          .update({
            notes: notes.trim()
          })
          .eq('id', editingNote.id)

        if (error) throw error

        toast({
          title: "Anotação atualizada",
          description: "A anotação foi atualizada com sucesso.",
        })
      } else {
        // Criando nova anotação
        if (!session) {
          toast({
            title: "Erro",
            description: "Sessão não encontrada.",
            variant: "destructive",
          })
          return
        }

        const { error } = await supabase
          .from('session_notes')
          .insert({
            user_id: user.id,
            client_id: session.client_id,
            session_id: session.id,
            notes: notes.trim()
          })

        if (error) throw error

        toast({
          title: "Anotação adicionada",
          description: "A anotação da sessão foi salva com sucesso.",
        })
      }

      onNoteCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar anotação:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a anotação.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingNote ? 'Editar Anotação' : `Adicionar Anotação - ${session?.clients?.nome || editingNote?.clients?.nome}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Anotação da Sessão</Label>
            <RichTextEditor
              value={notes}
              onChange={setNotes}
              placeholder="Digite suas observações sobre a sessão..."
              className="mt-2"
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
            <Button onClick={handleSave} disabled={loading || !notes.trim()}>
              {loading ? 'Salvando...' : (editingNote ? 'Atualizar Anotação' : 'Salvar Anotação')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}