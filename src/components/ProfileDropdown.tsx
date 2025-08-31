import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Settings, Share, Copy, Camera } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { PasswordRequirements } from "./PasswordRequirements"
import { ImageCropper } from "./ImageCropper"

interface Profile {
  nome: string
  profissao: string
  avatar_url?: string
}

export const ProfileDropdown = () => {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [profile, setProfile] = useState<Profile>({ nome: '', profissao: '', avatar_url: '' })
  const [loading, setLoading] = useState(false)
  const [inviteLink] = useState(`https://therapypro.app/convite/${user?.id || 'default'}`)
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [selectedImageForCrop, setSelectedImageForCrop] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, profissao, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar perfil:', error)
        throw error
      }
      
      if (data) {
        setProfile(data)
      }
      setEmail(user.email || '')
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  const handleSignOut = async () => {
    console.log('handleSignOut: starting logout process')
    try {
      const result = await signOut()
      console.log('handleSignOut: signOut result:', result)
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      })
      console.log('handleSignOut: navigating to /')
      navigate("/")
    } catch (error) {
      console.error('handleSignOut: error during logout:', error)
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage error:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName)

      setSelectedImageForCrop(publicUrl)
      setShowImageCropper(true)
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      toast({
        title: "Erro",
        description: "Erro ao processar imagem.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfile(prev => ({ ...prev, avatar_url: croppedImageUrl }))
  }

  const validatePassword = (password: string) => {
    const requirements = [
      { test: (pwd: string) => pwd.length >= 8, message: "Pelo menos 8 caracteres" },
      { test: (pwd: string) => /[A-Z]/.test(pwd), message: "Uma letra maiúscula" },
      { test: (pwd: string) => /[a-z]/.test(pwd), message: "Uma letra minúscula" },
      { test: (pwd: string) => /\d/.test(pwd), message: "Um número" },
      { test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), message: "Um caractere especial" }
    ]
    
    return requirements.every(req => req.test(password))
  }

  const handleSaveProfile = async () => {
    if (!user) {
      console.error('Usuário não encontrado')
      return
    }

    // Validar senha se fornecida
    if (newPassword && newPassword !== confirmPassword) {
      console.error('Senhas não coincidem')
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      return
    }

    // Validar requisitos da senha
    if (newPassword && newPassword.trim() !== '' && !validatePassword(newPassword)) {
      toast({
        title: "Senha inválida",
        description: "A senha deve atender a todos os requisitos listados.",
        variant: "destructive",
      })
      return
    }

    console.log('Iniciando salvamento do perfil...', { profile, email, hasNewPassword: !!newPassword })
    setLoading(true)
    try {
      console.log('Salvando perfil no banco...')
      // Atualizar perfil existente
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome: profile.nome,
          profissao: profile.profissao,
          avatar_url: profile.avatar_url,
          public_avatar_url: profile.avatar_url  // Salvar também como público
        })
        .eq('user_id', user.id)

      if (profileError) {
        console.error('Erro ao salvar perfil:', profileError)
        throw profileError
      }
      console.log('Perfil salvo com sucesso')

      // Atualizar senha se fornecida
      if (newPassword && newPassword.trim() !== '') {
        console.log('Atualizando senha...')
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        })
        if (passwordError) {
          console.error('Erro ao atualizar senha:', passwordError)
          // Não mostrar toast de erro aqui pois já validamos antes
          return
        }
        console.log('Senha atualizada com sucesso')
        toast({
          title: "Senha atualizada",
          description: "Sua senha foi alterada com sucesso.",
        })
        // Limpar os campos de senha
        setNewPassword('')
        setConfirmPassword('')
      }

      // Atualizar e-mail se alterado
      if (email !== user.email) {
        console.log('Atualizando e-mail...')
        const { error: emailError } = await supabase.auth.updateUser({
          email: email
        })
        if (emailError) {
          console.error('Erro ao atualizar e-mail:', emailError)
          throw emailError
        }
        console.log('E-mail atualizado com sucesso')
        
        toast({
          title: "E-mail de confirmação enviado",
          description: "Verifique sua caixa de entrada para confirmar o novo e-mail.",
        })
      }

      // Atualizar link de agendamento automaticamente baseado no nome
      if (profile.nome) {
        console.log('Atualizando link de agendamento...')
        const sanitizedName = profile.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
          .replace(/\s+/g, '-') // Substitui espaços por hífen
          .replace(/-+/g, '-') // Remove hífens duplos
          .replace(/^-|-$/g, '') // Remove hífens no início e fim

        const newLink = `https://therapypro.app/agendar/slug/${sanitizedName}`
        
        // Atualizar link na tabela de configurações
        const { error: configError } = await supabase
          .from('configuracoes')
          .update({ link_agendamento: newLink })
          .eq('user_id', user.id)
          
        if (configError) {
          console.error('Erro ao atualizar configurações:', configError)
          // Não falha a operação se houver erro nas configurações
        } else {
          console.log('Link de agendamento atualizado com sucesso')
        }
      }

      console.log('Perfil salvo com sucesso, fechando modal')
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      })
      setIsModalOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Erro completo ao salvar perfil:', error)
      toast({
        title: "Erro",
        description: `Erro ao salvar perfil: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive",
      })
    } finally {
      console.log('Finalizando salvamento')
      setLoading(false)
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast({
      title: "Link copiado!",
      description: "O link de convite foi copiado para a área de transferência.",
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url} alt={profile.nome} />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
          <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Editar Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyInviteLink}>
            <Share className="w-4 h-4 mr-2" />
            Copiar Link de Convite
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Foto</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url} alt={profile.nome} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Alterar
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={profile.nome}
                onChange={(e) => setProfile(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profissao">Profissão</Label>
              <Input
                id="profissao"
                value={profile.profissao}
                onChange={(e) => setProfile(prev => ({ ...prev, profissao: e.target.value }))}
                placeholder="Ex: Psicólogo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixe em branco para manter a atual"
              />
              {newPassword && (
                <div className="mt-3">
                  <PasswordRequirements password={newPassword} />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveProfile} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropper
        isOpen={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        imageSrc={selectedImageForCrop}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={true}
      />
    </>
  )
}