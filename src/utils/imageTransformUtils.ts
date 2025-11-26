/**
 * Supabase Image Transformations
 * Usa o endpoint /render/image/ para otimizar imagens on-the-fly
 * com cache automático pelo Supabase CDN
 */

export interface ImageTransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  resize?: 'cover' | 'contain' | 'fill'
}

const SUPABASE_URL = "https://ykwszazxigjivjkagjmf.supabase.co"

/**
 * Gera URL otimizada com transformações do Supabase
 * Usa o endpoint /render/image/ para transformações automáticas com CDN
 */
export const getOptimizedImageUrl = (
  storagePath: string,
  options: ImageTransformOptions = {}
): string => {
  // Se não for do storage, retornar como está
  if (!storagePath || storagePath.startsWith('http')) {
    return storagePath
  }

  // Remover prefixo 'user-uploads/' se presente
  const cleanPath = storagePath.replace(/^user-uploads\//, '')
  
  // Defaults otimizados
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover'
  } = options

  // Construir URL com transformações
  const params = new URLSearchParams()
  
  if (width) params.append('width', width.toString())
  if (height) params.append('height', height.toString())
  params.append('quality', quality.toString())
  params.append('format', format)
  params.append('resize', resize)

  // URL do Supabase com transformações
  return `${SUPABASE_URL}/storage/v1/render/image/public/user-uploads/${cleanPath}?${params.toString()}`
}

/**
 * Presets para diferentes contextos
 */
export const IMAGE_PRESETS = {
  avatar: {
    sm: { width: 80, height: 80, quality: 70 },
    md: { width: 120, height: 120, quality: 75 },
    lg: { width: 200, height: 200, quality: 80 }
  },
  thumbnail: {
    width: 200,
    height: 200,
    quality: 70
  },
  card: {
    width: 400,
    height: 300,
    quality: 75
  },
  fullWidth: {
    width: 800,
    quality: 80
  }
} as const

/**
 * Helper para obter URL de avatar otimizada
 */
export const getAvatarUrl = (
  path: string | null | undefined,
  size: 'sm' | 'md' | 'lg' = 'md'
): string | null => {
  if (!path) return null
  return getOptimizedImageUrl(path, IMAGE_PRESETS.avatar[size])
}

/**
 * Helper para obter thumbnail otimizado
 */
export const getThumbnailUrl = (path: string | null | undefined): string | null => {
  if (!path) return null
  return getOptimizedImageUrl(path, IMAGE_PRESETS.thumbnail)
}
