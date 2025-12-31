import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Zap, Check, Star, Sparkles } from 'lucide-react'

interface UpgradeWelcomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newPlan: 'pro' | 'premium'
}

const planDetails = {
  pro: {
    name: 'Profissional',
    icon: <Zap className="h-8 w-8" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    features: [
      'Até 20 clientes ativos',
      'Sessões ilimitadas por cliente',
      'Histórico básico de atendimentos',
      'Agendamento online',
      'Suporte por email'
    ]
  },
  premium: {
    name: 'Premium',
    icon: <Crown className="h-8 w-8" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    features: [
      'Clientes ilimitados',
      'Histórico completo de atendimentos',
      'Relatórios em PDF',
      'Integração com WhatsApp',
      'Suporte prioritário',
      'Backup automático de dados'
    ]
  }
}

export const UpgradeWelcomeModal = ({ 
  open, 
  onOpenChange, 
  newPlan 
}: UpgradeWelcomeModalProps) => {
  const plan = planDetails[newPlan]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${plan.bgColor} ${plan.color}`}>
              {plan.icon}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <DialogTitle className="text-2xl">Parabéns!</DialogTitle>
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <DialogDescription className="text-base">
            Você agora é assinante do plano <strong className={plan.color}>{plan.name}</strong>!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Star className="h-3 w-3 mr-1" />
              Recursos desbloqueados
            </Badge>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Aproveite todos os recursos do seu novo plano!
          </p>
        </div>

        <DialogFooter className="pt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Começar a usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
