import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { useSidebar } from "@/components/ui/sidebar"

import "@/styles/premium.css"

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
        className="w-8 h-8 premium-banner-mini relative isolate overflow-hidden bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent"
        onClick={handleUpgrade}
        title="Torne-se Premium"
      >
        <span className="premium-gradient" aria-hidden="true" />
        <Crown className="w-4 h-4 text-white relative z-10" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      data-animate="true"
      className="premium-banner w-full h-12 relative isolate overflow-hidden group bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent"
      onClick={handleUpgrade}
    >
      <span className="premium-gradient" aria-hidden="true" />
      <div className="flex items-center gap-3 relative z-10">
        <Crown className="w-5 h-5 text-white" />
        <div className="text-left">
          <div className="text-white font-semibold text-xs">Torne-se Premium</div>
          <div className="text-white/80 text-[10px]">Desbloqueie recursos exclusivos</div>
        </div>
      </div>
    </Button>
  )
}