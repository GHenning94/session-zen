import { useEffect } from 'react'

const THEME_CACHE_KEY = 'user-theme-cache'

// Hook to apply cached theme instantly before React hydration
export const useInstantTheme = (userId?: string) => {
  useEffect(() => {
    if (!userId) return

    const cacheKey = `${THEME_CACHE_KEY}_${userId}`
    const cachedTheme = localStorage.getItem(cacheKey)
    
    if (cachedTheme && (cachedTheme === 'light' || cachedTheme === 'dark')) {
      // Apply theme class immediately to prevent flicker
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(cachedTheme)
      
      // Also update the theme attribute
      document.documentElement.setAttribute('data-theme', cachedTheme)
    }
  }, [userId])
}