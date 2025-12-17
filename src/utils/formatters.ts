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
 * @param time String de tempo no formato HH:MM:SS ou HH:MM ou timestamp
 * @returns String formatada como HH:MM
 */
export function formatTimeBR(time: string | Date | null | undefined): string {
  if (!time) return '--:--'
  
  // Se é um Date object ou timestamp, extrair a hora
  if (time instanceof Date || (typeof time === 'string' && time.includes('T'))) {
    try {
      const date = typeof time === 'string' ? new Date(time) : time
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } catch {
      return '--:--'
    }
  }
  
  // Se já está no formato HH:MM, retorna como está
  if (typeof time === 'string' && time.length === 5 && time.includes(':')) {
    return time
  }
  
  // Se está no formato HH:MM:SS, remove os segundos
  if (typeof time === 'string' && time.length === 8 && time.split(':').length === 3) {
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
    let dateObj: Date
    
    if (typeof date === 'string') {
      // Se é string no formato YYYY-MM-DD, criar data local para evitar timezone issues
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number)
        dateObj = new Date(year, month - 1, day)
      } else {
        dateObj = new Date(date)
      }
    } else {
      dateObj = date
    }
    
    // Garantir formatação consistente
    const day = dateObj.getDate().toString().padStart(2, '0')
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
    const year = dateObj.getFullYear().toString()
    
    return `${day}/${month}/${year}`
  } catch {
    return '--'
  }
}

/**
 * Formatação de data no formato ISO (YYYY-MM-DD) para input date
 * @param date String ISO, Date object ou string de data brasileira
 * @returns String formatada como YYYY-MM-DD
 */
export function formatDateISO(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    let dateObj: Date
    
    if (typeof date === 'string') {
      // Se já é formato ISO, retorna como está
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date
      }
      // Se é formato brasileiro DD/MM/YYYY
      if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = date.split('/').map(Number)
        dateObj = new Date(year, month - 1, day)
      } else {
        dateObj = new Date(date)
      }
    } else {
      dateObj = date
    }
    
    const year = dateObj.getFullYear()
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
    const day = dateObj.getDate().toString().padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * Formatação padronizada de métodos de pagamento
 * @param method String do método de pagamento
 * @returns String formatada com acentos e espaços corretos
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return 'A definir'
  
  const methodMap: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'pix': 'PIX',
    'cartao': 'Cartão',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'transferencia': 'Transferência',
    'A definir': 'A definir',
    'a definir': 'A definir'
  }
  
  const lowerMethod = method.toLowerCase()
  return methodMap[lowerMethod] || method.charAt(0).toUpperCase() + method.slice(1)
}