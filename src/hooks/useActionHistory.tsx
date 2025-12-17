import { useState, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./useAuth"
import { ActionHistoryItem } from "@/components/google/ActionHistoryPanel"

export function useActionHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState<ActionHistoryItem[]>([])

  const addToHistory = useCallback((item: Omit<ActionHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: ActionHistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    setHistory(prev => [newItem, ...prev])
    return newItem.id
  }, [])

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const undoAction = useCallback(async (item: ActionHistoryItem): Promise<boolean> => {
    if (!item.canUndo || !item.undoData || !user) return false

    try {
      switch (item.type) {
        case 'import':
        case 'copy':
          // Desfazer importação: excluir sessão criada
          if (item.undoData.sessionId) {
            const { error } = await supabase
              .from('sessions')
              .delete()
              .eq('id', item.undoData.sessionId)
              .eq('user_id', user.id)
            
            if (error) throw error
          }
          break

        case 'mirror':
          // Desfazer espelhamento: remover google_sync_type da sessão
          if (item.undoData.sessionId) {
            const { error } = await supabase
              .from('sessions')
              .update({ 
                google_sync_type: null,
                google_event_id: null 
              })
              .eq('id', item.undoData.sessionId)
              .eq('user_id', user.id)
            
            if (error) throw error
          }
          break

        case 'ignore':
          // Desfazer ignorar: remover o registro de ignorado
          // Eventos ignorados são removidos da lista, então precisamos restaurar
          // Para isso, podemos simplesmente limpar o evento do histórico de ignorados
          if (item.undoData.sessionId) {
            const { error } = await supabase
              .from('sessions')
              .delete()
              .eq('id', item.undoData.sessionId)
              .eq('user_id', user.id)
              .eq('google_sync_type', 'ignorado')
            
            if (error) throw error
          }
          break

        case 'send':
          // Desfazer envio: remover google_sync_type
          if (item.undoData.sessionId) {
            const { error } = await supabase
              .from('sessions')
              .update({ 
                google_sync_type: null,
                google_event_id: null 
              })
              .eq('id', item.undoData.sessionId)
              .eq('user_id', user.id)
            
            if (error) throw error
          }
          break
      }

      // Remover do histórico após desfazer com sucesso
      removeFromHistory(item.id)
      return true
    } catch (error) {
      console.error('Erro ao desfazer ação:', error)
      return false
    }
  }, [user, removeFromHistory])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    undoAction,
  }
}
