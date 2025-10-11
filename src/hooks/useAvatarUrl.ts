import { useState, useEffect } from 'react'
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

    const loadAvatar = async () => {
      if (!avatarPath) {
        setAvatarUrl(null)
        setIsLoading(false)
        return
      }

      // Se já é uma URL completa, usar diretamente
      if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        setAvatarUrl(avatarPath)
        setIsLoading(false)
        return
      }

      // Se é um path do Storage, gerar URL assinada
      if (avatarPath.startsWith('user-uploads/')) {
        try {
          const signedUrl = await getSignedUrl(avatarPath, 3600)
          if (isMounted) {
            setAvatarUrl(signedUrl)
            setHasError(!signedUrl)
            setIsLoading(false)
          }
        } catch (error) {
          console.error('Error getting signed URL:', error)
          if (isMounted) {
            setAvatarUrl(null)
            setHasError(true)
            setIsLoading(false)
          }
        }
      } else {
        // Outros tipos de path, usar diretamente
        setAvatarUrl(avatarPath)
        setIsLoading(false)
      }
    }

    loadAvatar()

    return () => {
      isMounted = false
    }
  }, [avatarPath])

  return { avatarUrl, isLoading, hasError }
}
