import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { X, Shield, Info, Cookie, Settings } from "lucide-react"

interface CookiePreferences {
  analytics: boolean
  marketing: boolean
  functional: boolean
}

export const CookieNotice = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    analytics: true,
    marketing: false,
    functional: true
  })

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookie-consent')
    const savedPreferences = localStorage.getItem('cookie-preferences')
    
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences))
    }
    
    if (!cookieConsent) {
      setIsVisible(true)
    } else {
      setShowManagement(true)
    }
  }, [])

  useEffect(() => {
    // Apply analytics preferences
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        'analytics_storage': preferences.analytics ? 'granted' : 'denied',
        'ad_storage': preferences.marketing ? 'granted' : 'denied'
      })
    }
  }, [preferences])

  const handleAccept = () => {
    const fullConsent = { analytics: true, marketing: true, functional: true }
    localStorage.setItem('cookie-consent', 'accepted')
    localStorage.setItem('cookie-preferences', JSON.stringify(fullConsent))
    setPreferences(fullConsent)
    setIsVisible(false)
    setShowManagement(true)
  }

  const handleReject = () => {
    const minimalConsent = { analytics: false, marketing: false, functional: true }
    localStorage.setItem('cookie-consent', 'rejected')
    localStorage.setItem('cookie-preferences', JSON.stringify(minimalConsent))
    setPreferences(minimalConsent)
    setIsVisible(false)
    setShowManagement(true)
  }

  const savePreferences = () => {
    localStorage.setItem('cookie-preferences', JSON.stringify(preferences))
    setShowManagement(true)
  }

  if (!isVisible && !showManagement) return null

  return (
    <div className="contents">
      {/* Cookie Notice */}
      {isVisible && (
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
                  Aceitar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  className="flex-1 text-xs"
                >
                  Apenas Essenciais
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cookie Management Button */}
      {showManagement && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="fixed bottom-6 right-6 z-40 rounded-full h-12 w-12 p-0 shadow-lg bg-primary hover:bg-primary/90 text-white"
              aria-label="Gerenciar Cookies"
            >
              <Cookie className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Preferências de Cookies
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cookies Essenciais</label>
                    <p className="text-xs text-muted-foreground">
                      Necessários para o funcionamento básico do site
                    </p>
                  </div>
                  <Switch checked={preferences.functional} disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cookies Analíticos</label>
                    <p className="text-xs text-muted-foreground">
                      Nos ajudam a entender como você usa o site
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, analytics: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cookies de Marketing</label>
                    <p className="text-xs text-muted-foreground">
                      Para personalizar anúncios e conteúdo
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, marketing: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    onClick={savePreferences}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    Salvar Preferências
                  </Button>
                </DialogTrigger>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}