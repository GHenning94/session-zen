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
  HelpCircle
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import logoIcon from "@/assets/logo-icon.png"

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

  // Estado local para controlar banner premium - sempre montado no DOM
  const [showBanner, setShowBanner] = useState(true)

  useEffect(() => {
    // Apenas atualiza o estado quando temos certeza do plano
    if (currentPlan && (currentPlan === 'pro' || currentPlan === 'premium')) {
      setShowBanner(false)
    } else if (currentPlan === 'basico') {
      setShowBanner(true)
    }
  }, [currentPlan])

  const isActive = (path: string) => currentPath === path
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm rounded-xl" 
      : "hover:bg-sidebar-accent/70 transition-all duration-200 rounded-xl"

  const isCollapsed = state === "collapsed"

  // Separar Configurações dos outros itens
  const mainMenuItems = menuItems.filter(item => item.url !== '/configuracoes')
  const settingsItem = menuItems.find(item => item.url === '/configuracoes')

  return (
    <Sidebar
      className="border-none m-3 rounded-2xl shadow-medium overflow-visible flex flex-col max-h-[calc(100vh-24px)]"
      collapsible="icon"
    >
      {/* Header com Logo */}
      <SidebarHeader className="px-3 pt-4 pb-2">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0 overflow-visible">
              <img src={logoIcon} alt="TherapyPro" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</h1>
              <p className="text-[10px] text-muted-foreground">Gestão Profissional</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center overflow-visible">
              <img src={logoIcon} alt="TherapyPro" className="w-6 h-6 object-contain" />
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
                    <SidebarMenuButton asChild className={`h-10 ${getNavClasses({ isActive: isActive(item.url) })}`}>
                      <NavLink to={item.url} end className="flex items-center justify-center">
                        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'justify-start w-full'}`}>
                          <item.icon className={`h-5 w-5 shrink-0 ${isDevPage ? 'text-muted-foreground' : ''}`} />
                          {!isCollapsed && (
                            <span className={`text-sm ml-3 ${isDevPage ? 'text-muted-foreground' : ''}`}>
                              {item.title}
                            </span>
                          )}
                        </div>
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
        {/* Banner Premium - SEMPRE montado no DOM */}
        <div className={isCollapsed ? "flex justify-center" : ""} style={{ visibility: showBanner ? 'visible' : 'hidden', height: showBanner ? 'auto' : '0' }}>
          <PremiumBanner shouldShow={showBanner} />
        </div>
        
        {/* Configurações fixo */}
        <SidebarMenu>
          {settingsItem && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={`h-10 ${getNavClasses({ isActive: isActive(settingsItem.url) })}`}>
                <NavLink to={settingsItem.url} end className="flex items-center justify-center">
                  <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'justify-start w-full'}`}>
                    <settingsItem.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span className="text-sm ml-3">{settingsItem.title}</span>}
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}