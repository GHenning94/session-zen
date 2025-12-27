import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { getAdminSessionToken, clearAdminSession } from "@/utils/adminApi"

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const verifySession = async () => {
      // Get session token from sessionStorage
      const sessionToken = getAdminSessionToken()

      if (!sessionToken) {
        setIsValid(false)
        setIsLoading(false)
        return
      }

      try {
        // Verify session via edge function with token in header
        const response = await fetch(
          `https://ykwszazxigjivjkagjmf.supabase.co/functions/v1/admin-verify-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4',
              'X-Admin-Session': sessionToken,
            },
            body: JSON.stringify({}),
          }
        )

        const data = await response.json()

        if (!response.ok || !data.valid) {
          clearAdminSession()
          setIsValid(false)
        } else {
          setIsValid(true)
        }
      } catch (error) {
        console.error('[Admin Protected] Verification error:', error)
        clearAdminSession()
        setIsValid(false)
      } finally {
        setIsLoading(false)
      }
    }

    verifySession()

    // Verificar a cada 5 minutos
    const interval = setInterval(verifySession, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!isValid) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}