import { Stethoscope } from "lucide-react"
import NotificationDropdown from "@/components/NotificationDropdown"
import { ProfileDropdown } from "@/components/ProfileDropdown"

interface MobileHeaderProps {
  title?: string
}

export function MobileHeader({ title }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary flex items-center justify-center rounded-xl shadow-sm">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">
              TherapyPro
            </h1>
          </div>
        </div>
        
        {/* Right actions */}
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}
