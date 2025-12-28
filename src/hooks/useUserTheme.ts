import { useEffect, useLayoutEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

const USER_THEME_CACHE_KEY = 'user-theme-cache'
const ADMIN_THEME_KEY = 'admin-theme'

export const useUserTheme = () => {
  const { setTheme, resolvedTheme } = useTheme()
  const { user } = useAuth()
  const location = useLocation()

  // Check if we're on an admin page
  const isAdminPage = useCallback(() => {
    return location.pathname.startsWith('/admin')
  }, [location.pathname])

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
    // Admin pages have their own fixed theme (always light for now)
    if (isAdminPage()) {
      const adminTheme = localStorage.getItem(ADMIN_THEME_KEY) || 'light'
      setTheme(adminTheme)
      return
    }

    if (!user || isPublicPage()) return

    // First, try to get cached theme and apply it immediately
    const cacheKey = `${USER_THEME_CACHE_KEY}_${user.id}`
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
  }, [user, isPublicPage, isAdminPage, setTheme])

  // Save user's theme preference to database and cache
  const saveThemePreference = useCallback(async (theme: 'light' | 'dark') => {
    // Admin pages use separate storage - don't affect user preferences
    if (isAdminPage()) {
      localStorage.setItem(ADMIN_THEME_KEY, theme)
      setTheme(theme)
      return true
    }

    if (!user || isPublicPage()) return false

    // Update cache immediately (user-specific cache key)
    const cacheKey = `${USER_THEME_CACHE_KEY}_${user.id}`
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
  }, [user, isPublicPage, isAdminPage, setTheme])

  // Apply theme from cache IMMEDIATELY on route/user change (before useEffect runs)
  useLayoutEffect(() => {
    const root = document.documentElement
    
    // Admin pages: use admin-specific theme storage (completely isolated)
    if (isAdminPage()) {
      // Skip admin/login which should always be light
      if (location.pathname === '/admin/login') {
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
      
      const adminTheme = localStorage.getItem(ADMIN_THEME_KEY) || 'light'
      root.style.transition = 'none'
      root.classList.remove(adminTheme === 'dark' ? 'light' : 'dark')
      root.classList.add(adminTheme)
      root.setAttribute('data-theme', adminTheme)
      setTheme(adminTheme)
      requestAnimationFrame(() => {
        root.style.transition = ''
      })
      return
    }

    // If on public page, force light theme
    if (isPublicPage()) {
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

    // If user is logged in and NOT on public/admin page, apply user's cached theme
    if (user) {
      const cacheKey = `${USER_THEME_CACHE_KEY}_${user.id}`
      const cachedTheme = localStorage.getItem(cacheKey)
      
      if (cachedTheme && (cachedTheme === 'light' || cachedTheme === 'dark')) {
        root.style.transition = 'none'
        root.classList.remove(cachedTheme === 'dark' ? 'light' : 'dark')
        root.classList.add(cachedTheme)
        root.setAttribute('data-theme', cachedTheme)
        setTheme(cachedTheme)
        console.log(`[useUserTheme] ✅ Tema do usuário aplicado do cache: ${cachedTheme}`)
        requestAnimationFrame(() => {
          root.style.transition = ''
        })
      }
    }
  }, [isPublicPage, isAdminPage, user, setTheme, location.pathname])

  // Load theme from database (async, after layout is done)
  useEffect(() => {
    loadUserTheme()
  }, [loadUserTheme])

  return {
    saveThemePreference,
    loadUserTheme,
    isAdminPage
  }
}