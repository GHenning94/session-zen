import therapyProLogo from '@/assets/therapypro-logo.png'

// Convert image to base64 for PDF use
export const getLogoBase64 = async (): Promise<string> => {
  try {
    const response = await fetch(therapyProLogo)
    const blob = await response.blob()
    
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error loading logo:', error)
    return ''
  }
}

// Logo configuration for PDFs
export const LOGO_CONFIG = {
  width: 40,
  height: 13,
  x: 20,
  y: 10
}