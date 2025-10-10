import { getSignedUrl } from './storageUtils'

/**
 * Generate signed URLs for avatars in batch
 */
export const generateAvatarSignedUrls = async (avatarUrls: string[]): Promise<Record<string, string>> => {
  const uniqueUrls = [...new Set(avatarUrls.filter(Boolean))]
  const signedUrls: Record<string, string> = {}
  
  await Promise.all(
    uniqueUrls.map(async (url) => {
      if (url && url.startsWith('user-uploads/')) {
        const signedUrl = await getSignedUrl(url, 3600)
        if (signedUrl) {
          signedUrls[url] = signedUrl
        }
      } else if (url) {
        // If it's already a full URL or doesn't need signing
        signedUrls[url] = url
      }
    })
  )
  
  return signedUrls
}

/**
 * Get a single signed URL for an avatar
 */
export const getAvatarSignedUrl = async (avatarUrl: string | null | undefined): Promise<string | null> => {
  if (!avatarUrl) return null
  
  if (avatarUrl.startsWith('user-uploads/')) {
    return await getSignedUrl(avatarUrl, 3600)
  }
  
  return avatarUrl
}
