import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react'
import { getSignedUrl } from '@/utils/storageUtils'

/**
 * Cache global de avatares com expiração automática
 * Evita múltiplas requisições para o mesmo avatar
 */

interface CachedAvatar {
  url: string
  expires: number
  size: 'sm' | 'md' | 'lg'
}

interface AvatarCacheContextType {
  getCachedAvatar: (path: string | null | undefined, size?: 'sm' | 'md' | 'lg') => Promise<string | null>
  clearCache: () => void
  preloadAvatars: (paths: string[], size?: 'sm' | 'md' | 'lg') => Promise<void>
}

const AvatarCacheContext = createContext<AvatarCacheContextType | undefined>(undefined)

// Cache em memória (Map para performance)
const avatarCache = new Map<string, CachedAvatar>()

// Duração do cache: 50 minutos (signed URLs expiram em 1h)
const CACHE_DURATION = 50 * 60 * 1000

export const useAvatarCache = () => {
  const context = useContext(AvatarCacheContext)
  if (!context) {
    throw new Error('useAvatarCache must be used within AvatarCacheProvider')
  }
  return context
}

interface AvatarCacheProviderProps {
  children: ReactNode
}

export const AvatarCacheProvider = ({ children }: AvatarCacheProviderProps) => {
  /**
   * Obtém avatar do cache ou gera novo
   */
  const getCachedAvatar = useCallback(async (
    path: string | null | undefined,
    size: 'sm' | 'md' | 'lg' = 'md'
  ): Promise<string | null> => {
    if (!path) return null

    // Gerar chave do cache
    const cacheKey = `${path}_${size}`

    // Verificar cache
    const cached = avatarCache.get(cacheKey)
    if (cached && Date.now() < cached.expires) {
      console.log('[AvatarCache] ✅ Cache hit:', cacheKey.substring(0, 50))
      return cached.url
    }

    console.log('[AvatarCache] ❌ Cache miss, gerando URL:', cacheKey.substring(0, 50))

    try {
      // Para URLs externas, usar diretamente
      if (path.startsWith('http')) {
        const url = path
        avatarCache.set(cacheKey, {
          url,
          expires: Date.now() + CACHE_DURATION,
          size
        })
        return url
      }

      // Para storage paths, gerar signed URL (sem transformações pois o bucket é privado)
      const signedUrl = await getSignedUrl(path, 3600) // 1h

      if (!signedUrl) {
        console.warn('[AvatarCache] ⚠️ Failed to generate signed URL for:', path)
        return null
      }

      // Cachear a signed URL diretamente (não usar transformações em buckets privados)
      avatarCache.set(cacheKey, {
        url: signedUrl,
        expires: Date.now() + CACHE_DURATION,
        size
      })

      return signedUrl
    } catch (error) {
      console.error('[AvatarCache] ❌ Error generating avatar URL:', error)
      return null
    }
  }, [])

  /**
   * Limpa todo o cache
   */
  const clearCache = useCallback(() => {
    console.log('[AvatarCache] 🗑️ Clearing cache')
    avatarCache.clear()
  }, [])

  /**
   * Pré-carrega múltiplos avatares em paralelo
   * Útil para otimizar listas com muitos avatares
   */
  const preloadAvatars = useCallback(async (
    paths: string[],
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const uniquePaths = [...new Set(paths.filter(Boolean))]
    
    console.log(`[AvatarCache] 🚀 Preloading ${uniquePaths.length} avatars (${size})`)
    
    await Promise.all(
      uniquePaths.map(path => getCachedAvatar(path, size))
    )
  }, [getCachedAvatar])

  // Limpar cache expirado periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      let removed = 0
      
      avatarCache.forEach((value, key) => {
        if (now >= value.expires) {
          avatarCache.delete(key)
          removed++
        }
      })
      
      if (removed > 0) {
        console.log(`[AvatarCache] 🧹 Removed ${removed} expired entries`)
      }
    }, 5 * 60 * 1000) // Verificar a cada 5 minutos

    return () => clearInterval(interval)
  }, [])

  return (
    <AvatarCacheContext.Provider value={{
      getCachedAvatar,
      clearCache,
      preloadAvatars
    }}>
      {children}
    </AvatarCacheContext.Provider>
  )
}
