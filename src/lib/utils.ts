import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
