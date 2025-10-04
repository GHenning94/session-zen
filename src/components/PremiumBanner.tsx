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

  return (
    <Button
      variant="ghost"
      data-animate="true"
      className={`premium-banner animated-premium isolate overflow-visible group ${
        isCollapsed 
          ? 'w-10 h-10 p-0 flex items-center justify-center rounded-lg' 
          : 'w-full h-10 px-2 rounded-xl'
      }`}
      onClick={handleUpgrade}
      title={isCollapsed ? "Torne-se Premium" : undefined}
    >
      <div className={`flex items-center relative z-10 ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
        <Crown className="w-5 h-5 text-white shrink-0" />
        {!isCollapsed && (
          <div className="text-left">
            <div className="text-white font-semibold text-[11px] leading-tight">Premium</div>
            <div className="text-white/80 text-[9px] leading-tight">Desbloquear</div>
          </div>
        )}
      </div>
    </Button>
  )
}