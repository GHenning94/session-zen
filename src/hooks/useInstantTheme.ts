import { useLayoutEffect } from 'react'
import { useTheme } from 'next-themes'

const THEME_CACHE_KEY = 'user-theme-cache'

// Hook to apply cached theme instantly before React hydration
export const useInstantTheme = (userId?: string) => {
  const { setTheme } = useTheme()

  useLayoutEffect(() => {
    if (!userId) return

    const cacheKey = `${THEME_CACHE_KEY}_${userId}`
    const cachedTheme = localStorage.getItem(cacheKey)
    
    if (cachedTheme && (cachedTheme === 'light' || cachedTheme === 'dark')) {
      const root = document.documentElement
      
      // Apply the cached theme immediately to prevent flicker
      root.classList.add(cachedTheme)
      root.classList.remove(cachedTheme === 'dark' ? 'light' : 'dark')
      root.setAttribute('data-theme', cachedTheme)
      
      // Also update next-themes state to keep it in sync
      setTheme(cachedTheme)
      
      console.log(`[useInstantTheme] ✅ Tema aplicado do cache: ${cachedTheme}`)
    }
  }, [userId, setTheme])
}