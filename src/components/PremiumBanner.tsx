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
        className="premium-banner-mini animated-premium w-8 h-8 isolate overflow-hidden rounded-lg p-0 flex items-center justify-center"
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
      className="premium-banner animated-premium w-full h-10 isolate overflow-hidden group px-2"
      onClick={handleUpgrade}
    >
      <div className="flex items-center gap-2 relative z-10">
        <Crown className="w-5 h-5 text-white shrink-0" />
        <div className="text-left">
          <div className="text-white font-semibold text-[11px] leading-tight">Premium</div>
          <div className="text-white/80 text-[9px] leading-tight">Desbloquear</div>
        </div>
      </div>
    </Button>
  )
}