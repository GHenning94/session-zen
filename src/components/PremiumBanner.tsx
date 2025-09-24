import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { useSidebar } from "@/components/ui/sidebar"
import { StripeGradientCanvas } from "./StripeGradient"



interface PremiumBannerProps {
  shouldShow: boolean
}

export const PremiumBanner = ({ shouldShow }: PremiumBannerProps) => {
  const navigate = useNavigate()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  if (!shouldShow) return null

  const handleUpgrade = () => {
    navigate("/upgrade")
  }

  if (isCollapsed) {
    return (
      <div className="relative w-8 h-8 rounded-md overflow-hidden">
        <StripeGradientCanvas />
        <Button
          variant="ghost"
          size="icon"
          className="relative z-10 w-8 h-8 bg-transparent border-0 hover:bg-white/10"
          onClick={handleUpgrade}
          title="Torne-se Premium"
        >
          <Crown className="w-4 h-4 text-white" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-12 rounded-md overflow-hidden">
      <StripeGradientCanvas />
      <Button
        variant="ghost"
        className="relative z-10 w-full h-12 bg-transparent border-0 hover:bg-white/10 group"
        onClick={handleUpgrade}
      >
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-white" />
          <div className="text-left">
            <div className="text-white font-semibold text-xs">Torne-se Premium</div>
            <div className="text-white/80 text-[10px]">Desbloqueie recursos exclusivos</div>
          </div>
        </div>
      </Button>
    </div>
  )
}