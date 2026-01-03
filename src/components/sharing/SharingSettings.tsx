import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSubscription } from "@/hooks/useSubscription"
import { PlanProtection } from "@/components/PlanProtection"
import { Link, Copy, Eye, Palette, Settings, Crown, Camera, User, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast" 
import { ImageCropper } from "@/components/ImageCropper"
import { ImageUpload } from "@/components/sharing/ImageUpload"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"

interface SharingSettingsProps {
  settings: Record<string, any>;
  onSettingsChange: (field: string, value: any) => void;
  onSave: () => void;
  isLoading: boolean;
}

const SharingSettings = ({ settings, onSettingsChange, onSave, isLoading }: SharingSettingsProps) => {
  const { hasFeature } = useSubscription()
  const { toast } = useToast()
  const [linkCopied, setLinkCopied] = useState(false)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [selectedImageForCrop, setSelectedImageForCrop] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bookingLink = `https://therapypro.app.br/agendar/slug/${settings.slug || ''}`
  const { avatarUrl } = useAvatarUrl(settings.public_avatar_url)

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
    toast({ title: "Link copiado!" })
  }

  const previewLink = () => {
    window.open(bookingLink, '_blank')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

    const imageUrl = URL.createObjectURL(file)
    setSelectedImageForCrop(imageUrl)
    setShowImageCropper(true)
  }

  const handleCropComplete = (storagePath: string) => {
    // ImageCropper agora retorna o caminho do storage privado
    onSettingsChange('public_avatar_url', storagePath)
    toast({
      title: "Sucesso",
      description: "Foto atualizada com sucesso!",
    })
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="flex items-center gap-2"><Link className="w-5 h-5 text-primary" />Link de Agendamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={bookingLink} readOnly className="bg-accent/30" />
            <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4 mr-2" />{linkCopied ? "Copiado!" : "Copiar"}</Button>
            <Button variant="outline" onClick={previewLink}><Eye className="w-4 h-4 mr-2" />Visualizar</Button>
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Agendamento Online Ativo</Label><p className="text-sm text-muted-foreground">Permite que clientes agendem através do link</p></div>
            <Switch checked={settings.booking_enabled ?? true} onCheckedChange={(checked) => onSettingsChange('booking_enabled', checked)} />
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="design" disabled={!hasFeature('hasDesignCustomization')}>Design{!hasFeature('hasDesignCustomization') && <Crown className="w-3 h-3 ml-1 text-warning" />}</TabsTrigger>
          <TabsTrigger value="advanced" disabled={!hasFeature('hasAdvancedSettings')}>Avançado{!hasFeature('hasAdvancedSettings') && <Crown className="w-3 h-3 ml-1 text-warning" />}</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-lg">Configurações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seu Slug Personalizado</Label>
                <div className="flex items-center">
                  <span className="text-sm p-2 bg-muted rounded-l-md border border-r-0">therapypro.app.br/agendar/slug/</span>
                  <Input value={settings.slug || ''} onChange={(e) => onSettingsChange('slug', generateSlug(e.target.value))} className="rounded-l-none" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Título da Página</Label><Input value={settings.page_title || ''} onChange={(e) => onSettingsChange('page_title', e.target.value)} placeholder="Agendar Consulta" /></div>
                <div className="space-y-2"><Label>Descrição</Label><Input value={settings.page_description || ''} onChange={(e) => onSettingsChange('page_description', e.target.value)} placeholder="Psicoterapia online" /></div>
              </div>
              <div className="space-y-2">
                <Label>Foto Pública</Label>
                <div className="flex items-center gap-3">
                  <div 
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatarUrl || undefined} alt="Foto pública" />
                      <AvatarFallback>
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    
                    {settings.public_avatar_url && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettingsChange('public_avatar_url', '');
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta foto será exibida no seu link público de agendamento quando ativada
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mostrar Foto na Página</Label>
                  <p className="text-sm text-muted-foreground">Exibir sua foto na página pública</p>
                </div>
                <Switch 
                  checked={settings.show_photo !== false} 
                  onCheckedChange={(checked) => onSettingsChange('show_photo', checked)} 
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between"><div><Label>Mostrar Preço</Label></div><Switch checked={settings.show_price ?? true} onCheckedChange={(checked) => onSettingsChange('show_price', checked)} /></div>
                <div className="flex items-center justify-between"><div><Label>Mostrar Duração</Label></div><Switch checked={settings.show_duration ?? true} onCheckedChange={(checked) => onSettingsChange('show_duration', checked)} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Especialidade</Label>
                    <p className="text-sm text-muted-foreground">Exibir sua especialidade na página</p>
                  </div>
                  <Switch 
                    checked={settings.show_specialty ?? true} 
                    onCheckedChange={(checked) => onSettingsChange('show_specialty', checked)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Bio</Label>
                    <p className="text-sm text-muted-foreground">Exibir sua bio na página</p>
                  </div>
                  <Switch 
                    checked={settings.show_bio ?? true} 
                    onCheckedChange={(checked) => onSettingsChange('show_bio', checked)} 
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                💡 A especialidade e a bio são preenchidas na aba "Perfil" em Configurações.
              </p>
              <div className="pt-4">
                <Button onClick={onSave} disabled={isLoading} size="sm" className="bg-gradient-primary hover:opacity-90">
                  {isLoading ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="design" className="space-y-4">
          <PlanProtection feature="hasDesignCustomization">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" />Personalização Visual</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Principal</Label>
                    <Input type="color" value={settings.brand_color || '#3b82f6'} onChange={(e) => onSettingsChange('brand_color', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <Input type="color" value={settings.background_color || '#ffffff'} onChange={(e) => onSettingsChange('background_color', e.target.value)} />
                  </div>
                </div>
                <ImageUpload 
                  label="Logo"
                  value={settings.logo_url || ''}
                  onChange={(url) => onSettingsChange('logo_url', url)}
                />
                <div className="space-y-2">
                  <ImageUpload 
                    label="Imagem de Fundo"
                    value={settings.background_image || ''}
                    onChange={(url) => onSettingsChange('background_image', url)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A imagem carregada terá prioridade sobre a cor de fundo selecionada.
                  </p>
                </div>
              </CardContent>
            </Card>
          </PlanProtection>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <PlanProtection feature="hasAdvancedSettings">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" />Configurações Avançadas</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Domínio Personalizado</Label>
                  <Input value={settings.custom_domain || ''} onChange={(e) => onSettingsChange('custom_domain', e.target.value)} placeholder="meusite.com.br" />
                </div>
                <div className="space-y-2">
                  <Label>Rodapé Personalizado</Label>
                  <Textarea value={settings.custom_footer || ''} onChange={(e) => onSettingsChange('custom_footer', e.target.value)} placeholder="© 2024 Minha Clínica. Todos os direitos reservados." rows={3} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Modo Manutenção</Label><p className="text-sm text-muted-foreground">Desabilita temporariamente o agendamento</p></div>
                  <Switch checked={!settings.booking_enabled} onCheckedChange={(checked) => onSettingsChange('booking_enabled', !checked)} />
                </div>
              </CardContent>
            </Card>
          </PlanProtection>
        </TabsContent>
      </Tabs>

      <ImageCropper
        isOpen={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        imageSrc={selectedImageForCrop}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={true}
      />
    </div>
  )
}
export default SharingSettings;