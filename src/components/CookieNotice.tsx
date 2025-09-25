import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Shield, Info } from "lucide-react"

export const CookieNotice = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookie-consent')
    if (!cookieConsent) {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setIsVisible(false)
  }

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'rejected')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto sm:left-auto sm:right-4 sm:max-w-md">
      <Card className="p-4 shadow-lg border-border bg-background/95 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Proteção de Dados - LGPD</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReject}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência, 
            personalizar conteúdo e analisar o tráfego do site. Seus dados são tratados 
            conforme nossa Política de Privacidade e a Lei Geral de Proteção de Dados (LGPD).
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Você pode alterar suas preferências a qualquer momento.</span>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs"
            >
              Aceitar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="flex-1 text-xs"
            >
              Recusar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}