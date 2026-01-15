import { useState } from "react"
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
  Target,
  Lock,
  Crown
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
import { useSubscription, Feature } from "@/hooks/useSubscription"
import { useTerminology } from "@/hooks/useTerminology"
import { Badge } from "@/components/ui/badge"
import { UpgradeModal } from "@/components/UpgradeModal"
import { NewFeatureBadge, dismissFeatureBadge } from "@/components/NewFeatureBadge"
import { cn } from "@/lib/utils"

// Menu items - TODOS os títulos são strings literais fixas para evitar textos incorretos
// Apenas clientTermPlural pode ser dinâmico, mas é validado para ser apenas "Pacientes" ou "Clientes"
const getMenuItems = (clientTermPlural: 'Pacientes' | 'Clientes') => [
    { title: "Dashboard" as const, url: "/dashboard", icon: LayoutDashboard },
    { title: "Agenda" as const, url: "/agenda", icon: Calendar },
    { title: clientTermPlural, url: "/clientes", icon: Users },
    { title: "Sessões" as const, url: "/sessoes", icon: NotebookPen },
    { title: "Sessões Recorrentes" as const, url: "/sessoes-recorrentes", icon: Repeat, requiredFeature: 'goals' as Feature },
    { title: "Pacotes" as const, url: "/pacotes", icon: Package, requiredFeature: 'goals' as Feature },
    { title: "Pagamentos" as const, url: "/pagamentos", icon: CreditCard },
    { title: "Relatórios" as const, url: "/relatorios", icon: FileBarChart, requiredFeature: 'reports' as Feature },
    { title: "Prontuários" as const, url: "/prontuarios", icon: FileText },
    { title: "Metas" as const, url: "/metas", icon: Target, requiredFeature: 'goals' as Feature },
    { title: "Eventos" as const, url: "/eventos", icon: CalendarCheck },
    { title: "Estudos" as const, url: "/estudos", icon: BookOpen },
    { title: "Redes Sociais" as const, url: "/redes-sociais", icon: Share2 },
    { title: "Programa de Indicação" as const, url: "/programa-indicacao", icon: Star, requiredFeature: 'referral_program' as Feature },
    { title: "Página Pública" as const, url: "/pagina-publica", icon: Globe, requiredFeature: 'public_page' as Feature },
    { title: "Integrações" as const, url: "/integracoes", icon: Plug, requiredFeature: 'google_calendar' as Feature },
    { title: "Suporte" as const, url: "/suporte", icon: HelpCircle },
]

// Feature info for upgrade modal
const FEATURE_NAMES: Record<Feature, string> = {
  whatsapp_notifications: 'Notificações por WhatsApp',
  google_calendar: 'Integração com Google Agenda',
  reports: 'Relatórios',
  advanced_reports: 'Relatórios Avançados',
  referral_program: 'Programa de Indicação',
  referral_history: 'Histórico de Transações',
  goals: 'Metas',
  public_page: 'Página Pública',
  public_page_design: 'Design da Página Pública',
  public_page_advanced: 'Configurações Avançadas',
  color_customization: 'Personalização de Cores',
  dashboard_advanced_cards: 'Cards Avançados',
  unlimited_clients: 'Pacientes Ilimitados',
  unlimited_sessions: 'Sessões Ilimitadas',
}

export function AppSidebar() {
  const { state, setOpen, open } = useSidebar()
  const location = useLocation()
  const { currentPlan, isLoading, hasAccessToFeature, getRequiredPlanForFeature } = useSubscription()
  const { clientTermPlural } = useTerminology()
  const currentPath = location.pathname
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string }>({ open: false, feature: '' })
  
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

  const handleNavClick = (e: React.MouseEvent, item: typeof menuItems[0]) => {
    // Check if feature is locked
    if (item.requiredFeature && !hasAccessToFeature(item.requiredFeature)) {
      e.preventDefault()
      e.stopPropagation()
      setUpgradeModal({ 
        open: true, 
        feature: FEATURE_NAMES[item.requiredFeature] || item.title 
      })
      return
    }
    
    // Fecha o sidebar em mobile após navegação
    if (window.innerWidth < 768) {
      setOpen(false)
    }
  }

  const settingsItem = { title: "Configurações", url: "/configuracoes", icon: Settings }

  return (
    <>
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
              const isLocked = item.requiredFeature && !hasAccessToFeature(item.requiredFeature)
              const requiredPlan = item.requiredFeature ? getRequiredPlanForFeature(item.requiredFeature) : null
              const isPremiumFeature = requiredPlan === 'premium'
              
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={cn(
                      "h-8 rounded-full",
                      isLocked 
                        ? "opacity-60 hover:opacity-80" 
                        : getNavClasses({ isActive: isActive(item.url) })
                    )}
                    onMouseEnter={() => {
                      // Dismiss the new feature badge when hovering over the menu item
                      if (item.requiredFeature && !isLocked) {
                        dismissFeatureBadge(item.requiredFeature)
                      }
                    }}
                  >
                    <NavLink 
                      to={isLocked ? "#" : item.url} 
                      end 
                      className="flex items-center justify-between w-full" 
                      onClick={(e) => handleNavClick(e, item)}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'w-full justify-center' : 'flex-1 overflow-hidden'}`}>
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0",
                          isLocked && "text-muted-foreground"
                        )} />
                        {!isCollapsed && <span className="text-xs ml-2 truncate">{item.title}</span>}
                      </div>
                      {!isCollapsed && (
                        <div className="flex items-center gap-1">
                          {/* New feature badge - shows when unlocked */}
                          {item.requiredFeature && !isLocked && (
                            <NewFeatureBadge featureKey={item.requiredFeature} />
                          )}
                          
                          {/* Locked badge */}
                          {isLocked && (
                            <Badge 
                              variant={isPremiumFeature ? 'warning' : 'secondary'}
                              className="text-[9px] px-1 py-0 h-4 whitespace-nowrap gap-0.5 justify-center"
                            >
                              {!isPremiumFeature && <Lock className="w-2 h-2" />}
                              {isPremiumFeature ? 'Premium' : 'Pro'}
                            </Badge>
                          )}
                          
                          {/* Coming soon badge */}
                          {!isLocked && isComingSoon && (
                            <Badge variant="warning" className="text-[9px] px-1 py-0 h-4 whitespace-nowrap justify-center">
                              Em breve
                            </Badge>
                          )}
                        </div>
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
                <NavLink to={settingsItem.url} className="flex items-center w-full" onClick={() => { if (window.innerWidth < 768) setOpen(false) }}>
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
      
      <UpgradeModal 
        open={upgradeModal.open} 
        onOpenChange={(open) => setUpgradeModal({ ...upgradeModal, open })}
        feature={upgradeModal.feature}
      />
    </>
  )
}