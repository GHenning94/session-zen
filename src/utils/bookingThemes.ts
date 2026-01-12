// Definição dos temas visuais para a página pública
export const VISUAL_THEMES: Record<string, {
  name: string
  background: string
  cardBackground: string
  accent: string
  text: string
  textMuted: string
  border: string
  buttonBg: string
  buttonText: string
}> = {
  minimal_clean: {
    name: 'Minimal Clean',
    background: '#f8fafc',
    cardBackground: '#ffffff',
    accent: '#0f172a',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    buttonBg: '#0f172a',
    buttonText: '#ffffff'
  },
  therapeutic_soft: {
    name: 'Terapêutico Suave',
    background: '#f0fdf4',
    cardBackground: '#ffffff',
    accent: '#15803d',
    text: '#14532d',
    textMuted: '#166534',
    border: '#bbf7d0',
    buttonBg: '#15803d',
    buttonText: '#ffffff'
  },
  professional_dark: {
    name: 'Profissional Escuro',
    background: '#1e293b',
    cardBackground: '#334155',
    accent: '#3b82f6',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    border: '#475569',
    buttonBg: '#3b82f6',
    buttonText: '#ffffff'
  },
  welcoming_pastel: {
    name: 'Acolhedor Pastel',
    background: '#fdf2f8',
    cardBackground: '#ffffff',
    accent: '#db2777',
    text: '#831843',
    textMuted: '#9d174d',
    border: '#fbcfe8',
    buttonBg: '#db2777',
    buttonText: '#ffffff'
  },
  institutional_neutral: {
    name: 'Institucional Neutro',
    background: '#f5f5f4',
    cardBackground: '#ffffff',
    accent: '#44403c',
    text: '#1c1917',
    textMuted: '#57534e',
    border: '#d6d3d1',
    buttonBg: '#44403c',
    buttonText: '#ffffff'
  }
}

export const getThemeStyles = (themeId?: string) => {
  return VISUAL_THEMES[themeId || 'minimal_clean'] || VISUAL_THEMES.minimal_clean
}

// Selos de confiança
export const TRUST_BADGES_CONFIG: Record<string, { icon: string; label: string }> = {
  confidential: { icon: '🔒', label: 'Atendimento sigiloso' },
  ethics_code: { icon: '📜', label: 'Conforme Código de Ética' },
  registered: { icon: '✅', label: 'Profissional registrado' },
  safe_environment: { icon: '🛡️', label: 'Ambiente seguro e confidencial' }
}

// Ordem padrão dos blocos
export const DEFAULT_BLOCK_ORDER = [
  'photo',
  'title', 
  'bio',
  'specialty',
  'welcome_message',
  'values',
  'schedule',
  'payment_info',
  'observations'
]
