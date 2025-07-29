export const isValidUrl = async (url: string): Promise<boolean> => {
  try {
    // Verificar se é uma URL válida
    new URL(url)
    
    // Lista de URLs conhecidas que funcionam
    const validUrls = [
      'https://www.gutenberg.org',
      'https://archive.org',
      'https://www.scielo.br',
      'https://www.ncbi.nlm.nih.gov',
      'https://www.youtube.com',
      'https://www.ifrc.org',
      'https://www.unifesp.br',
      'https://open.spotify.com',
      'https://creativecommons.org',
      'https://coursera.org',
      'https://www.who.int',
      'https://site.cfp.org.br',
      'https://doi.org'
    ]
    
    // Verificar se a URL começa com algum domínio válido
    const isKnownDomain = validUrls.some(validUrl => url.startsWith(validUrl))
    
    if (isKnownDomain) {
      return true
    }
    
    // Para URLs desconhecidas, considerar válidas por padrão
    // Em produção, você poderia fazer uma verificação real com fetch
    return true
  } catch {
    return false
  }
}

// Lista de URLs específicas que sabemos que funcionam
export const workingUrls = new Set([
  'https://www.gutenberg.org/files/25717/25717-pdf.pdf',
  'https://www.gutenberg.org/ebooks/15489',
  'https://archive.org/download/PrinciplesOfPsychology/Principles%20of%20Psychology.pdf',
  'https://www.scielo.br/j/prc/',
  'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7739326/',
  'https://www.youtube.com/watch?v=jDolJWZSqBU',
  'https://www.youtube.com/watch?v=JLLdagSGo24',
  'https://www.ifrc.org/our-work/disasters-climate-and-crises/psychological-support',
  'https://www.unifesp.br/campus/sao/cursos-livres/mindfulness',
  'https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf',
  'https://www.who.int/publications/i/item/9789241549790'
])