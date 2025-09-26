/**
 * Calcula o status correto de uma sessão baseado na data, horário e status atual
 */
export const calculateSessionStatus = (data: string, horario: string, currentStatus?: string): string => {
  // Se já foi marcada como cancelada ou falta, manter o status
  if (currentStatus === 'cancelada' || currentStatus === 'falta') {
    return currentStatus
  }
  
  const sessionDateTime = new Date(`${data}T${horario}`)
  const currentDateTime = new Date()
  
  // Se passou da data/hora, marcar automaticamente como realizada
  if (sessionDateTime < currentDateTime) {
    return 'realizada'
  }
  
  // Se é no futuro, está agendada
  return 'agendada'
}

/**
 * Calcula o status de pagamento baseado no status da sessão e data/hora
 */
export const calculatePaymentStatus = (sessionData: string, sessionHorario: string, sessionStatus: string): string => {
  const sessionDateTime = new Date(`${sessionData}T${sessionHorario}`)
  const currentDateTime = new Date()
  
  if (sessionStatus === 'cancelada' || sessionStatus === 'falta') {
    return 'cancelado'
  }
  
  if (sessionStatus === 'realizada') {
    return 'pago'
  }
  
  // Se passou da data/hora e ainda não foi marcada como realizada
  if (sessionDateTime < currentDateTime) {
    return 'atrasado'
  }
  
  return 'pendente'
}

/**
 * Retorna a cor/variante do badge para o status da sessão
 */
export const getSessionStatusColor = (status: string) => {
  switch (status) {
    case 'realizada': return 'default'
    case 'agendada': return 'secondary'
    case 'cancelada': return 'destructive'
    case 'falta': return 'outline'
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