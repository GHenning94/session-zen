import { useState, useEffect, useRef } from 'react'
import { getSignedUrl } from '@/utils/storageUtils'

/**
 * Hook para gerenciar URLs assinadas de avatares
 * Lida com URLs do Storage e fallback automático
 */
export const useAvatarUrl = (avatarPath: string | null | undefined) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true
    const refreshTimer = { id: 0 as any }
    const EXPIRES_IN = 3600 // 1h

    const loadAvatar = async () => {
      try {
        if (!avatarPath) {
          if (isMounted) {
            setAvatarUrl(null)
            setIsLoading(false)
            setHasError(false)
          }
          return
        }

        // Sempre tenta gerar URL assinada; storageUtils trata URLs externas e públicas
        const signed = await getSignedUrl(avatarPath, EXPIRES_IN)
        if (!isMounted) return
        setAvatarUrl(signed || avatarPath)
        setHasError(!signed && avatarPath.startsWith('http') && avatarPath.includes('supabase.co'))
        setIsLoading(false)

        // Agenda renovação antes de expirar
        if (refreshTimer.id) clearTimeout(refreshTimer.id)
        refreshTimer.id = setTimeout(() => {
          // Recarrega próximo ciclo
          loadAvatar()
        }, Math.max((EXPIRES_IN - 60) * 1000, 60_000)) as unknown as number
      } catch (error) {
        console.error('Error getting signed URL:', error)
        if (isMounted) {
          setAvatarUrl(avatarPath || null)
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Renova ao voltar ao foco
        setIsLoading(true)
        loadAvatar()
      }
    }

    loadAvatar()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', onVisibility)
      if (refreshTimer.id) clearTimeout(refreshTimer.id)
    }
  }, [avatarPath])

  return { avatarUrl, isLoading, hasError }
}
