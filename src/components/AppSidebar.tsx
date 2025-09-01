import { 
  Calendar, 
  Users, 
  CreditCard, 
  Settings, 
  LayoutDashboard,
  LogOut,
  Stethoscope,
  FileBarChart,
  BookOpen,
  CalendarCheck,
  FileText,
  NotebookPen,
  Star,
  Share2
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "@/hooks/use-toast"

const menuItems = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    title: "Agenda", 
    url: "/agenda", 
    icon: Calendar 
  },
  { 
    title: "Clientes", 
    url: "/clientes", 
    icon: Users 
  },
  { 
    title: "Pagamentos", 
    url: "/pagamentos", 
    icon: CreditCard 
  },
  { 
    title: "Relatórios", 
    url: "/relatorios", 
    icon: FileBarChart 
  },
  {
    title: "Eventos",
    url: "/eventos", 
    icon: CalendarCheck,
  },
  {
    title: "Prontuários",
    url: "/prontuarios",
    icon: FileText,
  },
  {
    title: "Sessões",
    url: "/sessoes",
    icon: NotebookPen,
  },
  {
    title: "Estudos",
    url: "/estudos",
    icon: BookOpen,
  },
  {
    title: "Redes Sociais",
    url: "/redes-sociais",
    icon: Share2,
  },
  {
    title: "Programa de Indicação",
    url: "/programa-indicacao",
    icon: Star,
  },
  { 
    title: "Configurações", 
    url: "/configuracoes", 
    icon: Settings 
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "hover:bg-accent transition-colors"

  const isCollapsed = state === "collapsed"

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      })
      navigate("/")
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive",
      })
    }
  }

  return (
    <Sidebar
      className={isCollapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-sm">TherapyPro</h2>
              <p className="text-xs text-muted-foreground">SaaS Profissional</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isDevPage = ['Eventos', 'Estudos', 'Redes Sociais'].includes(item.title)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavClasses}
                      >
                        <item.icon className={`w-4 h-4 ${isDevPage ? 'text-muted-foreground' : ''}`} />
                        {!isCollapsed && (
                          <span className={isDevPage ? 'text-muted-foreground' : ''}>{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button 
          variant="ghost" 
          size={isCollapsed ? "icon" : "sm"}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}