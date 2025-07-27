import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSubscription } from "@/hooks/useSubscription"
import { PlanProtection } from "@/components/PlanProtection"
import { Link, Copy, Eye, Palette, Settings, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between"><div><Label>Mostrar Preço</Label></div><Switch checked={settings.show_price ?? true} onCheckedChange={(checked) => onSettingsChange('show_price', checked)} /></div>
                <div className="flex items-center justify-between"><div><Label>Mostrar Duração</Label></div><Switch checked={settings.show_duration ?? true} onCheckedChange={(checked) => onSettingsChange('show_duration', checked)} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">{isLoading ? "Salvando..." : "Salvar Configurações"}</Button>
      </div>
    </div>
  )
}
export default SharingSettings;