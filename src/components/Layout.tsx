import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import NotificationDropdown from "@/components/NotificationDropdown"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import WhatsAppButton from "@/components/WhatsAppButton"
import { NotificationPermissionBanner } from "@/components/NotificationPermissionBanner"
import { useAuth } from "@/hooks/useAuth"
import { useUserTheme } from "@/hooks/useUserTheme"
import { useInstantTheme } from "@/hooks/useInstantTheme"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth()
  
  // Apply cached theme instantly to prevent flicker
  useInstantTheme(user?.id)
  
  // Load and apply user's theme preference
  useUserTheme()
  
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
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header transparente */}
          <header className="h-16 bg-transparent flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-accent transition-colors" />
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <ProfileDropdown />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
        <WhatsAppButton />
        <NotificationPermissionBanner />
      </div>
    </SidebarProvider>
  )
}