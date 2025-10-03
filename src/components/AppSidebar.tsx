import { 
  Calendar, 
  Users, 
  CreditCard, 
  Settings, 
  LayoutDashboard,
  FileBarChart,
  BookOpen,
  CalendarCheck,
  FileText,
  NotebookPen,
  Star,
  Share2,
  Globe,
  Plug,
  HelpCircle,
  Sparkles
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

  return (
    <Sidebar
      className="border-none m-3 rounded-2xl shadow-medium overflow-hidden flex flex-col max-h-[calc(100vh-24px)]"
      collapsible="icon"
    >
      {/* Header com Logo */}
      <SidebarHeader className="px-3 pt-4 pb-2">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</h1>
              <p className="text-[10px] text-muted-foreground">Gestão Profissional</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-3">
              {mainMenuItems.map((item) => {
                const isDevPage = ['Eventos', 'Estudos', 'Redes Sociais'].includes(item.title)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className={`h-9 ${getNavClasses({ isActive: isActive(item.url) })}`}>
                      <NavLink to={item.url} end>
                        <item.icon className={`h-4 w-4 ${isDevPage ? 'text-muted-foreground' : ''}`} />
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

      <SidebarFooter className="pb-3 px-3 space-y-2">
        {/* Configurações fixo antes do banner */}
        <SidebarMenu>
          {settingsItem && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={`h-9 ${getNavClasses({ isActive: isActive(settingsItem.url) })}`}>
                <NavLink to={settingsItem.url} end>
                  <settingsItem.icon className="h-4 w-4" />
                  {!isCollapsed && <span className="text-sm">{settingsItem.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        
        {/* Banner Premium */}
        {shouldShowPremiumBanner && (
          <div className={isCollapsed ? "" : "px-2"}>
            <PremiumBanner shouldShow={shouldShowPremiumBanner} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}