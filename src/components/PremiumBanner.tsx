import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { useSidebar } from "@/components/ui/sidebar"



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
      <Button
        variant="ghost"
        size="icon"
        data-animate="true"
        className="premium-banner-mini animated-premium w-10 h-10 isolate overflow-hidden rounded-lg"
        onClick={handleUpgrade}
        title="Torne-se Premium"
      >
        <Crown className="w-5 h-5 text-white relative z-10" />
      </Button>
    )
  }

    return (
      <Button
        variant="ghost"
        data-animate="true"
        className="premium-banner animated-premium w-full h-12 px-3 isolate overflow-hidden group"
        onClick={handleUpgrade}
      >
      <div className="flex items-center gap-3 relative z-10">
        <Crown className="w-5 h-5 text-white" />
        <div className="flex-1 min-w-0 text-left leading-tight">
          <div className="text-white font-semibold text-xs">Torne-se Premium</div>
          <div className="text-white/80 text-[10px]">Desbloqueie recursos exclusivos</div>
        </div>
      </div>
    </Button>
  )
}