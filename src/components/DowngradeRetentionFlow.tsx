import { useState } from 'react'
import {
  AlertDialog,
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
import { AlertTriangle, Gift, Heart, TrendingDown, Loader2, Crown } from 'lucide-react'

interface DowngradeRetentionFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDowngrade: () => Promise<void>
  currentPlanName: string
  targetPlanName: string
  lostFeatures: string[]
}

export const DowngradeRetentionFlow = ({ 
  open, 
  onOpenChange, 
  onConfirmDowngrade, 
  currentPlanName,
  targetPlanName,
  lostFeatures
}: DowngradeRetentionFlowProps) => {
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

  const handleFinalDowngrade = async () => {
    setIsProcessing(true)
    try {
      await onConfirmDowngrade()
      setStep('initial')
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao fazer downgrade:', error)
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
                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle>Tem certeza que deseja mudar de plano?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p>
                Você está prestes a mudar do plano <strong>{currentPlanName}</strong> para o plano <strong>{targetPlanName}</strong>.
              </p>
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Você perderá acesso a:</p>
                  <ul className="text-sm space-y-1.5 text-muted-foreground">
                    {lostFeatures.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
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
              Continuar com mudança
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
                      <Crown className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-1">Manter o plano {currentPlanName}</p>
                        <p className="text-xs text-muted-foreground">
                          Continue aproveitando todos os recursos premium
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
              Prosseguir com mudança de plano
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
                Esta é sua última chance de manter todos os benefícios do plano {currentPlanName}.
              </p>
              
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm font-semibold mb-2 text-red-900 dark:text-red-100">
                    Após a mudança:
                  </p>
                  <ul className="text-sm space-y-1.5 text-red-800 dark:text-red-200">
                    <li>• Você permanecerá no plano atual até o fim do período pago</li>
                    <li>• Após o período, será movido para o plano {targetPlanName}</li>
                    <li>• Perderá acesso a recursos do plano {currentPlanName}</li>
                    <li>• Seus dados permanecerão salvos</li>
                    <li>• Poderá voltar ao plano atual a qualquer momento</li>
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
              onClick={handleFinalDowngrade}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Sim, confirmar mudança de plano'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
