import { MobileHeader } from "@/components/MobileHeader"
import { MobileBottomNav } from "@/components/MobileBottomNav"

interface MobileLayoutProps {
  children: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="mobile-layout-container h-screen bg-background flex flex-col overflow-hidden">
      <MobileHeader />
      
      {/* Main Content - scrollable area with padding for bottom nav */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pb-20">
          {children}
        </div>
      </main>
      
      <MobileBottomNav />
    </div>
  )
}
