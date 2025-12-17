import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Loader2 } from "lucide-react"

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const verifySession = async () => {
      const sessionToken = localStorage.getItem('admin_session_token')

      if (!sessionToken) {
        setIsValid(false)
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.functions.invoke('admin-verify-session', {
          body: { sessionToken },
        })

        if (error || !data.valid) {
          // Limpar sessão inválida
          localStorage.removeItem('admin_session_token')
          localStorage.removeItem('admin_user_id')
          localStorage.removeItem('admin_session_expires')
          setIsValid(false)
        } else {
          setIsValid(true)
        }
      } catch (error) {
        console.error('[Admin Protected] Verification error:', error)
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

  return <div className="contents">{children}</div>
}