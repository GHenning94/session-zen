import { Shield, Users, CreditCard, BarChart3, FileText, Settings, AlertTriangle, Home, Bell, Activity, DollarSign, Calendar, UserCheck, Gift, Heart } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

const mainMenuItems = [
  { title: "Visão Geral", url: "/admin", icon: Home, end: true },
  { title: "Receita & Assinaturas", url: "/admin/revenue", icon: DollarSign },
  { title: "Usuários & Contas", url: "/admin/users", icon: Users },
  { title: "Sessões", url: "/admin/sessions", icon: Calendar },
  { title: "Clientes Finais", url: "/admin/clients", icon: UserCheck },
  { title: "Programa de Indicação", url: "/admin/referrals", icon: Gift },
  { title: "Alertas & Saúde", url: "/admin/health", icon: Heart },
]

const existingMenuItems = [
  { title: "Cupons", url: "/admin/coupons", icon: CreditCard },
  { title: "Criptografia e Segurança", url: "/admin/security", icon: Shield },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Conteúdo", url: "/admin/content", icon: FileText },
  { title: "Logs e Auditoria", url: "/admin/logs", icon: AlertTriangle },
  { title: "Roles e Permissões", url: "/admin/roles", icon: Shield },
  { title: "Notificações", url: "/admin/notifications", icon: Bell },
]

export function AdminSidebar() {
  const { state, setOpen } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"

  const isActive = (path: string, end?: boolean) => {
    if (end) return currentPath === path
    return currentPath.startsWith(path)
  }
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
      : "hover:bg-sidebar-accent/70 transition-all duration-200"

  const handleNavClick = () => {
    if (window.innerWidth < 768) setOpen(false)
  }

  const settingsItem = { title: "Configurações", url: "/admin/settings", icon: Settings }

  return (
    <Sidebar
      className="border-none m-3 rounded-2xl shadow-medium overflow-hidden flex flex-col max-h-[calc(100vh-24px)]"
      collapsible="icon"
      style={{ '--sidebar-width': '16rem', '--sidebar-width-icon': '3.5rem' } as React.CSSProperties}
    >
      <SidebarHeader className="px-3 pt-3 pb-3">
        <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-gradient-primary flex items-center justify-center shrink-0 shadow-primary rounded-xl">
            <Shield className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro Admin</h1>
              <p className="text-[9px] text-muted-foreground truncate">Painel Administrativo</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel className="text-xs text-muted-foreground px-3">Principal</SidebarGroupLabel>}
          <SidebarMenu className="space-y-0.5 px-3">
            {mainMenuItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild className={`h-8 rounded-xl ${getNavClasses({ isActive: isActive(item.url, item.end) })}`}>
                  <NavLink to={item.url} end={item.end} className="flex items-center w-full" onClick={handleNavClick}>
                    <div className={`flex items-center ${isCollapsed ? 'w-full justify-center' : 'flex-1 overflow-hidden'}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="text-xs ml-2 truncate">{item.title}</span>}
                    </div>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mt-4">Sistema</SidebarGroupLabel>}
          <SidebarMenu className="space-y-0.5 px-3">
            {existingMenuItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild className={`h-8 rounded-xl ${getNavClasses({ isActive: isActive(item.url) })}`}>
                  <NavLink to={item.url} className="flex items-center w-full" onClick={handleNavClick}>
                    <div className={`flex items-center ${isCollapsed ? 'w-full justify-center' : 'flex-1 overflow-hidden'}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="text-xs ml-2 truncate">{item.title}</span>}
                    </div>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-3 px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={`h-8 rounded-xl ${getNavClasses({ isActive: isActive(settingsItem.url) })}`}>
              <NavLink to={settingsItem.url} end className="flex items-center w-full" onClick={handleNavClick}>
                <div className={`flex items-center ${isCollapsed ? 'w-full justify-center' : ''}`}>
                  <settingsItem.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="text-xs ml-2">{settingsItem.title}</span>}
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
