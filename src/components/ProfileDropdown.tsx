import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Shield, Palette } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"

interface Profile {
  nome: string
  profissao: string
  avatar_url?: string
}

export const ProfileDropdown = () => {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>({ nome: '', profissao: '', avatar_url: '' })
  const { avatarUrl } = useAvatarUrl(profile.avatar_url)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, profissao, avatar_url')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:opacity-80">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={avatarUrl || undefined} alt={profile.nome} />
            <AvatarFallback className="bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.nome || 'Usuário'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            {profile.profissao && (
              <p className="text-xs leading-none text-muted-foreground">
                {profile.profissao}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/configuracoes?tab=profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/configuracoes?tab=security')} className="cursor-pointer">
          <Shield className="mr-2 h-4 w-4" />
          <span>Segurança</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/configuracoes?tab=preferences')} className="cursor-pointer">
          <Palette className="mr-2 h-4 w-4" />
          <span>Preferências</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}