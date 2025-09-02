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
        className="w-10 h-10 premium-banner-mini relative overflow-hidden mx-auto"
        onClick={handleUpgrade}
        title="Torne-se Premium"
      >
        <Crown className="w-4 h-4 text-white relative z-10" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      className="premium-banner w-full h-14 relative overflow-hidden group"
      onClick={handleUpgrade}
    >
      <div className="flex items-center gap-3 relative z-10">
        <Crown className="w-5 h-5 text-white" />
        <div className="text-left">
          <div className="text-white font-semibold text-sm">Torne-se Premium</div>
          <div className="text-white/80 text-xs">Desbloqueie recursos exclusivos</div>
        </div>
      </div>
    </Button>
  )
}