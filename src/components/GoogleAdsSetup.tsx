import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Settings, Info, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export const GoogleAdsSetup = () => {
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleTestConversion = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('google-ads', {
        body: {
          conversionAction: 'subscription',
          userId: 'test-user',
          value: 29.90
        }
      })

      if (error) throw error

      toast({
        title: "Teste realizado com sucesso",
        description: "Conversão de teste enviada ao Google Ads",
      })

      setIsConfigured(true)
    } catch (error) {
      console.error('Erro no teste:', error)
      toast({
        title: "Erro no teste",
        description: "Verifique as configurações do Google Ads",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Google Ads</CardTitle>
          {isConfigured && <Badge variant="default" className="text-white" style={{ backgroundColor: 'hsl(142 71% 45%)' }}>Configurado</Badge>}
        </div>
        <CardDescription>
          Configure o rastreamento de conversões do Google Ads para otimizar suas campanhas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para configurar o Google Ads, você precisa:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Customer ID do Google Ads</li>
              <li>Conversion ID</li>
              <li>Conversion Label</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Configurações Necessárias no Google Cloud Console:</Label>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p><strong>1. Ativar Google Ads API:</strong></p>
              <p>Acesse o Google Cloud Console → APIs & Services → Library</p>
              <p>Procure por "Google Ads API" e ative</p>
              
              <p className="mt-3"><strong>2. Criar credenciais:</strong></p>
              <p>APIs & Services → Credentials → Create Credentials → Service Account</p>
              
              <p className="mt-3"><strong>3. Configurar conversões:</strong></p>
              <p>No Google Ads → Tools & Settings → Conversions → New Conversion Action</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleTestConversion}
              disabled={isLoading}
              variant={isConfigured ? "outline" : "default"}
            >
              {isLoading ? "Testando..." : "Testar Configuração"}
            </Button>
            
            {isConfigured && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: 'hsl(142 71% 45%)' }} />
                <span className="text-sm" style={{ color: 'hsl(142 71% 45%)' }}>Google Ads configurado com sucesso</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}