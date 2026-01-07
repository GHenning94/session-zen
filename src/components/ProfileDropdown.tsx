import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  User, 
  LogOut, 
  Shield, 
  Palette, 
  CreditCard, 
  Building, 
  Bell,
  Crown,
  Gift,
  HelpCircle,
  Ticket,
  Copy,
  Check
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Profile {
  nome: string
  profissao: string
  avatar_url?: string
  subscription_plan?: string
  is_referral_partner?: boolean
}

interface ReferralCoupon {
  code: string
  discount: string
  description: string
  isUsed: boolean
  isNew: boolean
}

export const ProfileDropdown = () => {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [showCouponsTab, setShowCouponsTab] = useState(false)
  const [profile, setProfile] = useState<Profile>({ nome: '', profissao: '', avatar_url: '', subscription_plan: 'basico', is_referral_partner: false })
  const { avatarUrl } = useAvatarUrl(profile.avatar_url)
  
  // Coupon states
  const [referralCoupon, setReferralCoupon] = useState<ReferralCoupon | null>(null)
  const [hasNewCoupon, setHasNewCoupon] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProfile()
      checkReferralCoupon()
      
      // Subscribe to profile changes
      const channel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated:', payload)
            fetchProfile()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, profissao, avatar_url, subscription_plan, is_referral_partner')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        // Garante capitalização correta e acentuação das profissões
        const professionMap: Record<string, string> = {
          'psicologo': 'Psicólogo',
          'psicanalista': 'Psicanalista',
          'terapeuta': 'Terapeuta',
          'neurologista': 'Neurologista',
          'psicoterapeuta': 'Psicoterapeuta',
          'coach': 'Coach'
        };
        const normalized = (data.profissao || '').toLowerCase();
        const profissaoFormatada = professionMap[normalized] || data.profissao;
        setProfile({ ...data, profissao: profissaoFormatada })
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  const checkReferralCoupon = async () => {
    if (!user) return

    try {
      // Verificar se o usuário foi indicado
      const { data: referralData, error } = await supabase
        .from('referrals')
        .select('id, status, first_payment_date')
        .eq('referred_user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[ProfileDropdown] Error checking referral:', error)
        return
      }

      // Se o usuário foi indicado, mostrar o cupom
      if (referralData) {
        const isUsed = !!referralData.first_payment_date
        const seenCouponsKey = `seen_coupons_${user.id}`
        const seenCoupons = JSON.parse(localStorage.getItem(seenCouponsKey) || '[]')
        const isNew = !seenCoupons.includes('INDICACAO20') && !isUsed

        setReferralCoupon({
          code: 'INDICACAO20',
          discount: '20%',
          description: '20% de desconto no primeiro mês do plano Profissional',
          isUsed,
          isNew
        })

        if (isNew) {
          setHasNewCoupon(true)
        }
      }
    } catch (err) {
      console.error('[ProfileDropdown] Exception:', err)
    }
  }

  const handleCouponHover = (couponCode: string) => {
    if (!user) return
    
    // Marcar o cupom como visto
    const seenCouponsKey = `seen_coupons_${user.id}`
    const seenCoupons = JSON.parse(localStorage.getItem(seenCouponsKey) || '[]')
    
    if (!seenCoupons.includes(couponCode)) {
      seenCoupons.push(couponCode)
      localStorage.setItem(seenCouponsKey, JSON.stringify(seenCoupons))
      
      // Atualizar estados
      if (referralCoupon && referralCoupon.code === couponCode) {
        setReferralCoupon({ ...referralCoupon, isNew: false })
      }
      setHasNewCoupon(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success("Código copiado!")
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      toast.error("Erro ao copiar código")
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getInitials = (name: string) => {
    // Proteção contra valores inválidos
    if (!name || name.includes('/') || name.includes('http') || name.includes('.') || name.length < 2) {
      return ''
    }
    return name
      .split(' ')
      .filter(n => n.length > 0 && /^[a-zA-ZÀ-ÿ]/.test(n))
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const isPremium = profile.subscription_plan === 'premium'

  const menuItems = {
    premium: !isPremium ? [
      { 
        icon: Crown, 
        label: "Desbloquear Premium", 
        action: () => navigate('/upgrade'),
        isPremiumItem: true,
        badge: "-17%"
      }
    ] : [],
    profile: [
      { icon: User, label: "Meu Perfil", action: () => navigate('/configuracoes?tab=profile') },
      { icon: Shield, label: "Segurança", action: () => navigate('/configuracoes?tab=security') },
      { icon: Palette, label: "Preferências", action: () => navigate('/configuracoes?tab=preferences') },
      { icon: Bell, label: "Notificações", action: () => navigate('/configuracoes?tab=notifications') },
    ],
    payments: [
      { icon: CreditCard, label: "Assinatura", action: () => navigate('/configuracoes?tab=platform-payments') },
      { icon: Building, label: "Dados Bancários", action: () => navigate('/configuracoes?tab=bank-details') },
    ],
    referral: [
      { icon: Gift, label: "Programa de Indicação", action: () => navigate('/programa-indicacao') }
    ],
    support: [
      { icon: HelpCircle, label: "Suporte", action: () => navigate('/suporte') }
    ]
  }

  const handleMenuAction = (action: () => void) => {
    setOpen(false)
    setShowCouponsTab(false)
    action()
  }

  const handleOpenCouponsTab = () => {
    setShowCouponsTab(true)
  }

  const handleBackFromCoupons = () => {
    setShowCouponsTab(false)
  }

  // Componente de notificação (bolinha vermelha pulsante)
  const NotificationDot = ({ className }: { className?: string }) => (
    <span className={cn(
      "absolute h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background animate-pulse",
      className
    )} />
  )

  // Conteúdo da aba de cupons
  const CouponsTabContent = () => (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-4">
        <button 
          onClick={handleBackFromCoupons}
          className="p-1 rounded-lg hover:bg-accent"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h3 className="font-semibold text-sm">Meus Cupons</h3>
      </div>

      {referralCoupon ? (
        <div 
          className={cn(
            "relative rounded-xl border p-4 transition-all",
            referralCoupon.isUsed 
              ? "bg-muted/50 border-border" 
              : "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800"
          )}
          onMouseEnter={() => handleCouponHover(referralCoupon.code)}
        >
          {/* Badge de status */}
          <div className="absolute top-2 right-2">
            {referralCoupon.isNew && (
              <NotificationDot className="top-0 right-0" />
            )}
            <Badge 
              variant={referralCoupon.isUsed ? "secondary" : "default"}
              className={cn(
                "text-[10px]",
                !referralCoupon.isUsed && "bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              {referralCoupon.isUsed ? "Utilizado" : "Disponível"}
            </Badge>
          </div>

          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              referralCoupon.isUsed 
                ? "bg-muted" 
                : "bg-emerald-100 dark:bg-emerald-900/50"
            )}>
              <Ticket className={cn(
                "h-5 w-5",
                referralCoupon.isUsed 
                  ? "text-muted-foreground" 
                  : "text-emerald-600 dark:text-emerald-400"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold",
                  referralCoupon.isUsed 
                    ? "text-muted-foreground" 
                    : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {referralCoupon.discount} OFF
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {referralCoupon.description}
              </p>
              
              {!referralCoupon.isUsed && (
                <button
                  onClick={() => handleCopyCode(referralCoupon.code)}
                  className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95"
                >
                  <span className="font-mono">{referralCoupon.code}</span>
                  {copiedCode === referralCoupon.code ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Ticket className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Você ainda não possui cupons disponíveis
          </p>
        </div>
      )}
    </div>
  )

  // Conteúdo do menu principal (reutilizado entre mobile e desktop)
  const MenuContent = ({ onAction }: { onAction: (action: () => void) => void }) => (
    <>
      {/* User Info Header */}
      <div className="flex items-center p-3">
        <div className="flex-1 flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={avatarUrl || undefined} alt={profile.nome} />
            <AvatarFallback className="bg-primary/10">
              {profile.nome ? getInitials(profile.nome) : <User className="h-4 w-4 text-primary" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{profile.nome || 'Usuário'}</h3>
            <p className="text-muted-foreground text-xs truncate">{user?.email}</p>
            {profile.profissao && (
              <p className="text-muted-foreground text-xs truncate">{profile.profissao}</p>
            )}
          </div>
        </div>
      </div>

      {/* Premium Upgrade Item */}
      {menuItems.premium.length > 0 && (
        <>
          {menuItems.premium.map((item, index) => (
            <button 
              key={index}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-full",
                item.isPremiumItem && "animated-premium-no-shadow"
              )}
              onClick={() => onAction(item.action)}
            >
              <span className="flex items-center gap-2 font-medium text-white text-sm">
                <item.icon className="h-5 w-5 text-white" />
                {item.label}
              </span>
              {item.badge && (
                <Badge className="animated-premium-no-shadow text-white text-[10px] border-white/30 border">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </>
      )}

      {/* Coupons Tab */}
      <button 
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent text-left"
        onClick={handleOpenCouponsTab}
      >
        <span className="flex items-center gap-2 font-medium text-sm relative">
          <Ticket className="h-5 w-5 text-muted-foreground" />
          Cupons
          {hasNewCoupon && (
            <NotificationDot className="-top-0.5 -right-3" />
          )}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>

      {/* Profile Menu Items */}
      {menuItems.profile.map((item, index) => (
        <button 
          key={`profile-${index}`}
          className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-accent text-left"
          onClick={() => onAction(item.action)}
        >
          <item.icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">{item.label}</span>
        </button>
      ))}

      {/* Payment Menu Items */}
      {menuItems.payments.map((item, index) => (
        <button 
          key={`payment-${index}`}
          className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-accent text-left"
          onClick={() => onAction(item.action)}
        >
          <item.icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">{item.label}</span>
        </button>
      ))}

      {/* Referral Program */}
      {menuItems.referral.map((item, index) => (
        <button 
          key={`referral-${index}`}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent text-left"
          onClick={() => onAction(item.action)}
        >
          <span className="flex items-center gap-2">
            <item.icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">{item.label}</span>
          </span>
          {profile.is_referral_partner && (
            <Badge className="bg-green-500 text-white text-[10px] border-0">
              Ativo
            </Badge>
          )}
        </button>
      ))}

      {/* Support */}
      {menuItems.support.map((item, index) => (
        <button 
          key={`support-${index}`}
          className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-accent text-left"
          onClick={() => onAction(item.action)}
        >
          <item.icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">{item.label}</span>
        </button>
      ))}

      {/* Logout */}
      <button 
        className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-accent text-left text-destructive"
        onClick={() => onAction(handleSignOut)}
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium text-sm">Sair</span>
      </button>
    </>
  )

  // Mobile: usa Sheet
  if (isMobile) {
    return (
      <>
        <button 
          className="relative flex items-center gap-2 rounded-full focus:outline-none transition-all hover:opacity-80"
          onClick={() => setOpen(true)}
        >
          <Avatar className="h-8 w-8 cursor-pointer border border-border">
            <AvatarImage src={avatarUrl || undefined} alt={profile.nome} />
            <AvatarFallback className="bg-primary/10 text-xs">
              {profile.nome ? getInitials(profile.nome) : <User className="h-3 w-3 text-primary" />}
            </AvatarFallback>
          </Avatar>
          {hasNewCoupon && (
            <NotificationDot className="-top-0.5 -right-0.5" />
          )}
        </button>
        
        <Sheet open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setShowCouponsTab(false) }}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>{showCouponsTab ? 'Meus Cupons' : 'Minha Conta'}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(85vh-60px)]">
              <div className="p-2">
                {showCouponsTab ? (
                  <CouponsTabContent />
                ) : (
                  <MenuContent onAction={handleMenuAction} />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: usa DropdownMenu
  return (
    <DropdownMenu open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setShowCouponsTab(false) }}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:opacity-80">
          <Avatar className="h-10 w-10 cursor-pointer border border-border">
            <AvatarImage src={avatarUrl || undefined} alt={profile.nome} />
            <AvatarFallback className="bg-primary/10">
              {profile.nome ? getInitials(profile.nome) : <User className="h-4 w-4 text-primary" />}
            </AvatarFallback>
          </Avatar>
          {hasNewCoupon && (
            <NotificationDot className="-top-0.5 -right-0.5" />
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="no-scrollbar w-[310px] rounded-2xl bg-muted/50 dark:bg-black/90 p-0"
      >
        {/* Main Section */}
        <section className="bg-background backdrop-blur-lg rounded-2xl p-1 shadow border border-border">
          {showCouponsTab ? (
            <CouponsTabContent />
          ) : (
            <>
              {/* User Info Header */}
              <div className="flex items-center p-3">
                <div className="flex-1 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={avatarUrl || undefined} alt={profile.nome} />
                    <AvatarFallback className="bg-primary/10">
                      {profile.nome ? getInitials(profile.nome) : <User className="h-4 w-4 text-primary" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{profile.nome || 'Usuário'}</h3>
                    <p className="text-muted-foreground text-xs truncate">{user?.email}</p>
                    {profile.profissao && (
                      <p className="text-muted-foreground text-xs truncate">{profile.profissao}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Premium Upgrade Item - Above Profile */}
              {menuItems.premium.length > 0 && (
                <>
                  <DropdownMenuGroup>
                    {menuItems.premium.map((item, index) => (
                      <DropdownMenuItem 
                        key={index}
                        className={cn(
                          "p-2 rounded-full cursor-pointer justify-between",
                          item.isPremiumItem && "animated-premium-no-shadow hover:opacity-90"
                        )}
                        onClick={item.action}
                      >
                        <span className="flex items-center gap-2 font-medium text-white">
                          <item.icon className="h-5 w-5 text-white" />
                          {item.label}
                        </span>
                        {item.badge && (
                          <Badge className="animated-premium-no-shadow text-white text-[10px] border-white/30 border">
                            {item.badge}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              )}

              {/* Coupons Tab */}
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  className="p-2 rounded-lg cursor-pointer justify-between"
                  onSelect={(e) => {
                    e.preventDefault()
                    handleOpenCouponsTab()
                  }}
                >
                  <span className="flex items-center gap-2 font-medium relative">
                    <Ticket className="h-5 w-5 text-muted-foreground" />
                    Cupons
                    {hasNewCoupon && (
                      <NotificationDot className="-top-0.5 -right-3" />
                    )}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {/* Profile Menu Items */}
              <DropdownMenuGroup>
                {menuItems.profile.map((item, index) => (
                  <DropdownMenuItem 
                    key={index}
                    className="p-2 rounded-lg cursor-pointer"
                    onClick={item.action}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      {item.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>

              {/* Payment Menu Items */}
              <DropdownMenuGroup>
                {menuItems.payments.map((item, index) => (
                  <DropdownMenuItem 
                    key={index}
                    className="p-2 rounded-lg cursor-pointer"
                    onClick={item.action}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      {item.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>

              {/* Referral Program */}
              <DropdownMenuGroup>
                {menuItems.referral.map((item, index) => (
                  <DropdownMenuItem 
                    key={index}
                    className="p-2 rounded-lg cursor-pointer justify-between"
                    onClick={item.action}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      {item.label}
                    </span>
                    {profile.is_referral_partner && (
                      <Badge className="bg-green-500 text-white text-[10px] border-0">
                        Ativo
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>

              {/* Support */}
              <DropdownMenuGroup>
                {menuItems.support.map((item, index) => (
                  <DropdownMenuItem 
                    key={index}
                    className="p-2 rounded-lg cursor-pointer"
                    onClick={item.action}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      {item.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>

              {/* Logout */}
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="p-2 rounded-lg cursor-pointer text-destructive focus:text-destructive"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <LogOut className="h-5 w-5" />
                    Sair
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </section>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
