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
import { Link, Copy, Eye, Palette, Settings, Crown, Camera, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast" 
import { ImageCropper } from "@/components/ImageCropper"

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

  const handleCropComplete = (croppedImageUrl: string) => {
    onSettingsChange('public_avatar_url', croppedImageUrl)
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
          <TabsTrigger value="design" disabled={!hasFeature('hasDesignCustomization')}>Design{!hasFeature('hasDesignCustomization') && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}</TabsTrigger>
          <TabsTrigger value="advanced" disabled={!hasFeature('hasAdvancedSettings')}>Avançado{!hasFeature('hasAdvancedSettings') && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}</TabsTrigger>
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
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={settings.public_avatar_url} alt="Foto pública" />
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
                    Alterar Foto
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta foto será exibida no seu link público de agendamento
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between"><div><Label>Mostrar Preço</Label></div><Switch checked={settings.show_price ?? true} onCheckedChange={(checked) => onSettingsChange('show_price', checked)} /></div>
                <div className="flex items-center justify-between"><div><Label>Mostrar Duração</Label></div><Switch checked={settings.show_duration ?? true} onCheckedChange={(checked) => onSettingsChange('show_duration', checked)} /></div>
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
                <div className="space-y-2">
                  <Label>Logo (URL)</Label>
                  <Input value={settings.logo_url || ''} onChange={(e) => onSettingsChange('logo_url', e.target.value)} placeholder="https://exemplo.com/logo.png" />
                </div>
                <div className="space-y-2">
                  <Label>Imagem de Fundo</Label>
                  <Input 
                    value={settings.background_image || ''} 
                    onChange={(e) => onSettingsChange('background_image', e.target.value)} 
                    placeholder="https://exemplo.com/background.jpg" 
                    className="mb-2"
                  />
                  <div className="text-sm text-muted-foreground mb-2">ou faça upload de uma imagem:</div>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          onSettingsChange('background_image', ev.target?.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                  {settings.background_image && (
                    <div className="mt-2">
                      <img 
                        src={settings.background_image} 
                        alt="Imagem de fundo" 
                        className="w-32 h-20 object-cover rounded border"
                        style={{ aspectRatio: '16/10' }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A imagem carregada terá prioridade sobre a cor de fundo selecionada.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>CSS Personalizado</Label>
                  <Textarea value={settings.custom_css || ''} onChange={(e) => onSettingsChange('custom_css', e.target.value)} placeholder="/* Seu CSS personalizado */" rows={4} />
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
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">{isLoading ? "Salvando..." : "Salvar Configurações"}</Button>
      </div>

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