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
      <div className="px-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 premium-banner-mini relative overflow-hidden"
          onClick={handleUpgrade}
          title="Torne-se Premium"
        >
          <Crown className="w-5 h-5 text-white relative z-10" />
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 mb-4">
      <Button
        variant="ghost"
        className="premium-banner w-full h-16 relative overflow-hidden p-4 group"
        onClick={handleUpgrade}
      >
        <div className="flex items-center gap-3 relative z-10">
          <Crown className="w-6 h-6 text-white" />
          <div className="text-left">
            <div className="text-white font-semibold text-sm">Torne-se Premium</div>
            <div className="text-white/80 text-xs">Desbloqueie recursos exclusivos</div>
          </div>
        </div>
      </Button>
    </div>
  )
}