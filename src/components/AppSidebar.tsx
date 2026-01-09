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
  Stethoscope,
  Package,
  Repeat,
  Target
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
import { useTerminology } from "@/hooks/useTerminology"
import { Badge } from "@/components/ui/badge"

// Menu items - TODOS os títulos são strings literais fixas para evitar textos incorretos
// Apenas clientTermPlural pode ser dinâmico, mas é validado para ser apenas "Pacientes" ou "Clientes"
const getMenuItems = (clientTermPlural: 'Pacientes' | 'Clientes') => [
    { title: "Dashboard" as const, url: "/dashboard", icon: LayoutDashboard },
    { title: "Agenda" as const, url: "/agenda", icon: Calendar },
    { title: clientTermPlural, url: "/clientes", icon: Users },
    { title: "Sessões" as const, url: "/sessoes", icon: NotebookPen },
    { title: "Sessões Recorrentes" as const, url: "/sessoes-recorrentes", icon: Repeat },
    { title: "Pacotes" as const, url: "/pacotes", icon: Package },
    { title: "Pagamentos" as const, url: "/pagamentos", icon: CreditCard },
    { title: "Relatórios" as const, url: "/relatorios", icon: FileBarChart },
    { title: "Prontuários" as const, url: "/prontuarios", icon: FileText },
    { title: "Metas" as const, url: "/metas", icon: Target },
    { title: "Eventos" as const, url: "/eventos", icon: CalendarCheck },
    { title: "Estudos" as const, url: "/estudos", icon: BookOpen },
    { title: "Redes Sociais" as const, url: "/redes-sociais", icon: Share2 },
    { title: "Programa de Indicação" as const, url: "/programa-indicacao", icon: Star },
    { title: "Página Pública" as const, url: "/pagina-publica", icon: Globe },
    { title: "Integrações" as const, url: "/integracoes", icon: Plug },
    { title: "Suporte" as const, url: "/suporte", icon: HelpCircle },
]

export function AppSidebar() {
  const { state, setOpen, open } = useSidebar()
  const location = useLocation()
  const { currentPlan, isLoading } = useSubscription()
  const { clientTermPlural } = useTerminology()
  const currentPath = location.pathname
  // PROTEÇÃO: Garantir que clientTermPlural é um valor válido
  const safeClientTermPlural: 'Pacientes' | 'Clientes' = 
    clientTermPlural === 'Pacientes' ? 'Pacientes' : 'Clientes'
  const menuItems = getMenuItems(safeClientTermPlural)

  const showBanner = !isLoading && currentPlan !== 'premium'
  const isCollapsed = state === "collapsed"

  const isActive = (path: string) => currentPath === path
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
      : "hover:bg-sidebar-accent/70 transition-all duration-200"

  const handleNavClick = () => {
    // Fecha o sidebar em mobile após navegação
    if (window.innerWidth < 768) {
      setOpen(false)
    }
  }

  const settingsItem = { title: "Configurações", url: "/configuracoes", icon: Settings }

  return (
    <Sidebar
      className="border-none m-3 rounded-2xl shadow-medium overflow-hidden flex flex-col max-h-[calc(100vh-24px)]"
      collapsible="icon"
      style={{
        // @ts-ignore
        '--sidebar-width': '16rem',
        '--sidebar-width-icon': '3.5rem'
      } as React.CSSProperties}
    >
      <SidebarHeader className="px-3 pt-3 pb-3">
        <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-gradient-primary flex items-center justify-center shrink-0 shadow-primary rounded-xl">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</h1>
              <p className="text-[9px] text-muted-foreground truncate">Gestão Profissional</p>
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
                <SidebarMenuButton asChild className={`h-8 rounded-full ${getNavClasses({ isActive: isActive(item.url) })}`}>
                  <NavLink to={item.url} end className="flex items-center justify-between w-full" onClick={handleNavClick}>
                    <div className={`flex items-center ${isCollapsed ? 'w-full justify-center' : 'flex-1 overflow-hidden'}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="text-xs ml-2 truncate">{item.title}</span>}
                    </div>
                    {!isCollapsed && isComingSoon && (
                      <Badge variant="warning" className="text-[8px] px-1.5 py-0 whitespace-nowrap">
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
            <SidebarMenuButton asChild className={`h-8 rounded-full ${getNavClasses({ isActive: isActive(settingsItem.url) })}`}>
              <NavLink to={settingsItem.url} className="flex items-center w-full" onClick={handleNavClick}>
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