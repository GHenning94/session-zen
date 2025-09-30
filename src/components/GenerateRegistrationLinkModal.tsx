import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, Copy, Clock, Shield, AlertCircle, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface GenerateRegistrationLinkModalProps {
  children: React.ReactNode
}

export const GenerateRegistrationLinkModal = ({ children }: GenerateRegistrationLinkModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [linkData, setLinkData] = useState<{
    token: string
    registrationUrl: string
    expiresAt: string
    professionalName: string
    isExisting: boolean
  } | null>(null)
  const { toast } = useToast()

  const generateLink = async (forceNew = false) => {
    setIsGenerating(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Erro",
          description: "Você precisa estar autenticado para gerar links",
          variant: "destructive"
        })
        return
      }

      const { data, error } = await supabase.functions.invoke('generate-registration-token', {
        body: { forceNew }
      })

      if (error) throw error

      setLinkData(data)
      
      if (forceNew) {
        toast({
          title: "Sucesso",
          description: "Novo link gerado! O link anterior foi revogado.",
        })
      } else if (data.isExisting) {
        toast({
          title: "Link encontrado",
          description: "Link existente carregado!",
        })
      } else {
        toast({
          title: "Sucesso",
          description: "Link de cadastro gerado!",
        })
      }
    } catch (error) {
      console.error('Error generating link:', error)
      toast({
        title: "Erro",
        description: "Erro ao gerar link de cadastro",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    if (linkData?.registrationUrl) {
      navigator.clipboard.writeText(linkData.registrationUrl)
      toast({
        title: "Sucesso",
        description: "Link copiado para a área de transferência!",
      })
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Load existing link when modal opens
      generateLink(false)
    } else {
      // Clear link data when modal closes
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
            Gere um link seguro para que pacientes possam se cadastrar diretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {linkData ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Link {linkData.isExisting ? "Ativo" : "Gerado"}</AlertTitle>
                <AlertDescription>
                  <strong>Cada link só pode ser usado uma única vez — crie 1 link por paciente.</strong>
                  {linkData.isExisting && " Este é um link ativo existente que ainda não foi utilizado."}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Link de Cadastro</Label>
                <div className="flex gap-2">
                  <Input
                    value={linkData.registrationUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Válido até: {formatExpirationDate(linkData.expiresAt)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  <span>Profissional: {linkData.professionalName}</span>
                </div>
              </div>

              <Alert variant="default">
                <Shield className="h-4 w-4" />
                <AlertTitle>Segurança e Validade</AlertTitle>
                <AlertDescription>
                  Este link permanece válido por 30 dias ou até que um paciente conclua o cadastro. 
                  Apenas abrir o link NÃO o invalida - o link só expira quando o cadastro é finalizado.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={() => generateLink(true)}
                  variant="outline"
                  className="flex-1"
                  disabled={isGenerating}
                >
                  {isGenerating ? "Gerando..." : "Gerar Novo Link"}
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}