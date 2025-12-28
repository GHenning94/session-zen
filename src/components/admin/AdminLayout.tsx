import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "./AdminSidebar"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { clearAdminSession } from "@/utils/adminApi"
import { AdminThemeProvider } from "@/hooks/useAdminTheme"
import { AdminThemeToggle } from "./AdminThemeToggle"

interface AdminLayoutProps {
  children: React.ReactNode
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Clear client-side session metadata
    clearAdminSession()
    toast.success('Logout realizado com sucesso')
    navigate('/admin/login')
  }

  return (
    <AdminThemeProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex w-full bg-background">
          <AdminSidebar />
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="h-16 bg-transparent flex items-center justify-between px-4 md:px-8 flex-shrink-0">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-accent transition-colors" />
              </div>
              
              <div className="flex items-center gap-2">
                <AdminThemeToggle />
                <Button variant="outline" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8">
              <div className="w-full max-w-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AdminThemeProvider>
  )
}
