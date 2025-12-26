import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import NotificationDropdown from "@/components/NotificationDropdown"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import WhatsAppButton from "@/components/WhatsAppButton"
import { MobileLayout } from "@/components/MobileLayout"
import { useAuth } from "@/hooks/useAuth"
import { useUserTheme } from "@/hooks/useUserTheme"
import { useInstantTheme } from "@/hooks/useInstantTheme"
import { useColorTheme } from "@/hooks/useColorTheme"
import { useIsMobile } from "@/hooks/use-mobile"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth()
  const isMobile = useIsMobile()
  
  // Apply cached theme instantly to prevent flicker
  useInstantTheme(user?.id)
  
  // Load and apply user's theme preference
  useUserTheme()
  
  // Load and apply user's color preference
  useColorTheme()
  
  // Show loading state while authenticating
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // Only render layout if user is authenticated
  if (!user) {
    return null
  }

  // Mobile layout with bottom navigation
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>
  }
  
  // Desktop layout with sidebar
  return (
    <SidebarProvider>
      <div className="app-layout-container flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header transparente */}
          <header className="h-16 bg-transparent flex items-center justify-between px-4 md:px-8 flex-shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-accent transition-colors" />
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <ProfileDropdown />
            </div>
          </header>

          {/* Main Content - sem padding inferior para alinhar com sidebar */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 md:pt-8 pb-0">
            {children}
          </main>
        </div>
        <WhatsAppButton />
      </div>
    </SidebarProvider>
  )
}
