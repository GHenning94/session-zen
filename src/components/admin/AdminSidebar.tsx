import { Shield, Users, CreditCard, BarChart3, FileText, Settings, AlertTriangle, Home, Bell, Activity } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: Home, end: true },
  { title: "Criptografia e Segurança", url: "/admin/security", icon: Shield },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Roles e Permissões", url: "/admin/roles", icon: Shield },
  { title: "Atividades", url: "/admin/activity", icon: Activity },
  { title: "Pagamentos", url: "/admin/payments", icon: CreditCard },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Conteúdo", url: "/admin/content", icon: FileText },
  { title: "Logs e Auditoria", url: "/admin/logs", icon: AlertTriangle },
  { title: "Notificações", url: "/admin/notifications", icon: Bell },
]

export function AdminSidebar() {
  const { state, setOpen } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return currentPath === path
    }
    return currentPath.startsWith(path)
  }
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
      : "hover:bg-sidebar-accent/70 transition-all duration-200"

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setOpen(false)
    }
  }

  return (
    <Sidebar
      className={`${isCollapsed ? 'w-14' : 'w-64'} border-r transition-all duration-200`}
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Painel Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-3">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild className={`h-8 rounded-xl ${getNavClasses({ isActive: isActive(item.url, item.end) })}`}>
                    <NavLink 
                      to={item.url} 
                      end={item.end}
                      className="flex items-center w-full"
                      onClick={handleNavClick}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'w-full justify-center' : ''}`}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span className="text-xs ml-2">{item.title}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}