import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Unlink, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface UnsyncButtonProps {
  onSuccess?: () => void
}

export const UnsyncButton: React.FC<UnsyncButtonProps> = ({ onSuccess }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isUnsyncing, setIsUnsyncing] = React.useState(false)

  const handleUnsync = async () => {
    if (!user) return

    setIsUnsyncing(true)
    try {
      // Buscar sessões que foram importadas do Google Calendar
      const { data: sessions, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .ilike('anotacoes', '%Importado do Google Calendar%')

      if (fetchError) throw fetchError

      if (sessions && sessions.length > 0) {
        // Deletar todas as sessões sincronizadas
        const { error: deleteError } = await supabase
          .from('sessions')
          .delete()
          .eq('user_id', user.id)
          .ilike('anotacoes', '%Importado do Google Calendar%')

        if (deleteError) throw deleteError

        toast({
          title: "Sincronização desfeita!",
          description: `${sessions.length} sessões importadas do Google Calendar foram removidas.`,
        })
      } else {
        toast({
          title: "Nenhuma sincronização encontrada",
          description: "Não foram encontradas sessões importadas do Google Calendar.",
        })
      }

      onSuccess?.()
    } catch (error) {
      console.error('Erro ao desfazer sincronização:', error)
      toast({
        title: "Erro",
        description: "Não foi possível desfazer a sincronização.",
        variant: "destructive"
      })
    } finally {
      setIsUnsyncing(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Unlink className="w-4 h-4 mr-2" />
          Desfazer Sincronização
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desfazer Sincronização</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá remover todas as sessões que foram importadas do Google Calendar. 
            As sessões criadas diretamente no sistema não serão afetadas.
            <br /><br />
            <strong>Esta ação não pode ser desfeita.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleUnsync}
            disabled={isUnsyncing}
            className="bg-red-600 hover:bg-red-700"
          >
            {isUnsyncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Desfazer Sincronização
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}