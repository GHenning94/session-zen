import { createContext, useContext, useLayoutEffect, useEffect, useState, useCallback, ReactNode } from 'react'

// CRITICAL: This key is ONLY for admin - completely isolated from user platform
const ADMIN_THEME_KEY = 'admin-theme-isolated'

type Theme = 'light' | 'dark'

interface AdminThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const AdminThemeContext = createContext<AdminThemeContextType | null>(null)

// Apply admin theme directly to DOM - COMPLETELY ISOLATED from next-themes
const applyAdminTheme = (theme: Theme) => {
  const root = document.documentElement
  root.style.transition = 'none'
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.setAttribute('data-theme', theme)
  console.log(`[AdminTheme] ✅ Applied admin theme: ${theme}`)
  requestAnimationFrame(() => {
    root.style.transition = ''
  })
}

export const AdminThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Read from isolated admin storage ONLY - never from 'theme' or 'user-platform-theme'
    const stored = localStorage.getItem(ADMIN_THEME_KEY) as Theme | null
    return stored === 'dark' ? 'dark' : 'light'
  })

  // Apply theme immediately on mount and when theme changes
  useLayoutEffect(() => {
    applyAdminTheme(theme)
  }, [theme])

  // CRITICAL: Re-apply admin theme whenever this provider is mounted or gains focus
  // This ensures next-themes changes on other tabs don't affect admin
  useEffect(() => {
    const handleFocus = () => {
      // Re-read and apply admin theme when window gains focus
      const storedTheme = localStorage.getItem(ADMIN_THEME_KEY) as Theme | null
      const themeToApply = storedTheme === 'dark' ? 'dark' : 'light'
      applyAdminTheme(themeToApply)
      if (themeToApply !== theme) {
        setThemeState(themeToApply)
      }
    }

    // Also watch for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      // If next-themes storage changes, IGNORE it and re-apply admin theme
      if (e.key === 'user-platform-theme' || e.key === 'theme') {
        console.log('[AdminTheme] ⛔ Detected user platform theme change - re-applying admin theme')
        applyAdminTheme(theme)
        return
      }
      // If admin theme changes (from another tab), sync it
      if (e.key === ADMIN_THEME_KEY) {
        const newTheme = e.newValue as Theme | null
        const themeToApply = newTheme === 'dark' ? 'dark' : 'light'
        applyAdminTheme(themeToApply)
        setThemeState(themeToApply)
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    // ONLY update admin storage - never touch next-themes storage
    localStorage.setItem(ADMIN_THEME_KEY, newTheme)
    setThemeState(newTheme)
    applyAdminTheme(newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  )
}

export const useAdminTheme = () => {
  const context = useContext(AdminThemeContext)
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider')
  }
  return context
}
