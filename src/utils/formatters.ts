/**
 * Formatação brasileira para valores monetários
 * @param value Valor numérico
 * @returns String formatada como R$ X.XXX,XX
 */
export function formatCurrencyBR(value: number | string | null | undefined): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value || 0
  
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Formatação brasileira para horários (apenas HH:MM)
 * @param time String de tempo no formato HH:MM:SS ou HH:MM
 * @returns String formatada como HH:MM
 */
export function formatTimeBR(time: string | null | undefined): string {
  if (!time) return '--:--'
  
  // Se já está no formato HH:MM, retorna como está
  if (time.length === 5 && time.includes(':')) {
    return time
  }
  
  // Se está no formato HH:MM:SS, remove os segundos
  if (time.length === 8 && time.split(':').length === 3) {
    return time.substring(0, 5)
  }
  
  // Se é um objeto Date ou timestamp
  try {
    const date = new Date(`2000-01-01T${time}`)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  } catch {
    return '--:--'
  }
}

/**
 * Formatação de data e hora brasileira
 * @param dateTime String ISO ou Date object
 * @returns String formatada como DD/MM/YYYY HH:MM
 */
export function formatDateTimeBR(dateTime: string | Date | null | undefined): string {
  if (!dateTime) return '--'
  
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
    
    const dateStr = date.toLocaleDateString('pt-BR')
    const timeStr = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
    
    return `${dateStr} ${timeStr}`
  } catch {
    return '--'
  }
}

/**
 * Formatação apenas de data brasileira
 * @param date String ISO, Date object ou string de data
 * @returns String formatada como DD/MM/YYYY
 */
export function formatDateBR(date: string | Date | null | undefined): string {
  if (!date) return '--'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('pt-BR')
  } catch {
    return '--'
  }
}