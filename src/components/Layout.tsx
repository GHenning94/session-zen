import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import NotificationDropdown from "@/components/NotificationDropdown"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import WhatsAppButton from "@/components/WhatsAppButton"
import { NotificationPermissionBanner } from "@/components/NotificationPermissionBanner"
import { useAuth } from "@/hooks/useAuth"
import { useUserTheme } from "@/hooks/useUserTheme"
import { useInstantTheme } from "@/hooks/useInstantTheme"
import { useColorTheme } from "@/hooks/useColorTheme"
import { Skeleton } from "@/components/ui/skeleton"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth()
  
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
  
  return (
    <SidebarProvider>
      <div className="flex w-full h-screen bg-background overflow-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-8">
            {children}
          </main>
        </div>
        <WhatsAppButton />
        <NotificationPermissionBanner />
      </div>
    </SidebarProvider>
  )
}
