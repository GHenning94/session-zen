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
  Plug,
  HelpCircle
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
      icon: LayoutDashboard,
    },
    {
      title: "Agenda",
      url: "/agenda",
      icon: Calendar,
    },
    {
      title: "Clientes",
      url: "/clientes",
      icon: Users,
    },
    {
      title: "Pagamentos",
      url: "/pagamentos",
      icon: CreditCard,
    },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: FileBarChart,
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
    {
      title: "Suporte",
      url: "/suporte",
      icon: HelpCircle,
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
      ? "bg-primary text-primary-foreground font-semibold shadow-sm rounded-xl" 
      : "hover:bg-sidebar-accent/70 transition-all duration-200 rounded-xl"

  const isCollapsed = state === "collapsed"
  const shouldShowPremiumBanner = currentPlan === 'basico' || !currentPlan

  // Separar Configurações dos outros itens
  const mainMenuItems = menuItems.filter(item => item.url !== '/configuracoes')
  const settingsItem = menuItems.find(item => item.url === '/configuracoes')

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
      className="border-none m-3 rounded-2xl shadow-medium overflow-hidden"
      collapsible="icon"
    >
      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-3">
              {mainMenuItems.map((item) => {
                const isDevPage = ['Eventos', 'Estudos', 'Redes Sociais'].includes(item.title)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className={`h-11 ${getNavClasses({ isActive: isActive(item.url) })}`}>
                      <NavLink to={item.url} end>
                        <item.icon className={`h-5 w-5 ${isDevPage ? 'text-muted-foreground' : ''}`} />
                        {!isCollapsed && (
                          <span className={`text-sm ${isDevPage ? 'text-muted-foreground' : ''}`}>
                            {item.title}
                          </span>
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

      <SidebarFooter className="pb-4 px-3 space-y-3">
        {shouldShowPremiumBanner && !isCollapsed && (
          <div className="px-2">
            <PremiumBanner shouldShow={shouldShowPremiumBanner} />
          </div>
        )}
        
        <SidebarMenu className="space-y-1">
          {/* Configurações fixo no final */}
          {settingsItem && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={`h-11 ${getNavClasses({ isActive: isActive(settingsItem.url) })}`}>
                <NavLink to={settingsItem.url} end>
                  <settingsItem.icon className="h-5 w-5" />
                  {!isCollapsed && <span className="text-sm">{settingsItem.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut} 
              className="h-11 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span className="text-sm">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}