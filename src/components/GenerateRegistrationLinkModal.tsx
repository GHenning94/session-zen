import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, Copy, Clock, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface GenerateRegistrationLinkModalProps {
  children: React.ReactNode
}

export const GenerateRegistrationLinkModal = ({ children }: GenerateRegistrationLinkModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [linkData, setLinkData] = useState<{
    url: string
    expiresAt: string
    professionalName: string
    isExisting?: boolean
  } | null>(null)
  const [isCheckingExisting, setIsCheckingExisting] = useState(false)
  const { toast } = useToast()

  const generateLink = async (forceNew = false) => {
    try {
      setIsGenerating(true)
      
      // If forcing new, first revoke existing tokens
      if (forceNew) {
        await supabase.functions.invoke('generate-registration-token', {
          body: { forceNew: true }
        })
      }
      
      const { data, error } = await supabase.functions.invoke('generate-registration-token', {
        body: {}
      })

      if (error) {
        console.error('Error generating link:', error)
        throw new Error(error.message || 'Erro ao gerar link')
      }

      if (data.success) {
        setLinkData({
          url: data.registrationUrl,
          expiresAt: data.expiresAt,
          professionalName: data.professionalName,
          isExisting: data.isExisting
        })
        
        toast({
          title: forceNew ? "Novo link gerado!" : "Link gerado com sucesso!",
          description: "O link de cadastro está pronto para ser compartilhado.",
        })
      } else {
        throw new Error(data.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erro ao gerar link",
        description: error.message || "Não foi possível gerar o link de cadastro.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (linkData?.url) {
      try {
        await navigator.clipboard.writeText(linkData.url)
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para a área de transferência.",
        })
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o link.",
          variant: "destructive"
        })
      }
    }
  }

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const checkExistingLink = async () => {
    try {
      setIsCheckingExisting(true)
      
      const { data, error } = await supabase.functions.invoke('generate-registration-token', {
        body: {}
      })

      if (error) {
        console.error('Error checking existing link:', error)
        return
      }

      if (data.success) {
        setLinkData({
          url: data.registrationUrl,
          expiresAt: data.expiresAt,
          professionalName: data.professionalName,
          isExisting: data.isExisting
        })
        
        if (data.isExisting) {
          toast({
            title: "Link encontrado!",
            description: "Você já possui um link válido. Use-o ou gere um novo.",
          })
        } else {
          toast({
            title: "Link gerado com sucesso!",
            description: "O link de cadastro está pronto para ser compartilhado.",
          })
        }
      }
    } catch (error: any) {
      console.error('Error:', error)
    } finally {
      setIsCheckingExisting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Check for existing link when opening
      checkExistingLink()
    } else {
      // Reset state when closing
      setLinkData(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            Gerar Link de Cadastro Público
          </DialogTitle>
          <DialogDescription>
            Crie um link seguro para que seus pacientes possam se cadastrar diretamente na sua agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!linkData ? (
            <div className="space-y-4">
              {isCheckingExisting && (
                <div className="text-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Verificando links existentes...</p>
                </div>
              )}
              
              {!isCheckingExisting && (
                <>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm">Segurança</h4>
                        <p className="text-sm text-muted-foreground">
                          Cada link é único e seguro, vinculado exclusivamente à sua conta.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm">Validade</h4>
                        <p className="text-sm text-muted-foreground">
                          O link expira automaticamente em 30 dias para sua segurança.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚠️ Importante: Cada link só pode ser usado uma única vez — crie 1 link por paciente.
                    </p>
                  </div>

                  <Button 
                    onClick={() => generateLink(false)} 
                    disabled={isGenerating}
                    className="w-full bg-gradient-primary hover:opacity-90"
                  >
                    {isGenerating ? 'Gerando...' : 'Gerar Link de Cadastro'}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`${linkData.isExisting ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
                <h4 className={`font-semibold mb-2 ${linkData.isExisting ? 'text-blue-800' : 'text-green-800'}`}>
                  {linkData.isExisting ? 'Link válido encontrado!' : 'Link gerado com sucesso!'}
                </h4>
                <p className={`text-sm ${linkData.isExisting ? 'text-blue-700' : 'text-green-700'}`}>
                  {linkData.isExisting 
                    ? 'Você já possui um link válido. Compartilhe este link com seus pacientes.'
                    : 'Compartilhe este link com seus pacientes para que eles possam se cadastrar diretamente.'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration-link">Link de Cadastro</Label>
                <div className="flex gap-2">
                  <Input
                    id="registration-link"
                    value={linkData.url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p><strong>Válido até:</strong> {formatExpirationDate(linkData.expiresAt)}</p>
                <p className="text-muted-foreground mt-1">
                  Após o cadastro, você receberá uma notificação e o cliente aparecerá automaticamente na sua lista.
                </p>
                <p className="text-orange-600 font-medium mt-2">
                  ⚠️ Este link só pode ser usado uma única vez por paciente.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => generateLink(true)} 
                  variant="outline"
                  className="flex-1"
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Gerando...' : 'Gerar Novo Link'}
                </Button>
                <Button 
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}