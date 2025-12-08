import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

// Profissões que usam "Paciente" ao invés de "Cliente"
const PATIENT_PROFESSIONS = [
  'psicólogo',
  'psicologa',
  'psicólogo(a)',
  'psicologo',
  'psicologa(a)',
  'psicanalista',
  'terapeuta',
  'terapeuta familiar',
  'terapeuta de casal',
  'psicoterapeuta',
  'neurologista'
]

interface TerminologyContextType {
  // Singular
  clientTerm: string // "Cliente" ou "Paciente"
  // Plural  
  clientTermPlural: string // "Clientes" ou "Pacientes"
  // Artigos
  clientArticle: string // "o" ou "o" (mesmo para ambos)
  clientArticleFeminine: string // "a" ou "a" (mesmo para ambos)
  // Funções utilitárias
  getClientTerm: (count?: number) => string
  isPatientMode: boolean
  profession: string | null
}

const TerminologyContext = createContext<TerminologyContextType>({
  clientTerm: 'Cliente',
  clientTermPlural: 'Clientes',
  clientArticle: 'o',
  clientArticleFeminine: 'a',
  getClientTerm: () => 'Cliente',
  isPatientMode: false,
  profession: null
})

export const useTerminology = () => {
  const context = useContext(TerminologyContext)
  if (!context) {
    throw new Error('useTerminology must be used within a TerminologyProvider')
  }
  return context
}

interface TerminologyProviderProps {
  children: ReactNode
}

export const TerminologyProvider = ({ children }: TerminologyProviderProps) => {
  const { user } = useAuth()
  const [profession, setProfession] = useState<string | null>(null)

  useEffect(() => {
    const loadProfession = async () => {
      if (!user) {
        setProfession(null)
        return
      }

      // Tentar carregar do cache primeiro
      const cacheKey = `user-profession_${user.id}`
      const cached = localStorage.getItem(cacheKey)
      
      if (cached) {
        setProfession(cached)
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('profissao')
          .eq('user_id', user.id)
          .single()

        if (!error && data?.profissao) {
          setProfession(data.profissao)
          localStorage.setItem(cacheKey, data.profissao)
        }
      } catch (error) {
        console.error('[useTerminology] Erro ao carregar profissão:', error)
      }
    }

    loadProfession()

    // Subscribe para mudanças no perfil
    if (user) {
      const channel = supabase
        .channel(`terminology-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new?.profissao) {
              const newProfession = payload.new.profissao as string
              setProfession(newProfession)
              localStorage.setItem(`user-profession_${user.id}`, newProfession)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const isPatientMode = profession 
    ? PATIENT_PROFESSIONS.some(p => 
        profession.toLowerCase().includes(p.toLowerCase())
      )
    : false

  const clientTerm = isPatientMode ? 'Paciente' : 'Cliente'
  const clientTermPlural = isPatientMode ? 'Pacientes' : 'Clientes'

  const getClientTerm = (count?: number) => {
    if (count !== undefined && count !== 1) {
      return clientTermPlural
    }
    return clientTerm
  }

  const value: TerminologyContextType = {
    clientTerm,
    clientTermPlural,
    clientArticle: 'o',
    clientArticleFeminine: 'a',
    getClientTerm,
    isPatientMode,
    profession
  }

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  )
}
