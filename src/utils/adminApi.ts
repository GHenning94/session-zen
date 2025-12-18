// Admin API utility for making authenticated requests via httpOnly cookies
// Session token is stored in httpOnly cookie, not accessible via JavaScript

const SUPABASE_URL = 'https://ykwszazxigjivjkagjmf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4'

interface AdminApiResponse<T = any> {
  data: T | null
  error: Error | null
}

/**
 * Make an authenticated admin API call
 * The httpOnly cookie with the session token is automatically included
 */
export async function adminApiCall<T = any>(
  functionName: string,
  body: Record<string, any> = {}
): Promise<AdminApiResponse<T>> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        data: null,
        error: new Error(data?.error || `HTTP error ${response.status}`),
      }
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Clear admin session (client-side metadata only)
 * The httpOnly cookie will expire or be cleared by the server
 */
export function clearAdminSession(): void {
  sessionStorage.removeItem('admin_user_id')
  sessionStorage.removeItem('admin_session_expires')
}

/**
 * Check if we have admin session metadata
 * Note: This doesn't guarantee the session is valid (that's verified server-side)
 */
export function hasAdminSessionMetadata(): boolean {
  const expires = sessionStorage.getItem('admin_session_expires')
  if (!expires) return false
  
  const expiresAt = new Date(expires)
  return new Date() < expiresAt
}
