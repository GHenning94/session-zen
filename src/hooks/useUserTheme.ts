import { useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

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

  // Load user's theme preference from database
  const loadUserTheme = useCallback(async () => {
    if (!user || isPublicPage()) return

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

      const themePreference = data?.theme_preference || 'light'
      setTheme(themePreference)
    } catch (error) {
      console.error('Error loading theme preference:', error)
    }
  }, [user, isPublicPage, setTheme])

  // Save user's theme preference to database
  const saveThemePreference = useCallback(async (theme: 'light' | 'dark') => {
    if (!user || isPublicPage()) return false

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
        toast.error('Erro ao salvar preferência de tema')
        return false
      }

      return true
    } catch (error) {
      console.error('Error saving theme preference:', error)
      toast.error('Erro ao salvar preferência de tema')
      return false
    }
  }, [user, isPublicPage])

  // Load theme on component mount and when user changes
  useEffect(() => {
    loadUserTheme()
  }, [loadUserTheme])

  // Force light theme on public pages
  useEffect(() => {
    if (isPublicPage()) {
      setTheme('light')
    }
  }, [isPublicPage, setTheme])

  return {
    saveThemePreference,
    loadUserTheme
  }
}