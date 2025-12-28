import { createContext, useContext, useLayoutEffect, useState, useCallback, ReactNode } from 'react'

const ADMIN_THEME_KEY = 'admin-theme-isolated'

type Theme = 'light' | 'dark'

interface AdminThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const AdminThemeContext = createContext<AdminThemeContextType | null>(null)

// Apply admin theme directly to DOM (isolated from user theme)
const applyAdminTheme = (theme: Theme) => {
  const root = document.documentElement
  root.style.transition = 'none'
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.setAttribute('data-theme', theme)
  requestAnimationFrame(() => {
    root.style.transition = ''
  })
}

export const AdminThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Read from isolated admin storage only
    const stored = localStorage.getItem(ADMIN_THEME_KEY) as Theme | null
    return stored === 'dark' ? 'dark' : 'light'
  })

  // Apply theme immediately on mount and when theme changes
  useLayoutEffect(() => {
    applyAdminTheme(theme)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(ADMIN_THEME_KEY, newTheme)
    setThemeState(newTheme)
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
