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
  Stethoscope
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { PremiumBanner } from "@/components/PremiumBanner"
import { useSubscription } from "@/hooks/useSubscription"
import { Badge } from "@/components/ui/badge"

const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Agenda", url: "/agenda", icon: Calendar },
    { title: "Clientes", url: "/clientes", icon: Users },
    { title: "Pagamentos", url: "/pagamentos", icon: CreditCard },
    { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
    { title: "Eventos", url: "/eventos", icon: CalendarCheck },
    { title: "Prontuários", url: "/prontuarios", icon: FileText },
    { title: "Sessões", url: "/sessoes", icon: NotebookPen },
    { title: "Estudos", url: "/estudos", icon: BookOpen },
    { title: "Redes Sociais", url: "/redes-sociais", icon: Share2 },
    { title: "Programa de Indicação", url: "/programa-indicacao", icon: Star },
    { title: "Página Pública", url: "/pagina-publica", icon: Globe },
    { title: "Integrações", url: "/integracoes", icon: Plug },
    { title: "Suporte", url: "/suporte", icon: HelpCircle },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const { currentPlan } = useSubscription()
  const currentPath = location.pathname

  const showBanner = currentPlan !== 'pro' && currentPlan !== 'premium'
  const isCollapsed = state === "collapsed"

  const isActive = (path: string) => currentPath === path
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
      : "hover:bg-sidebar-accent/70 transition-all duration-200"

  const settingsItem = { title: "Configurações", url: "/configuracoes", icon: Settings }

  return (
    <Sidebar
      className="border-none m-3 rounded-2xl shadow-medium overflow-hidden flex flex-col max-h-[calc(100vh-24px)]"
      collapsible="icon"
      style={{
        // @ts-ignore
        '--sidebar-width': '16rem',
        '--sidebar-width-icon': '5rem'
      } as React.CSSProperties}
    >
      <SidebarHeader className="px-3 pt-4 pb-4">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-gradient-primary flex items-center justify-center shrink-0 shadow-primary rounded-xl">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</h1>
              <p className="text-[10px] text-muted-foreground truncate">Gestão Profissional</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu className="space-y-0.5 px-3">
          {menuItems.map((item) => {
            const isComingSoon = ['Eventos', 'Estudos', 'Redes Sociais'].includes(item.title)
            return (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild className={`h-9 rounded-xl ${getNavClasses({ isActive: isActive(item.url) })}`}>
                  <NavLink to={item.url} end className="flex items-center justify-between w-full">
                    <div className="flex items-center flex-1 overflow-hidden">
                      <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : ''}`}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span className="text-sm ml-3 truncate">{item.title}</span>}
                      </div>
                    </div>
                    {!isCollapsed && isComingSoon && (
                      <Badge variant="success" className="text-[9px] px-1.5 py-0 whitespace-nowrap">
                        Em breve
                      </Badge>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="pb-3 px-3 space-y-2">
        <div className={isCollapsed ? "flex justify-center" : ""}>
          <PremiumBanner shouldShow={showBanner} />
        </div>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={`h-9 rounded-xl ${getNavClasses({ isActive: isActive(settingsItem.url) })}`}>
              <NavLink to={settingsItem.url} end className="flex items-center">
                <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : ''}`}>
                  <settingsItem.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span className="text-sm ml-3">{settingsItem.title}</span>}
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}