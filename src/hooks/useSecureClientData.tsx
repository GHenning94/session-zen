import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { 
  getSecureClientMedicalData, 
  updateSecureClientMedicalData, 
  exportSecureClientData,
  getSafeClientsList,
  getSecureClientSummary,
  getSecuritySummary,
  type SecureMedicalData 
} from '@/utils/secureClientData'

/**
 * SECURE CLIENT DATA HOOK
 * 
 * This hook provides secure access to sensitive patient medical data
 * with comprehensive audit logging and HIPAA/LGPD compliance.
 * 
 * ⚠️  MEDICAL DATA SECURITY:
 * - All access is automatically logged for compliance
 * - Input validation and sanitization is enforced
 * - Only authenticated users can access their own data
 * - Failed access attempts are tracked
 */

interface UseSecureClientDataReturn {
  // State
  loading: boolean
  error: string | null
  
  // Safe client operations (no medical data exposed)
  safeClients: any[]
  loadSafeClients: () => Promise<void>
  
  // Individual client operations
  getClientSummary: (clientId: string) => Promise<any>
  
  // Security monitoring
  getSecurityStats: () => Promise<any>
  
  // Secure medical data operations  
  getClientMedicalData: (clientId: string) => Promise<SecureMedicalData | null>
  updateClientMedicalData: (
    clientId: string, 
    dadosClinicos?: string, 
    historico?: string
  ) => Promise<boolean>
  exportClientData: (clientId: string) => Promise<any>
  
  // Utility functions
  clearError: () => void
}

export function useSecureClientData(): UseSecureClientDataReturn {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [safeClients, setSafeClients] = useState<any[]>([])

  const clearError = useCallback(() => setError(null), [])

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error?.message || `Erro durante ${operation}`
    setError(errorMessage)
    
    // Show appropriate user message based on error type
    if (errorMessage.includes('Access denied')) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar estes dados.",
        variant: "destructive"
      })
    } else if (errorMessage.includes('exceeds maximum')) {
      toast({
        title: "Dados Muito Longos",
        description: "Os dados excedem o tamanho máximo permitido.",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Erro de Segurança",
        description: errorMessage,
        variant: "destructive"
      })
    }
    
    console.error(`Secure client data error (${operation}):`, error)
  }, [toast])

  const loadSafeClients = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    clearError()
    
    try {
      const clients = await getSafeClientsList()
      setSafeClients(clients)
    } catch (error) {
      handleError(error, 'carregar lista de clientes')
    } finally {
      setLoading(false)
    }
  }, [user, handleError, clearError])

  const getClientMedicalData = useCallback(async (clientId: string): Promise<SecureMedicalData | null> => {
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    setLoading(true)
    clearError()
    
    try {
      const data = await getSecureClientMedicalData(clientId)
      
      toast({
        title: "Dados Médicos Acessados",
        description: "Acesso registrado para auditoria de conformidade.",
        variant: "default"
      })
      
      return data
    } catch (error) {
      handleError(error, 'acessar dados médicos')
      throw error
    } finally {
      setLoading(false)
    }
  }, [user, handleError, clearError, toast])

  const updateClientMedicalData = useCallback(async (
    clientId: string, 
    dadosClinicos?: string, 
    historico?: string
  ): Promise<boolean> => {
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    setLoading(true)
    clearError()
    
    try {
      const success = await updateSecureClientMedicalData(clientId, dadosClinicos, historico)
      
      if (success) {
        toast({
          title: "Dados Médicos Atualizados",
          description: "Alterações salvas e registradas para auditoria.",
        })
      }
      
      return success
    } catch (error) {
      handleError(error, 'atualizar dados médicos')
      throw error
    } finally {
      setLoading(false)
    }
  }, [user, handleError, clearError, toast])

  const exportClientData = useCallback(async (clientId: string): Promise<any> => {
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    setLoading(true)
    clearError()
    
    try {
      const data = await exportSecureClientData(clientId)
      
      toast({
        title: "Dados Exportados com Segurança",
        description: "Exportação concluída e registrada para conformidade LGPD.",
      })
      
      return data
    } catch (error) {
      handleError(error, 'exportar dados do cliente')
      throw error
    } finally {
      setLoading(false)
    }
  }, [user, handleError, clearError, toast])

  const getClientSummary = useCallback(async (clientId: string): Promise<any> => {
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    setLoading(true)
    clearError()
    
    try {
      const data = await getSecureClientSummary(clientId)
      return data
    } catch (error) {
      handleError(error, 'buscar resumo do cliente')
      throw error
    } finally {
      setLoading(false)
    }
  }, [user, handleError, clearError])

  const getSecurityStats = useCallback(async (): Promise<any> => {
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    
    setLoading(true)
    clearError()
    
    try {
      const data = await getSecuritySummary()
      return data
    } catch (error) {
      handleError(error, 'buscar estatísticas de segurança')
      throw error
    } finally {
      setLoading(false)
    }
  }, [user, handleError, clearError])

  return {
    // State
    loading,
    error,
    
    // Safe client operations
    safeClients,
    loadSafeClients,
    
    // Individual client operations  
    getClientSummary,
    
    // Security monitoring
    getSecurityStats,
    
    // Secure medical data operations
    getClientMedicalData,
    updateClientMedicalData,
    exportClientData,
    
    // Utility functions
    clearError
  }
}

export default useSecureClientData