import { useEffect, useState, useRef } from 'react'
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
import confetti from 'canvas-confetti'

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
    confettiColors: ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb'],
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
    confettiColors: ['#FFD700', '#FFC107', '#FFAB00', '#FF8F00', '#FFE082'],
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
  const [showContent, setShowContent] = useState(false)
  const hasTriggeredRef = useRef(false)
  
  // Disparar confetti uma única vez quando o modal abre
  useEffect(() => {
    if (open && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true
      
      // ✅ Marcar que o modal de upgrade está ativo para evitar logout acidental
      sessionStorage.setItem('upgrade_modal_active', 'true')
      
      // Pequeno delay para garantir que o modal está montado
      const timer = setTimeout(() => {
        // Explosão única de confetti (igual ao programa de indicação)
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: plan.confettiColors,
          disableForReducedMotion: true
        })
        
        // Mostrar conteúdo do modal imediatamente após o confetti
        setShowContent(true)
      }, 100)
      
      return () => clearTimeout(timer)
    }
    
    if (!open) {
      // Reset quando o modal fecha
      hasTriggeredRef.current = false
      setShowContent(false)
      // ✅ Limpar flag quando o modal fecha normalmente
      sessionStorage.removeItem('upgrade_modal_active')
      sessionStorage.removeItem('show_upgrade_welcome')
    }
  }, [open, plan.confettiColors])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-4">
          <div 
            className={`flex justify-center mb-4 transition-all duration-300 ease-out ${
              showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className={`p-4 rounded-full ${plan.bgColor} ${plan.color}`}>
              {plan.icon}
            </div>
          </div>
          <div 
            className={`flex items-center justify-center gap-2 mb-2 transition-all duration-300 ease-out ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
            style={{ transitionDelay: showContent ? '50ms' : '0ms' }}
          >
            <Sparkles className={`h-5 w-5 ${plan.color}`} />
            <DialogTitle className="text-2xl">Parabéns!</DialogTitle>
            <Sparkles className={`h-5 w-5 ${plan.color}`} />
          </div>
          <DialogDescription 
            className={`text-base transition-all duration-300 ease-out ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
            style={{ transitionDelay: showContent ? '100ms' : '0ms' }}
          >
            Você agora é assinante do plano <strong className={plan.color}>{plan.name}</strong>!
          </DialogDescription>
        </DialogHeader>

        <div 
          className={`space-y-4 transition-all duration-300 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: showContent ? '150ms' : '0ms' }}
        >
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Star className="h-3 w-3 mr-1" />
              Recursos desbloqueados
            </Badge>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {plan.features.map((feature, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-3 transition-all duration-300 ease-out ${
                  showContent ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
                style={{ 
                  transitionDelay: showContent ? `${200 + index * 30}ms` : '0ms'
                }}
              >
                <div className="flex-shrink-0">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <p 
            className={`text-xs text-muted-foreground text-center transition-all duration-300 ease-out ${
              showContent ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: showContent ? '400ms' : '0ms' }}
          >
            Aproveite todos os recursos do seu novo plano!
          </p>
        </div>

        <DialogFooter 
          className={`pt-4 transition-all duration-300 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: showContent ? '450ms' : '0ms' }}
        >
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Começar a usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
