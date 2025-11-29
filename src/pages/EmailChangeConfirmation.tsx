import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"

export default function EmailChangeConfirmation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [resendCooldown, setResendCooldown] = useState(60)
  const [isLoading, setIsLoading] = useState(false)
  const email = searchParams.get('email') || ''

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || !email) return

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'email_change',
        email: email
      })

      if (error) throw error

      setResendCooldown(60)
      toast.success('Email reenviado! Verifique sua caixa de entrada.')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reenviar email.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!email) {
    navigate('/configuracoes')
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Confirme seu novo e-mail</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação para <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Clique no link enviado para confirmar seu novo e-mail. Após a confirmação, você será redirecionado para fazer login.
          </p>
          <Button
            onClick={handleResendConfirmation}
            disabled={resendCooldown > 0 || isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reenviando...
              </>
            ) : resendCooldown > 0 ? (
              `Reenviar em ${resendCooldown}s`
            ) : (
              'Reenviar Link'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/login')}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
