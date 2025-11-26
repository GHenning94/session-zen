/**
 * Calcula o status correto de uma sessão baseado na data, horário e status atual
 * Agora NÃO muda automaticamente para 'realizada' - apenas mantém 'agendada'
 */
export const calculateSessionStatus = (data: string, horario: string, currentStatus?: string): string => {
  // Manter o status atual - não fazer mudanças automáticas
  return currentStatus || 'agendada'
}

/**
 * Verifica se uma sessão precisa de atenção (passou da data/hora mas ainda está como 'agendada')
 */
export const sessionNeedsAttention = (data: string, horario: string, status: string): boolean => {
  if (status !== 'agendada') return false
  
  const sessionDateTime = new Date(`${data}T${horario}`)
  const currentDateTime = new Date()
  
  return sessionDateTime < currentDateTime
}

/**
 * Calcula o status de pagamento baseado no status da sessão e data/hora
 */
export const calculatePaymentStatus = (sessionData: string, sessionHorario: string, sessionStatus: string): string => {
  const sessionDateTime = new Date(`${sessionData}T${sessionHorario}`)
  const currentDateTime = new Date()
  
  // Apenas sessões canceladas devem ter pagamento cancelado
  if (sessionStatus === 'cancelada') {
    return 'cancelado'
  }
  
  // Sessões com falta devem ter pagamento pendente
  if (sessionStatus === 'falta') {
    return 'pendente'
  }
  
  if (sessionStatus === 'realizada') {
    return 'pago'
  }
  
  // Pagamentos passados ou futuros devem ser marcados como pendentes
  return 'pendente'
}

/**
 * Retorna a cor/variante do badge para o status de pagamento
 */
export const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'pago': return 'success'
    case 'pendente': return 'warning'
    case 'cancelado': return 'destructive'
    default: return 'outline'
  }
}

/**
 * Retorna a cor/variante do badge para o status da sessão
 */
export const getSessionStatusColor = (status: string) => {
  switch (status) {
    case 'realizada': return 'success'
    case 'agendada': return 'info'
    case 'cancelada': return 'destructive'
    case 'falta': return 'warning'
    default: return 'outline'
  }
}

/**
 * Retorna o label em português para o status da sessão
 */
export const getSessionStatusLabel = (status: string) => {
  switch (status) {
    case 'realizada': return 'Realizada'
    case 'agendada': return 'Agendada'
    case 'cancelada': return 'Cancelada'
    case 'falta': return 'Falta'
    default: return status
  }
}

/**
 * Verifica se um PAGAMENTO de sessão precisa de atenção (bolinha vermelha)
 * Apenas sessões com valor > 0, agendadas e que já passaram
 */
export const paymentNeedsAttentionForSession = (session: { status: string; valor?: number; data: string; horario: string }): boolean => {
  if (session.status !== 'agendada') return false
  if (!session.valor || session.valor <= 0) return false
  
  const sessionDateTime = new Date(`${session.data}T${session.horario}`)
  const currentDateTime = new Date()
  
  return sessionDateTime < currentDateTime
}

/**
 * Verifica se um pagamento de PACOTE precisa de atenção (bolinha vermelha)
 * Apenas pacotes pendentes cuja data_fim já passou
 */
export const paymentNeedsAttentionForPackage = (payment: { status: string; packages?: { data_fim?: string } }): boolean => {
  if (payment.status !== 'pendente') return false
  if (!payment.packages?.data_fim) return false
  
  const endDate = new Date(payment.packages.data_fim)
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)
  
  return endDate < currentDate
}

/**
 * Retorna a data efetiva de um pagamento para ordenação/agrupamento
 * Para pacotes: usa data_fim; para sessões: usa data_vencimento ou data da sessão
 */
export const getPaymentEffectiveDate = (payment: any): Date => {
  // Se é pagamento de pacote e tem data_fim, usar essa
  if (payment.package_id && payment.packages?.data_fim) {
    return new Date(payment.packages.data_fim)
  }
  
  // Se tem data_vencimento, usar essa
  if (payment.data_vencimento) {
    return new Date(payment.data_vencimento)
  }
  
  // Se é pagamento de sessão e tem data da sessão
  if (payment.session_id && payment.sessions?.data) {
    return new Date(`${payment.sessions.data}T${payment.sessions.horario || '00:00'}`)
  }
  
  // Fallback: usar created_at
  return new Date(payment.created_at)
}

/**
 * Verifica se um pagamento está vencido (precisa de atenção)
 * Para pagamentos de sessão: considera data E hora da sessão
 * Para outros pagamentos: considera apenas a data
 */
export const isOverdue = (payment: any): boolean => {
  if (!payment || payment.status !== 'pendente') return false
  
  // Se é pagamento de sessão, considerar data E hora
  if (payment.session_id && payment.sessions?.data && payment.sessions?.horario) {
    const sessionDateTime = new Date(`${payment.sessions.data}T${payment.sessions.horario}`)
    const now = new Date()
    return sessionDateTime < now
  }
  
  // Para outros pagamentos (pacotes, etc), considerar apenas data
  const effective = getPaymentEffectiveDate(payment)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eff = new Date(effective)
  eff.setHours(0, 0, 0, 0)
  return eff < today
}
