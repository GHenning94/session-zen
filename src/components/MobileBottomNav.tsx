import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard,
  Menu,
  NotebookPen,
  FileText,
  Settings,
  Target,
  Package,
  Repeat,
  FileBarChart,
  HelpCircle,
  Globe,
  Plug,
  Clock,
  Crown,
  Gift,
  BookOpen,
  Share2,
  Lock
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useTerminology } from "@/hooks/useTerminology"
import { useSubscription, SubscriptionPlan } from "@/hooks/useSubscription"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { UpgradeModal } from "@/components/UpgradeModal"

// Plan requirements for each feature (matching sidebar)
const MENU_ITEM_PLAN_REQUIREMENTS: Record<string, SubscriptionPlan> = {
  '/pacotes': 'pro',
  '/sessoes-recorrentes': 'pro',
  '/relatorios': 'pro',
  '/metas': 'pro',
  '/pagina-publica': 'pro',
  '/programa-indicacao': 'pro',
  '/integracoes': 'premium',
}

// Main tabs for bottom navigation (most used features)
const mainTabs = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Sessões", url: "/sessoes", icon: NotebookPen },
  { title: "Pagamentos", url: "/pagamentos", icon: CreditCard },
]

// Additional menu items - TODOS os títulos são strings literais fixas
// Apenas clientTermPlural pode ser dinâmico, mas é validado para ser apenas "Pacientes" ou "Clientes"
const getMoreItems = (clientTermPlural: 'Pacientes' | 'Clientes') => [
  { title: clientTermPlural, url: "/clientes", icon: Users },
  { title: "Pacotes" as const, url: "/pacotes", icon: Package },
  { title: "Sessões Recorrentes" as const, url: "/sessoes-recorrentes", icon: Repeat },
  { title: "Prontuários" as const, url: "/prontuarios", icon: FileText },
  { title: "Relatórios" as const, url: "/relatorios", icon: FileBarChart },
  { title: "Metas" as const, url: "/metas", icon: Target },
  { title: "Página Pública" as const, url: "/pagina-publica", icon: Globe },
  { title: "Integrações" as const, url: "/integracoes", icon: Plug },
  { title: "Programa de Indicação" as const, url: "/programa-indicacao", icon: Gift },
  { title: "Configurações" as const, url: "/configuracoes", icon: Settings },
  { title: "Suporte" as const, url: "/suporte", icon: HelpCircle },
]

// Coming soon items with badges - matching sidebar items
const comingSoonItems = [
  { title: "Eventos" as const, url: "#", icon: Calendar, disabled: true },
  { title: "Estudos" as const, url: "#", icon: BookOpen, disabled: true },
  { title: "Redes Sociais" as const, url: "#", icon: Share2, disabled: true },
]

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  'basico': 0,
  'pro': 1,
  'premium': 2
}

export function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const { clientTermPlural } = useTerminology()
  const { currentPlan } = useSubscription()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('')
  
  const isPremium = currentPlan === 'premium'
  
  // PROTEÇÃO: Garantir que clientTermPlural é um valor válido
  const safeClientTermPlural: 'Pacientes' | 'Clientes' = 
    clientTermPlural === 'Pacientes' ? 'Pacientes' : 'Clientes'
  const moreItems = getMoreItems(safeClientTermPlural)
  
  const isActive = (path: string) => currentPath === path
  const isMoreActive = moreItems.some(item => isActive(item.url))
  
  // Check if a menu item is locked based on current plan
  const isMenuItemLocked = (url: string): boolean => {
    const requiredPlan = MENU_ITEM_PLAN_REQUIREMENTS[url]
    if (!requiredPlan) return false
    return PLAN_HIERARCHY[currentPlan] < PLAN_HIERARCHY[requiredPlan]
  }
  
  // Get required plan for a menu item
  const getRequiredPlan = (url: string): SubscriptionPlan | null => {
    return MENU_ITEM_PLAN_REQUIREMENTS[url] || null
  }
  
  // Handle menu item click
  const handleMenuItemClick = (e: React.MouseEvent, item: typeof moreItems[0]) => {
    const isLocked = isMenuItemLocked(item.url)
    
    if (isLocked) {
      e.preventDefault()
      e.stopPropagation()
      setUpgradeFeatureName(item.title)
      setShowUpgradeModal(true)
    } else {
      setIsMoreOpen(false)
      navigate(item.url)
    }
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {mainTabs.map((tab) => {
            const active = isActive(tab.url)
            return (
              <NavLink
                key={tab.url}
                to={tab.url}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all duration-200",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200",
                  active && "bg-primary/10"
                )}>
                  <tab.icon className={cn(
                    "w-5 h-5 transition-all",
                    active && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] mt-0.5 font-medium truncate max-w-[60px]",
                  active && "text-primary"
                )}>
                  {tab.title}
                </span>
              </NavLink>
            )
          })}
          
          {/* More Menu Trigger */}
          <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all duration-200",
                  isMoreActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200",
                  isMoreActive && "bg-primary/10"
                )}>
                  <Menu className={cn(
                    "w-5 h-5 transition-all",
                    isMoreActive && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] mt-0.5 font-medium",
                  isMoreActive && "text-primary"
                )}>
                  Mais
                </span>
              </button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(85vh-80px)]">
                {/* Premium Banner */}
                {!isPremium && (
                  <NavLink
                    to="/upgrade"
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 p-4 mb-4 rounded-2xl bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30"
                  >
                    <div className="p-2 rounded-xl bg-warning/20">
                      <Crown className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Seja Premium</p>
                      <p className="text-xs text-muted-foreground">Desbloqueie todos os recursos</p>
                    </div>
                  </NavLink>
                )}
                
                <div className="grid grid-cols-3 gap-3 pb-4">
                  {moreItems.map((item) => {
                    const active = isActive(item.url)
                    const isLocked = isMenuItemLocked(item.url)
                    const requiredPlan = getRequiredPlan(item.url)
                    const isPremiumFeature = requiredPlan === 'premium'
                    
                    return (
                      <div
                        key={item.url}
                        onClick={(e) => handleMenuItemClick(e, item)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 relative cursor-pointer",
                          isLocked
                            ? "bg-muted/30 text-muted-foreground"
                            : active 
                              ? "bg-primary text-primary-foreground shadow-lg" 
                              : "bg-muted/50 hover:bg-muted text-foreground"
                        )}
                      >
                        {/* Lock badge */}
                        {isLocked && (
                          <Badge 
                            variant={isPremiumFeature ? 'warning' : 'secondary'}
                            className="absolute -top-1 right-1 text-[8px] px-1.5 py-0.5 h-5 whitespace-nowrap gap-0.5 justify-center"
                          >
                            {!isPremiumFeature && <Lock className="w-2 h-2" />}
                            {isPremiumFeature ? 'Premium' : 'Pro'}
                          </Badge>
                        )}
                        <item.icon className={cn(
                          "w-6 h-6 mb-2",
                          isLocked && "opacity-50"
                        )} />
                        <span className={cn(
                          "text-xs font-medium text-center leading-tight",
                          isLocked && "opacity-50"
                        )}>
                          {item.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
                
                {/* Coming Soon Section */}
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-3 px-1">Em Breve</p>
                  <div className="grid grid-cols-3 gap-3 pb-8">
                    {comingSoonItems.map((item) => (
                      <div
                        key={item.title}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed relative"
                      >
                        <Badge className="absolute -top-1 right-1 text-[8px] px-1.5 py-0.5 h-5 bg-warning text-warning-foreground">
                          Em breve
                        </Badge>
                        <item.icon className="w-6 h-6 mb-2" />
                        <span className="text-xs font-medium text-center leading-tight">
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      
      {/* Bottom padding spacer to prevent content from being hidden behind the nav */}
      <div className="h-20" />
      
      {/* Upgrade Modal */}
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature={upgradeFeatureName}
      />
    </>
  )
}
