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