import { useEffect, useLayoutEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

const THEME_CACHE_KEY = 'user-theme-cache'

export const useUserTheme = () => {
  const { setTheme } = useTheme()
  const { user } = useAuth()
  const location = useLocation()

  // Check if we're on a public page that should always be light
  const isPublicPage = useCallback(() => {
    const publicRoutes = ['/', '/login', '/signup']
    const isBookingPage = location.pathname.startsWith('/agendar/')
    return publicRoutes.includes(location.pathname) || isBookingPage
  }, [location.pathname])

  // Load user's theme preference with instant cache
  const loadUserTheme = useCallback(async () => {
    if (!user || isPublicPage()) return

    // First, try to get cached theme and apply it immediately
    const cacheKey = `${THEME_CACHE_KEY}_${user.id}`
    const cachedTheme = localStorage.getItem(cacheKey)
    
    if (cachedTheme && (cachedTheme === 'light' || cachedTheme === 'dark')) {
      setTheme(cachedTheme)
    }

    // Then load from database and update if different
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('theme_preference')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading theme preference:', error)
        return
      }

      const dbTheme = data?.theme_preference || 'light'
      
      // Update cache
      localStorage.setItem(cacheKey, dbTheme)
      
      // Apply theme if different from cache
      if (dbTheme !== cachedTheme) {
        setTheme(dbTheme)
      }
    } catch (error) {
      console.error('Error loading theme preference:', error)
    }
  }, [user, isPublicPage, setTheme])

  // Save user's theme preference to database and cache
  const saveThemePreference = useCallback(async (theme: 'light' | 'dark') => {
    if (!user || isPublicPage()) return false

    // Update cache immediately
    const cacheKey = `${THEME_CACHE_KEY}_${user.id}`
    localStorage.setItem(cacheKey, theme)

    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert(
          { 
            user_id: user.id, 
            theme_preference: theme 
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          }
        )

      if (error) {
        console.error('Error saving theme preference:', error)
        // Remove from cache if save failed
        localStorage.removeItem(cacheKey)
        toast.error('Erro ao salvar preferência de tema')
        return false
      }

      return true
    } catch (error) {
      console.error('Error saving theme preference:', error)
      // Remove from cache if save failed
      localStorage.removeItem(cacheKey)
      toast.error('Erro ao salvar preferência de tema')
      return false
    }
  }, [user, isPublicPage])

  // Load theme on component mount and when user changes
  useEffect(() => {
    loadUserTheme()
  }, [loadUserTheme])

  // Force light theme on public pages
  useLayoutEffect(() => {
    if (isPublicPage()) {
      // Apply light theme immediately on public pages
      const root = document.documentElement
      root.style.transition = 'none'
      root.classList.remove('dark')
      root.classList.add('light')
      root.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
      setTheme('light')
      // Re-enable transitions after a frame
      requestAnimationFrame(() => {
        root.style.transition = ''
      })
    }
  }, [isPublicPage, setTheme])

  return {
    saveThemePreference,
    loadUserTheme
  }
}