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
  Share2,
  Globe,
  Plug
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
import { PremiumBanner } from "@/components/PremiumBanner"
import { useSubscription } from "@/hooks/useSubscription"

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
    title: "Página Pública", 
    url: "/pagina-publica", 
    icon: Globe 
  },
  { 
    title: "Integrações", 
    url: "/integracoes", 
    icon: Plug 
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
  const { signOut, user } = useAuth()
  const { currentPlan } = useSubscription()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "hover:bg-accent transition-colors"

  const isCollapsed = state === "collapsed"

  // Show banner for basic and pro plans (always show for testing)
  const shouldShowPremiumBanner = true // Changed for testing - normally: (currentPlan === 'basico' || currentPlan === 'pro')

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
      className={isCollapsed ? "w-20" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border p-3">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className={`${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'} bg-gradient-to-br from-primary to-primary/80 rounded-[6px] flex items-center justify-center shadow-lg`}>
            <Stethoscope className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
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

      <SidebarFooter className="border-t border-border mx-3">
        <div className={`${isCollapsed ? 'p-2 flex justify-center' : 'p-4 pb-2'}`}>
          <PremiumBanner shouldShow={shouldShowPremiumBanner} />
        </div>
        
        <div className={`border-t border-border mx-0 ${isCollapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
          <Button 
            variant="ghost" 
            size={isCollapsed ? "icon" : "sm"}
            className={`${isCollapsed ? 'w-10 h-10' : 'w-full justify-start'} text-muted-foreground hover:text-foreground`}
            onClick={handleSignOut}
          >
            <LogOut className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}