import { useLayoutEffect } from 'react'
import { setDocumentTheme } from '@/hooks/useThemeFlashPrevention'

const THEME_CACHE_KEY = 'user-theme-cache'

// Hook to apply cached theme instantly before React hydration
export const useInstantTheme = (userId?: string) => {
  useLayoutEffect(() => {
    if (!userId) return

    const cacheKey = `${THEME_CACHE_KEY}_${userId}`
    const cachedTheme = localStorage.getItem(cacheKey)
    
    if (cachedTheme && (cachedTheme === 'light' || cachedTheme === 'dark')) {
      // Remove any existing theme classes first
      document.documentElement.classList.remove('light', 'dark')
      
      // Apply the cached theme immediately to prevent flicker
      document.documentElement.classList.add(cachedTheme)
      document.documentElement.setAttribute('data-theme', cachedTheme)
      
      // Force a reflow to ensure the theme is applied immediately
      document.documentElement.offsetHeight
    }
  }, [userId])
}