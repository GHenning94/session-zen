import { useEffect, useState, useCallback } from 'react'
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
  const [isAnimating, setIsAnimating] = useState(false)
  const [showContent, setShowContent] = useState(false)
  
  // Disparar confetti e animação quando o modal abre
  const triggerCelebration = useCallback(() => {
    if (!open || isAnimating) return
    
    setIsAnimating(true)
    setShowContent(false)
    
    // Usar requestAnimationFrame para garantir fluidez
    requestAnimationFrame(() => {
      // Primeiro burst de confetti (centro)
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: plan.confettiColors,
        startVelocity: 30,
        gravity: 0.8,
        scalar: 1.2,
        drift: 0,
        ticks: 100,
        disableForReducedMotion: true
      })
      
      // Segundo burst (esquerda) - com pequeno delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.3, y: 0.6 },
          colors: plan.confettiColors,
          startVelocity: 25,
          gravity: 0.9,
          scalar: 1,
          ticks: 80,
          disableForReducedMotion: true
        })
      }, 100)
      
      // Terceiro burst (direita) - com delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.7, y: 0.6 },
          colors: plan.confettiColors,
          startVelocity: 25,
          gravity: 0.9,
          scalar: 1,
          ticks: 80,
          disableForReducedMotion: true
        })
      }, 200)
      
      // Mostrar conteúdo do modal após o burst inicial
      setTimeout(() => {
        setShowContent(true)
      }, 150)
    })
  }, [open, isAnimating, plan.confettiColors])
  
  useEffect(() => {
    if (open) {
      // Reset states and trigger celebration
      setIsAnimating(false)
      setShowContent(false)
      // Pequeno delay para garantir que o modal está visível
      const timer = setTimeout(triggerCelebration, 50)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(false)
      setShowContent(false)
    }
  }, [open, triggerCelebration])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`max-w-md transition-all duration-500 ease-out ${
          showContent 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-90 translate-y-4'
        }`}
        style={{
          willChange: 'transform, opacity'
        }}
      >
        <DialogHeader className="text-center pb-4">
          <div 
            className={`flex justify-center mb-4 transition-all duration-500 ease-out delay-100 ${
              showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className={`p-4 rounded-full ${plan.bgColor} ${plan.color} animate-pulse`}>
              {plan.icon}
            </div>
          </div>
          <div 
            className={`flex items-center justify-center gap-2 mb-2 transition-all duration-500 ease-out delay-150 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <Sparkles className={`h-5 w-5 ${plan.color} animate-pulse`} />
            <DialogTitle className="text-2xl">Parabéns!</DialogTitle>
            <Sparkles className={`h-5 w-5 ${plan.color} animate-pulse`} />
          </div>
          <DialogDescription 
            className={`text-base transition-all duration-500 ease-out delay-200 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            Você agora é assinante do plano <strong className={plan.color}>{plan.name}</strong>!
          </DialogDescription>
        </DialogHeader>

        <div 
          className={`space-y-4 transition-all duration-500 ease-out delay-300 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
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
                  transitionDelay: showContent ? `${350 + index * 50}ms` : '0ms'
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
            className={`text-xs text-muted-foreground text-center transition-all duration-500 ease-out ${
              showContent ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: showContent ? '600ms' : '0ms' }}
          >
            Aproveite todos os recursos do seu novo plano!
          </p>
        </div>

        <DialogFooter 
          className={`pt-4 transition-all duration-500 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: showContent ? '650ms' : '0ms' }}
        >
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Começar a usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
