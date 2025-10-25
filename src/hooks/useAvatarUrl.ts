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
    const MAX_RETRIES = 3
    let retryCount = 0

    const loadAvatar = async () => {
      try {
        console.log('[useAvatarUrl] Loading avatar, path:', avatarPath)
        
        if (!avatarPath) {
          console.log('[useAvatarUrl] No avatar path provided')
          if (isMounted) {
            setAvatarUrl(null)
            setIsLoading(false)
            setHasError(false)
          }
          return
        }

        console.log('[useAvatarUrl] Requesting signed URL for:', avatarPath)
        
        // Sempre tenta gerar URL assinada; storageUtils trata URLs externas e públicas
        const signed = await getSignedUrl(avatarPath, EXPIRES_IN)
        
        if (!isMounted) return

        if (signed) {
          console.log('[useAvatarUrl] ✅ Signed URL generated successfully')
          console.log('[useAvatarUrl] Preview:', signed.substring(0, 100) + '...')
          setAvatarUrl(signed)
          setHasError(false)
          setIsLoading(false)
          retryCount = 0 // Reset retry count on success
        } else {
          console.warn('[useAvatarUrl] ⚠️ Failed to generate signed URL')
          
          // Retry logic for storage paths
          if (avatarPath.startsWith('user-uploads/') && retryCount < MAX_RETRIES) {
            retryCount++
            console.log(`[useAvatarUrl] 🔄 Retry attempt ${retryCount}/${MAX_RETRIES}`)
            setTimeout(() => loadAvatar(), 1000 * retryCount) // Exponential backoff
            return
          }
          
          // Only use external URLs directly, never use storage paths without signed URL
          if (avatarPath.startsWith('http')) {
            console.log('[useAvatarUrl] Using external URL directly:', avatarPath.substring(0, 50) + '...')
            setAvatarUrl(avatarPath)
            setHasError(avatarPath.includes('supabase.co')) // Mark supabase URLs as potential errors
          } else {
            console.error('[useAvatarUrl] ❌ Cannot use storage path without signed URL')
            setAvatarUrl(null) // Don't use invalid paths
            setHasError(true)
          }
          setIsLoading(false)
        }

        // Agenda renovação antes de expirar
        if (refreshTimer.id) clearTimeout(refreshTimer.id)
        refreshTimer.id = setTimeout(() => {
          console.log('[useAvatarUrl] 🔄 Refreshing signed URL (before expiration)')
          loadAvatar()
        }, Math.max((EXPIRES_IN - 60) * 1000, 60_000)) as unknown as number
      } catch (error) {
        console.error('[useAvatarUrl] ❌ Error getting signed URL:', error)
        
        if (isMounted) {
          // Retry on error
          if (retryCount < MAX_RETRIES) {
            retryCount++
            console.log(`[useAvatarUrl] 🔄 Retry on error ${retryCount}/${MAX_RETRIES}`)
            setTimeout(() => loadAvatar(), 1000 * retryCount)
            return
          }
          
          setAvatarUrl(avatarPath || null)
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    loadAvatar()

    return () => {
      isMounted = false
      if (refreshTimer.id) clearTimeout(refreshTimer.id)
    }
  }, [avatarPath])

  return { avatarUrl, isLoading, hasError }
}
