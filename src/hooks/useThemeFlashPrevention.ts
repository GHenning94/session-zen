// Previne o flash visual durante mudanças de tema e cores
// Aplicado no início da aplicação antes da hidratação do React

const THEME_CACHE_KEY = 'user-theme-cache'
const COLOR_CACHE_KEY = 'user-color-cache'
const DEFAULT_COLOR = '217 91% 45%' // Azul profissional padrão
const VALID_THEMES = ['light', 'dark'] as const

type Theme = (typeof VALID_THEMES)[number]

export const setDocumentTheme = (theme: Theme) => {
  const root = document.documentElement
  root.classList.add(theme)
  root.classList.remove(theme === 'dark' ? 'light' : 'dark')
  root.setAttribute('data-theme', theme)
}

// Aplicar cor no DOM
const applyColorToDocument = (colorValue: string) => {
  if (!colorValue) return
  
  const cleanColor = colorValue.replace(/[^\d\s%]/g, '').trim()
  
  // Update CSS custom properties
  document.documentElement.style.setProperty('--primary', cleanColor)
  document.documentElement.style.setProperty('--sidebar-primary', cleanColor)
  
  // Create variations
  const hslValues = cleanColor.match(/\d+/g)
  if (hslValues && hslValues.length >= 3) {
    const [h, s, l] = hslValues
    const lighterL = Math.min(85, parseInt(l) + 15)
    const darkerL = Math.max(25, parseInt(l) - 10)
    
    document.documentElement.style.setProperty('--primary-glow', `${h} ${s}% ${lighterL}%`)
    
    const gradient = `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${h} ${s}% ${darkerL}%))`
    document.documentElement.style.setProperty('--gradient-primary', gradient)
  }
}

// Utilitário: detecta se é página pública que deve forçar light
const isPublicPage = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname || '/'
  return path === '/' || path === '/login' || path === '/signup' || path.startsWith('/agendar/')
}

// Utilitário: detecta se é página admin (tem seu próprio sistema de tema isolado)
const isAdminPage = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname || '/'
  return path.startsWith('/admin')
}

// Função para aplicar tema e cor instantaneamente no DOM
export const applyThemeInstantly = () => {
  if (typeof window === 'undefined') return

  // Admin pages have their own completely isolated theme system - DO NOT TOUCH
  if (isAdminPage()) {
    const ADMIN_THEME_KEY = 'admin-theme-isolated'
    const adminTheme = localStorage.getItem(ADMIN_THEME_KEY) as 'light' | 'dark' | null
    const themeToApply = adminTheme === 'dark' ? 'dark' : 'light'
    setDocumentTheme(themeToApply)
    applyColorToDocument(DEFAULT_COLOR) // Admin always uses default color
    return themeToApply
  }

  // Se o index.html já aplicou um tema válido, não altere (evita corrida)
  const currentAttr = document.documentElement.getAttribute('data-theme')
  if ((currentAttr === 'light' || currentAttr === 'dark') && document.documentElement.classList.contains(currentAttr)) {
    return currentAttr
  }

  // Lê preferências
  const currentUser = localStorage.getItem('sb-supabase-auth-token')
  let themeToApply: 'light' | 'dark' = 'light'
  let colorToApply = DEFAULT_COLOR

  try {
    if (isPublicPage()) {
      // For public pages, apply light theme but DO NOT save to localStorage
      themeToApply = 'light'
      colorToApply = DEFAULT_COLOR
      // Apply theme and return early - don't modify localStorage
      setDocumentTheme(themeToApply)
      applyColorToDocument(colorToApply)
      return themeToApply
    } else if (currentUser) {
      const authData = JSON.parse(currentUser)
      const userId = authData?.user?.id
      if (userId) {
        // Carregar tema
        const themeCacheKey = `${THEME_CACHE_KEY}_${userId}`
        const cachedTheme = localStorage.getItem(themeCacheKey) as 'light' | 'dark' | null
        if (cachedTheme === 'dark' || cachedTheme === 'light') {
          themeToApply = cachedTheme
        } else {
          const local = localStorage.getItem('theme') as 'light' | 'dark' | null
          if (local === 'dark' || local === 'light') themeToApply = local
        }
        
        // Carregar cor
        const colorCacheKey = `${COLOR_CACHE_KEY}_${userId}`
        const cachedColor = localStorage.getItem(colorCacheKey)
        if (cachedColor) {
          colorToApply = cachedColor
        }
      }
    } else {
      const local = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (local === 'dark' || local === 'light') themeToApply = local
    }
  } catch (error) {
    console.warn('Erro ao ler preferências:', error)
  }

  // Aplica tema e cor imediatamente para evitar flicker
  setDocumentTheme(themeToApply)
  localStorage.setItem('theme', themeToApply)
  applyColorToDocument(colorToApply)
 
  return themeToApply
}

// Função para monitorar mudanças de tema em tempo real (após inicialização)
// Mantida como no-op para evitar conflitos com next-themes
export const watchThemeChanges = () => {
  return () => {}
}

// Auto-executa quando o módulo é carregado
if (typeof window !== 'undefined') {
  applyThemeInstantly()
}
