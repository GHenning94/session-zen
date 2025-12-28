import { useEffect, useLayoutEffect, useCallback, useRef } from 'react'
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

  // Check if we're on a public/external page that should always be light theme
  const isPublicPage = useCallback(() => {
    const publicRoutes = [
      '/',           // Landing Page
      '/login',      // Login do usuário
      '/signup',     // Cadastro
      '/admin/login' // Login do admin - sempre light
    ]
    
    // Páginas externas que devem sempre usar tema claro
    const isBookingPage = location.pathname.startsWith('/agendar/')        // Agendamento público
    const isReferralPage = location.pathname.startsWith('/convite/')       // Convite de indicação
    const isRegistrationPage = location.pathname.startsWith('/register/')  // Registro via link
    const isPublicTerms = location.pathname === '/termos-indicacao'        // Termos de indicação
    
    return publicRoutes.includes(location.pathname) || 
           isBookingPage || 
           isReferralPage || 
           isRegistrationPage || 
           isPublicTerms
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

  // Apply theme from cache IMMEDIATELY on user change (before useEffect runs)
  useLayoutEffect(() => {
    // If on public page, force light theme
    if (isPublicPage()) {
      const root = document.documentElement
      root.style.transition = 'none'
      root.classList.remove('dark')
      root.classList.add('light')
      root.setAttribute('data-theme', 'light')
      setTheme('light')
      requestAnimationFrame(() => {
        root.style.transition = ''
      })
      return
    }

    // If user is logged in and NOT on public page, apply cached theme immediately
    if (user) {
      const cacheKey = `${THEME_CACHE_KEY}_${user.id}`
      const cachedTheme = localStorage.getItem(cacheKey)
      
      if (cachedTheme && (cachedTheme === 'light' || cachedTheme === 'dark')) {
        const root = document.documentElement
        root.style.transition = 'none'
        root.classList.remove(cachedTheme === 'dark' ? 'light' : 'dark')
        root.classList.add(cachedTheme)
        root.setAttribute('data-theme', cachedTheme)
        setTheme(cachedTheme)
        console.log(`[useUserTheme] ✅ Tema aplicado do cache: ${cachedTheme}`)
        requestAnimationFrame(() => {
          root.style.transition = ''
        })
      }
    }
  }, [isPublicPage, user, setTheme])

  // Load theme from database (async, after layout is done)
  useEffect(() => {
    loadUserTheme()
  }, [loadUserTheme])

  return {
    saveThemePreference,
    loadUserTheme
  }
}