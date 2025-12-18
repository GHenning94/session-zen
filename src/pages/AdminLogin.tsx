import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Shield, Loader2 } from "lucide-react"

const TURNSTILE_SITE_KEY = '0x4AAAAAAB43UmamQYOA5yfH'

const AdminLogin = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [captchaReady, setCaptchaReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const turnstileRef = useRef<any>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!captchaReady) {
      toast.error('Por favor, complete o CAPTCHA')
      return
    }

    const formData = new FormData(formRef.current!)
    const captchaToken = formData.get('cf-turnstile-response') as string

    if (!captchaToken) {
      toast.error('Token CAPTCHA inválido')
      return
    }

    setIsLoading(true)

    try {
      // Use fetch directly to ensure cookies are properly handled
      const response = await fetch(
        `https://ykwszazxigjivjkagjmf.supabase.co/functions/v1/admin-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4',
          },
          credentials: 'include', // Important: include cookies
          body: JSON.stringify({
            email,
            password,
            captchaToken,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Falha no login')
      }

      // Store only non-sensitive data in sessionStorage (cleared when browser closes)
      // The actual session token is stored in an httpOnly cookie by the edge function
      sessionStorage.setItem('admin_user_id', data.userId)
      sessionStorage.setItem('admin_session_expires', data.expiresAt)

      toast.success('Login realizado com sucesso!')
      navigate('/admin/dashboard')

    } catch (error: any) {
      console.error('[Admin Login] Error:', error)
      toast.error(error.message || 'Erro ao fazer login')
      
      // Resetar CAPTCHA
      if (turnstileRef.current) {
        turnstileRef.current.reset()
      }
      setCaptchaReady(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Blue blob background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl border-2 relative z-10">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Painel Administrativo</CardTitle>
          <CardDescription>
            Acesso restrito apenas para administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do Administrador</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@therapypro.app.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="flex justify-center py-2">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={() => {
                  console.log('[Admin Login] CAPTCHA resolved')
                  setCaptchaReady(true)
                }}
                onError={() => {
                  console.error('[Admin Login] CAPTCHA error')
                  setCaptchaReady(false)
                  if (turnstileRef.current) {
                    turnstileRef.current.reset()
                  }
                }}
                onExpire={() => {
                  console.warn('[Admin Login] CAPTCHA expired')
                  setCaptchaReady(false)
                  if (turnstileRef.current) {
                    turnstileRef.current.reset()
                  }
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading || !captchaReady}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Acessar Painel
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>🔒 Acesso protegido por autenticação de dois fatores</p>
            <p className="mt-1">CAPTCHA + Validação de credenciais</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminLogin