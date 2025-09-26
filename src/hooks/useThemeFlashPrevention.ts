// Previne o flash visual durante mudanças de tema
// Aplicado no início da aplicação antes da hidratação do React

const THEME_CACHE_KEY = 'user-theme-cache'

// Utilitário: detecta se é página pública que deve forçar light
const isPublicPage = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname || '/'
  return path === '/' || path === '/login' || path === '/signup' || path.startsWith('/agendar/')
}

// Função para aplicar tema instantaneamente no DOM
export const applyThemeInstantly = () => {
  if (typeof window === 'undefined') return

  // Se o index.html já aplicou um tema válido, não altere (evita corrida)
  const currentAttr = document.documentElement.getAttribute('data-theme')
  if ((currentAttr === 'light' || currentAttr === 'dark') && document.documentElement.classList.contains(currentAttr)) {
    return currentAttr
  }

  // Lê preferências
  const currentUser = localStorage.getItem('sb-supabase-auth-token')
  let themeToApply: 'light' | 'dark' = 'light'

  try {
    if (isPublicPage()) {
      themeToApply = 'light'
    } else if (currentUser) {
      const authData = JSON.parse(currentUser)
      const userId = authData?.user?.id
      if (userId) {
        const cacheKey = `${THEME_CACHE_KEY}_${userId}`
        const cachedTheme = localStorage.getItem(cacheKey) as 'light' | 'dark' | null
        if (cachedTheme === 'dark' || cachedTheme === 'light') {
          themeToApply = cachedTheme
        } else {
          const local = localStorage.getItem('theme') as 'light' | 'dark' | null
          if (local === 'dark' || local === 'light') themeToApply = local
        }
      }
    } else {
      const local = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (local === 'dark' || local === 'light') themeToApply = local
    }
  } catch (error) {
    console.warn('Erro ao ler preferências de tema:', error)
  }

  // Aplica imediatamente
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(themeToApply)
  document.documentElement.setAttribute('data-theme', themeToApply)
  localStorage.setItem('theme', themeToApply)

  return themeToApply
}

// Função para monitorar mudanças de tema em tempo real (após inicialização)
export const watchThemeChanges = () => {
  if (typeof window === 'undefined') return

  // Observa mudanças no localStorage do tema e aplica instantaneamente
  const originalSetItem = localStorage.setItem
  localStorage.setItem = function(key, value) {
    if (key === 'theme') {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(value)
      document.documentElement.setAttribute('data-theme', value)
    }
    return originalSetItem.call(this, key, value)
  }

  // Observa mudanças no atributo data-theme para manter classe em sincronia
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const newTheme = document.documentElement.getAttribute('data-theme')
        if (newTheme === 'light' || newTheme === 'dark') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(newTheme)
        }
      }
    }
  })

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  return () => observer.disconnect()
}

// Auto-executa quando o módulo é carregado
if (typeof window !== 'undefined') {
  applyThemeInstantly()
  watchThemeChanges()
}
