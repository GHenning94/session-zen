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
    if (!item.canUndo || !user) {
      console.log('Cannot undo: canUndo=', item.canUndo, 'user=', !!user)
      return false
    }

    if (!item.undoData?.sessionId) {
      console.log('Cannot undo: no sessionId in undoData', item.undoData)
      return false
    }

    try {
      console.log('Undoing action:', item.type, 'sessionId:', item.undoData.sessionId)
      
      switch (item.type) {
        case 'import':
        case 'copy':
          // Desfazer importação: excluir sessão criada
          const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .eq('id', item.undoData.sessionId)
          
          if (deleteError) {
            console.error('Delete error:', deleteError)
            throw deleteError
          }
          break

        case 'mirror':
          // Desfazer espelhamento: remover google_sync_type da sessão
          const { error: mirrorError } = await supabase
            .from('sessions')
            .update({ 
              google_sync_type: null,
              google_event_id: null 
            })
            .eq('id', item.undoData.sessionId)
          
          if (mirrorError) {
            console.error('Mirror undo error:', mirrorError)
            throw mirrorError
          }
          break

        case 'ignore':
          // Desfazer ignorar: excluir a sessão marcada como ignorada
          const { error: ignoreError } = await supabase
            .from('sessions')
            .delete()
            .eq('id', item.undoData.sessionId)
          
          if (ignoreError) {
            console.error('Ignore undo error:', ignoreError)
            throw ignoreError
          }
          break

        case 'send':
          // Desfazer envio: remover google_sync_type
          const { error: sendError } = await supabase
            .from('sessions')
            .update({ 
              google_sync_type: null,
              google_event_id: null 
            })
            .eq('id', item.undoData.sessionId)
          
          if (sendError) {
            console.error('Send undo error:', sendError)
            throw sendError
          }
          break
      }

      // Remover do histórico após desfazer com sucesso
      removeFromHistory(item.id)
      
      // Dispatch event to refresh data
      window.dispatchEvent(new Event('googleCalendarRefresh'))
      
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
