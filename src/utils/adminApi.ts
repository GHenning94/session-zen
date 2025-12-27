// Admin API utility for making authenticated requests
// Session token is stored in sessionStorage and sent via Authorization header

const SUPABASE_URL = 'https://ykwszazxigjivjkagjmf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4'

const ADMIN_SESSION_KEY = 'admin_session_token'
const ADMIN_USER_KEY = 'admin_user_id'
const ADMIN_EXPIRES_KEY = 'admin_session_expires'

interface AdminApiResponse<T = any> {
  data: T | null
  error: Error | null
}

/**
 * Store admin session data securely
 */
export function setAdminSession(sessionToken: string, userId: string, expiresAt: string): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, sessionToken)
  sessionStorage.setItem(ADMIN_USER_KEY, userId)
  sessionStorage.setItem(ADMIN_EXPIRES_KEY, expiresAt)
}

/**
 * Get the admin session token
 */
export function getAdminSessionToken(): string | null {
  const token = sessionStorage.getItem(ADMIN_SESSION_KEY)
  const expires = sessionStorage.getItem(ADMIN_EXPIRES_KEY)
  
  if (!token || !expires) return null
  
  // Check if session has expired
  if (new Date() >= new Date(expires)) {
    clearAdminSession()
    return null
  }
  
  return token
}

/**
 * Make an authenticated admin API call
 * The session token is sent via X-Admin-Session header
 */
export async function adminApiCall<T = any>(
  functionName: string,
  body: Record<string, any> = {}
): Promise<AdminApiResponse<T>> {
  try {
    const sessionToken = getAdminSessionToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    }
    
    // Add session token to headers if available
    if (sessionToken) {
      headers['X-Admin-Session'] = sessionToken
    }
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers,
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
 * Clear admin session
 */
export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  sessionStorage.removeItem(ADMIN_USER_KEY)
  sessionStorage.removeItem(ADMIN_EXPIRES_KEY)
}

/**
 * Check if we have a valid admin session
 */
export function hasAdminSessionMetadata(): boolean {
  return getAdminSessionToken() !== null
}

/**
 * Get admin user ID
 */
export function getAdminUserId(): string | null {
  return sessionStorage.getItem(ADMIN_USER_KEY)
}
