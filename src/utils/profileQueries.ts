import { supabase } from "@/integrations/supabase/client"

/**
 * Campos básicos do perfil que são seguros para uso geral
 */
export const SAFE_PROFILE_FIELDS = [
  'id',
  'user_id', 
  'nome',
  'profissao',
  'especialidade',
  'bio',
  'crp',
  'telefone',
  'avatar_url',
  'public_avatar_url',
  'plano',
  'subscription_plan',
  'created_at',
  'updated_at'
] as const

/**
 * Campos financeiros sensíveis - só devem ser acessados quando necessário
 */
export const FINANCIAL_FIELDS = [
  'banco',
  'agencia', 
  'conta',
  'tipo_conta',
  'cpf_cnpj'
] as const

/**
 * Busca dados básicos do perfil (sem informações financeiras)
 */
export const getBasicProfile = async (userId: string) => {
  return await supabase
    .from('profiles')
    .select(SAFE_PROFILE_FIELDS.join(', '))
    .eq('user_id', userId)
    .single()
}

/**
 * Busca dados financiais do perfil (apenas quando necessário)
 */
export const getProfileFinancialData = async (userId: string) => {
  return await supabase
    .from('profiles')
    .select(['user_id', ...FINANCIAL_FIELDS].join(', '))
    .eq('user_id', userId)
    .single()
}

/**
 * Busca perfil completo (usar apenas em contextos que realmente precisam dos dados financeiros)
 */
export const getFullProfile = async (userId: string) => {
  return await supabase
    .from('profiles')
    .select([...SAFE_PROFILE_FIELDS, ...FINANCIAL_FIELDS].join(', '))
    .eq('user_id', userId)
    .single()
}

/**
 * Atualiza apenas campos básicos do perfil
 */
export const updateBasicProfile = async (userId: string, data: Record<string, any>) => {
  // Filtrar apenas campos seguros
  const safeData = Object.keys(data)
    .filter(key => SAFE_PROFILE_FIELDS.includes(key as any))
    .reduce((obj, key) => {
      obj[key] = data[key]
      return obj
    }, {} as Record<string, any>)

  return await supabase
    .from('profiles')
    .update(safeData)
    .eq('user_id', userId)
}

/**
 * Atualiza apenas dados financeiros do perfil
 */
export const updateFinancialProfile = async (userId: string, data: Record<string, any>) => {
  // Filtrar apenas campos financeiros
  const financialData = Object.keys(data)
    .filter(key => FINANCIAL_FIELDS.includes(key as any))
    .reduce((obj, key) => {
      obj[key] = data[key]
      return obj
    }, {} as Record<string, any>)

  return await supabase
    .from('profiles')
    .update(financialData)
    .eq('user_id', userId)
}