import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Gift, Heart, TrendingDown, Loader2 } from 'lucide-react'

interface CancelSubscriptionFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmCancel: () => Promise<void>
  planName: string
}

export const CancelSubscriptionFlow = ({ 
  open, 
  onOpenChange, 
  onConfirmCancel, 
  planName 
}: CancelSubscriptionFlowProps) => {
  const [step, setStep] = useState<'initial' | 'alternatives' | 'final'>('initial')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleKeepPlan = () => {
    setStep('initial')
    onOpenChange(false)
  }

  const handleContinue = () => {
    if (step === 'initial') {
      setStep('alternatives')
    } else if (step === 'alternatives') {
      setStep('final')
    }
  }

  const handleFinalCancel = async () => {
    setIsProcessing(true)
    try {
      await onConfirmCancel()
      setStep('initial')
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao cancelar:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep('initial')
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      {step === 'initial' && (
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p>
                Você está prestes a cancelar seu plano <strong>{planName}</strong>.
              </p>
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Você perderá acesso a:</p>
                  <ul className="text-sm space-y-1.5 text-muted-foreground">
                    <li>• Histórico completo de sessões</li>
                    <li>• Relatórios PDF avançados</li>
                    <li>• Integrações com ferramentas externas</li>
                    <li>• Suporte prioritário</li>
                  </ul>
                </CardContent>
              </Card>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepPlan}>
              Manter meu plano
            </AlertDialogCancel>
            <Button variant="destructive" onClick={handleContinue}>
              Continuar cancelamento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}

      {step === 'alternatives' && (
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <AlertDialogTitle>Que tal tentar uma alternativa?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p>
                Entendemos que você pode estar enfrentando dificuldades. Aqui estão algumas opções:
              </p>
              
              <div className="space-y-3">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <TrendingDown className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-1">Mudar para plano inferior</p>
                        <p className="text-xs text-muted-foreground">
                          Economize mantendo funcionalidades essenciais
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <Heart className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-1">Fale com nosso suporte</p>
                        <p className="text-xs text-muted-foreground">
                          Podemos ajudar a resolver qualquer problema
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Nossa equipe está aqui para ajudar você a ter a melhor experiência possível.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full" onClick={handleKeepPlan}>
              Quero manter meu plano
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => window.open('mailto:suporte@therapypro.app.br', '_blank')}
            >
              Falar com suporte
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-destructive hover:text-destructive" 
              onClick={handleContinue}
            >
              Prosseguir com cancelamento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}

      {step === 'final' && (
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle>Confirmação final</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p>
                Esta é sua última chance de manter todos os benefícios do plano {planName}.
              </p>
              
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm font-semibold mb-2 text-red-900 dark:text-red-100">
                    Após o cancelamento:
                  </p>
                  <ul className="text-sm space-y-1.5 text-red-800 dark:text-red-200">
                    <li>• Você será movido para o plano Básico (gratuito)</li>
                    <li>• Perderá acesso a recursos premium</li>
                    <li>• Seus dados permanecerão salvos</li>
                    <li>• Poderá reativar sua assinatura a qualquer momento</li>
                  </ul>
                </CardContent>
              </Card>

              <div className="pt-2 pb-2 text-center">
                <Badge variant="outline" className="text-xs">
                  Você pode voltar quando quiser
                </Badge>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              className="w-full" 
              variant="default"
              onClick={handleKeepPlan}
            >
              Não, quero manter meu plano
            </Button>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleFinalCancel}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sim, confirmar cancelamento'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
