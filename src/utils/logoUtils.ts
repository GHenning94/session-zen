// Logo configuration for PDFs
export const LOGO_CONFIG = {
  width: 40,
  height: 13,
  x: 20,
  y: 10
}

// For now, we'll create a simple text-based logo
// In the future, this can be replaced with actual logo base64 data
export const getLogoBase64 = async (): Promise<string> => {
  // Return empty string for now - PDFs will use text-based branding
  return ''
}

// Simple text-based branding using existing platform name
export const addLogoBranding = (doc: any, pageWidth: number) => {
  // Header with branding TherapyPro
  doc.setFillColor(59, 130, 246) // Primary blue
  doc.rect(0, 0, pageWidth, 30, 'F')
  
  // Brand name only - using existing platform name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text('TherapyPro', 20, 20)
  
  // Reset colors
  doc.setTextColor(0, 0, 0)
}