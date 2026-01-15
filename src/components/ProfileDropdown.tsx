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
  HelpCircle
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface Profile {
  nome: string
  profissao: string
  avatar_url?: string
  subscription_plan?: string
  is_referral_partner?: boolean
}

export const ProfileDropdown = () => {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile>({ nome: '', profissao: '', avatar_url: '', subscription_plan: 'basico', is_referral_partner: false })
  const { avatarUrl } = useAvatarUrl(profile.avatar_url)

  useEffect(() => {
    if (user) {
      fetchProfile()
      
      // Subscribe to profile changes
      const profileChannel = supabase
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
        supabase.removeChannel(profileChannel)
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
        isPremiumItem: true
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
    action()
  }

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
            </button>
          ))}
        </>
      )}

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
        </button>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Minha Conta</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(85vh-60px)]">
              <div className="p-2">
                <MenuContent onAction={handleMenuAction} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: usa DropdownMenu
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:opacity-80">
          <Avatar className="h-10 w-10 cursor-pointer border border-border">
            <AvatarImage src={avatarUrl || undefined} alt={profile.nome} />
            <AvatarFallback className="bg-primary/10">
              {profile.nome ? getInitials(profile.nome) : <User className="h-4 w-4 text-primary" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="no-scrollbar w-[310px] rounded-2xl bg-muted/50 dark:bg-black/90 p-0"
      >
        {/* Main Section */}
        <section className="bg-background backdrop-blur-lg rounded-2xl p-1 shadow border border-border">
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
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}

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
        </section>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
