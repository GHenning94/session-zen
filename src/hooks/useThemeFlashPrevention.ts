// Previne o flash visual durante mudanças de tema
// Aplicado no início da aplicação antes da hidratação do React

const THEME_CACHE_KEY = 'user-theme-cache'

// Função para aplicar tema instantaneamente no DOM
export const applyThemeInstantly = () => {
  // Verifica se estamos no cliente
  if (typeof window === 'undefined') return

  // Detecta preferência do usuário do localStorage
  const currentUser = localStorage.getItem('sb-supabase-auth-token')
  
  if (currentUser) {
    try {
      const authData = JSON.parse(currentUser)
      const userId = authData?.user?.id
      
      if (userId) {
        const cacheKey = `${THEME_CACHE_KEY}_${userId}`
        const cachedTheme = localStorage.getItem(cacheKey)
        
        if (cachedTheme === 'dark' || cachedTheme === 'light') {
          // Remove TODAS as classes de tema existentes
          document.documentElement.classList.remove('light', 'dark')
          
          // Aplica o tema imediatamente
          document.documentElement.classList.add(cachedTheme)
          document.documentElement.setAttribute('data-theme', cachedTheme)
          
          // Define também no localStorage para next-themes
          localStorage.setItem('theme', cachedTheme)
          
          return cachedTheme
        }
      }
    } catch (error) {
      console.warn('Erro ao aplicar tema instantâneo:', error)
    }
  }
  
  // Fallback para tema claro se não houver preferência
  document.documentElement.classList.remove('dark')
  document.documentElement.classList.add('light')
  document.documentElement.setAttribute('data-theme', 'light')
  localStorage.setItem('theme', 'light')
  
  return 'light'
}

// Função para monitorar mudanças de tema em tempo real
export const watchThemeChanges = () => {
  if (typeof window === 'undefined') return

  // Observa mudanças no localStorage do tema
  const originalSetItem = localStorage.setItem
  localStorage.setItem = function(key, value) {
    if (key === 'theme') {
      // Remove classes existentes e aplica a nova imediatamente
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(value)
      document.documentElement.setAttribute('data-theme', value)
    }
    originalSetItem.call(this, key, value)
  }

  // Observa mudanças no atributo data-theme
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const newTheme = document.documentElement.getAttribute('data-theme')
        if (newTheme && (newTheme === 'light' || newTheme === 'dark')) {
          // Garante que a classe corresponde ao atributo
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(newTheme)
        }
      }
    })
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class']
  })

  return () => observer.disconnect()
}

// Auto-executa quando o módulo é carregado
if (typeof window !== 'undefined') {
  applyThemeInstantly()
  watchThemeChanges()
}