/**
 * Calcula o status correto de uma sessão baseado na data, horário e status atual
 */
export const calculateSessionStatus = (data: string, horario: string, currentStatus?: string): string => {
  // Se já foi marcada como realizada, cancelada ou falta, manter o status
  if (currentStatus === 'realizada' || currentStatus === 'cancelada' || currentStatus === 'falta') {
    return currentStatus
  }
  
  const sessionDateTime = new Date(`${data}T${horario}`)
  const currentDateTime = new Date()
  
  // Se passou da data/hora, deveria ter sido realizada
  if (sessionDateTime < currentDateTime) {
    // Se ainda está como 'agendada', provavelmente está atrasada para ser marcada
    return 'agendada' // Manter como agendada para o usuário decidir se foi realizada ou não
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