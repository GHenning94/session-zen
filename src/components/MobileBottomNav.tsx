import { NavLink, useLocation } from "react-router-dom"
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
  X
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useTerminology } from "@/hooks/useTerminology"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  { title: "Configurações" as const, url: "/configuracoes", icon: Settings },
  { title: "Suporte" as const, url: "/suporte", icon: HelpCircle },
]

export function MobileBottomNav() {
  const location = useLocation()
  const currentPath = location.pathname
  const { clientTermPlural } = useTerminology()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  
  // PROTEÇÃO: Garantir que clientTermPlural é um valor válido
  const safeClientTermPlural: 'Pacientes' | 'Clientes' = 
    clientTermPlural === 'Pacientes' ? 'Pacientes' : 'Clientes'
  const moreItems = getMoreItems(safeClientTermPlural)
  
  const isActive = (path: string) => currentPath === path
  const isMoreActive = moreItems.some(item => isActive(item.url))

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
            
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(70vh-80px)]">
                <div className="grid grid-cols-3 gap-3 pb-8">
                  {moreItems.map((item) => {
                    const active = isActive(item.url)
                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        onClick={() => setIsMoreOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200",
                          active 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "bg-muted/50 hover:bg-muted text-foreground"
                        )}
                      >
                        <item.icon className="w-6 h-6 mb-2" />
                        <span className="text-xs font-medium text-center leading-tight">
                          {item.title}
                        </span>
                      </NavLink>
                    )
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      
      {/* Bottom padding spacer to prevent content from being hidden behind the nav */}
      <div className="h-20" />
    </>
  )
}
