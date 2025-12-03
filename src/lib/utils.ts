import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata horário para o formato HH:MM:SS exigido pelo banco de dados PostgreSQL.
 * Aceita HH:MM ou HH:MM:SS e sempre retorna HH:MM:SS.
 */
export function formatTimeForDatabase(time: string): string {
  if (!time) return time
  const colonCount = (time.match(/:/g) || []).length
  return colonCount === 1 ? `${time}:00` : time
}

export function formatClientName(fullName: string): string {
  if (!fullName) return ""
  
  const nameParts = fullName.trim().split(/\s+/)
  
  if (nameParts.length === 1) {
    return nameParts[0]
  }
  
  const firstName = nameParts[0]
  const lastNameInitial = nameParts[nameParts.length - 1][0]
  
  return `${firstName} ${lastNameInitial}.`
}
