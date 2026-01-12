import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useSubscription } from "@/hooks/useSubscription"
import { 
  Crown, 
  Palette, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  MessageSquare, 
  Shield, 
  DollarSign,
  Lock
} from "lucide-react"

interface PremiumDesignSettingsProps {
  settings: Record<string, any>
  onSettingsChange: (field: string, value: any) => void
}

// Definição dos temas visuais
const VISUAL_THEMES = [
  { 
    id: 'minimal_clean', 
    name: 'Minimal Clean', 
    description: 'Visual limpo e moderno com tons neutros',
    preview: { bg: '#f8fafc', accent: '#0f172a', text: '#334155' }
  },
  { 
    id: 'therapeutic_soft', 
    name: 'Terapêutico Suave', 
    description: 'Tons suaves e acolhedores em verde-água',
    preview: { bg: '#f0fdf4', accent: '#15803d', text: '#14532d' }
  },
  { 
    id: 'professional_dark', 
    name: 'Profissional Escuro', 
    description: 'Visual sofisticado em tons escuros',
    preview: { bg: '#1e293b', accent: '#3b82f6', text: '#e2e8f0' }
  },
  { 
    id: 'welcoming_pastel', 
    name: 'Acolhedor Pastel', 
    description: 'Cores suaves e convidativas em rosa e lilás',
    preview: { bg: '#fdf2f8', accent: '#db2777', text: '#831843' }
  },
  { 
    id: 'institutional_neutral', 
    name: 'Institucional Neutro', 
    description: 'Visual profissional e corporativo',
    preview: { bg: '#f5f5f4', accent: '#44403c', text: '#292524' }
  }
]

// Definição dos blocos reordenáveis
const DEFAULT_BLOCKS = [
  { id: 'photo', name: 'Foto / Logo', icon: '📷' },
  { id: 'title', name: 'Título', icon: '📝' },
  { id: 'bio', name: 'Bio', icon: '👤' },
  { id: 'specialty', name: 'Especialidade', icon: '🎯' },
  { id: 'welcome_message', name: 'Mensagem de Acolhimento', icon: '💬' },
  { id: 'values', name: 'Valores', icon: '💰' },
  { id: 'schedule', name: 'Horários / Agenda', icon: '📅' },
  { id: 'payment_info', name: 'Informações de Pagamento', icon: '💳' },
  { id: 'observations', name: 'Observações', icon: '📋' }
]

// Selos de confiança
const TRUST_BADGES = [
  { id: 'confidential', label: 'Atendimento sigiloso', icon: '🔒' },
  { id: 'ethics_code', label: 'Conforme Código de Ética', icon: '📜' },
  { id: 'registered', label: 'Profissional registrado (CRP)', icon: '✅' },
  { id: 'safe_environment', label: 'Ambiente seguro e confidencial', icon: '🛡️' }
]

const PremiumDesignSettings = ({ settings, onSettingsChange }: PremiumDesignSettingsProps) => {
  const { currentPlan } = useSubscription()
  const isPremium = currentPlan === 'premium'

  // Estado para ordem dos blocos
  const blockOrder = settings.block_order || DEFAULT_BLOCKS.map(b => b.id)

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...blockOrder]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
    onSettingsChange('block_order', newOrder)
  }

  const getBlockById = (id: string) => DEFAULT_BLOCKS.find(b => b.id === id)

  // Selos selecionados
  const selectedBadges = settings.trust_badges || []

  const toggleBadge = (badgeId: string) => {
    const newBadges = selectedBadges.includes(badgeId)
      ? selectedBadges.filter((id: string) => id !== badgeId)
      : [...selectedBadges, badgeId]
    onSettingsChange('trust_badges', newBadges)
  }

  // Wrapper para campos premium-only
  const PremiumWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isPremium) return <>{children}</>
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Premium</span>
          </div>
        </div>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Temas Visuais */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="w-5 h-5 text-primary" />
            Tema da Página
            {!isPremium && <Badge variant="outline" className="ml-2 text-warning border-warning"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </CardTitle>
          <CardDescription>Escolha um tema visual pré-definido para sua página</CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumWrapper>
            <RadioGroup 
              value={settings.visual_theme || 'minimal_clean'} 
              onValueChange={(value) => onSettingsChange('visual_theme', value)}
              className="grid gap-3"
            >
              {VISUAL_THEMES.map(theme => (
                <div key={theme.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={theme.id} id={theme.id} />
                  <Label htmlFor={theme.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-md border flex items-center justify-center text-xs font-bold"
                        style={{ 
                          backgroundColor: theme.preview.bg, 
                          color: theme.preview.accent,
                          borderColor: theme.preview.accent
                        }}
                      >
                        Aa
                      </div>
                      <div>
                        <p className="font-medium text-sm">{theme.name}</p>
                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </PremiumWrapper>
        </CardContent>
      </Card>

      {/* 2. Ordem de Exibição dos Blocos */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowUp className="w-5 h-5 text-primary" />
            Ordem dos Blocos da Página
            {!isPremium && <Badge variant="outline" className="ml-2 text-warning border-warning"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </CardTitle>
          <CardDescription>Reordene os elementos da sua página pública</CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumWrapper>
            <div className="space-y-2">
              {blockOrder.map((blockId: string, index: number) => {
                const block = getBlockById(blockId)
                if (!block) return null
                return (
                  <div 
                    key={blockId} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{block.icon}</span>
                      <span className="font-medium text-sm">{block.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveBlock(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveBlock(index, 'down')}
                        disabled={index === blockOrder.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </PremiumWrapper>
        </CardContent>
      </Card>

      {/* 3. Destaques Visuais */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Destaques Visuais
            {!isPremium && <Badge variant="outline" className="ml-2 text-warning border-warning"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </CardTitle>
          <CardDescription>Destaque elementos importantes para aumentar conversões</CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumWrapper>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Destacar Primeira Consulta</Label>
                  <p className="text-xs text-muted-foreground">Adiciona badge especial ao valor da 1ª consulta</p>
                </div>
                <Switch 
                  checked={settings.highlight_first_consultation ?? false}
                  onCheckedChange={(checked) => onSettingsChange('highlight_first_consultation', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Destacar Horários Disponíveis Hoje</Label>
                  <p className="text-xs text-muted-foreground">Enfatiza horários disponíveis para o dia atual</p>
                </div>
                <Switch 
                  checked={settings.highlight_available_today ?? false}
                  onCheckedChange={(checked) => onSettingsChange('highlight_available_today', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Destacar Valor Promocional</Label>
                  <p className="text-xs text-muted-foreground">Adiciona destaque visual a preços especiais</p>
                </div>
                <Switch 
                  checked={settings.highlight_promo_value ?? false}
                  onCheckedChange={(checked) => onSettingsChange('highlight_promo_value', checked)}
                />
              </div>
            </div>
          </PremiumWrapper>
        </CardContent>
      </Card>

      {/* 4. Conteúdo Estratégico */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Conteúdo da Página
            {!isPremium && <Badge variant="outline" className="ml-2 text-warning border-warning"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </CardTitle>
          <CardDescription>Personalize textos estratégicos da sua página</CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumWrapper>
            <div className="space-y-6">
              {/* 4.1 Mensagem de Acolhimento */}
              <div className="space-y-2">
                <Label className="font-medium">Mensagem de Acolhimento</Label>
                <Textarea 
                  value={settings.welcome_message || ''}
                  onChange={(e) => onSettingsChange('welcome_message', e.target.value)}
                  placeholder="Fique à vontade para escolher o melhor horário para sua consulta."
                  rows={3}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">Exibida no topo da página pública (máx. 300 caracteres)</p>
              </div>

              {/* 4.2 Observações Antes do Agendamento */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Observações Antes do Agendamento</Label>
                    <p className="text-xs text-muted-foreground">Exibido antes da confirmação do horário</p>
                  </div>
                  <Switch 
                    checked={settings.show_pre_booking_notes ?? false}
                    onCheckedChange={(checked) => onSettingsChange('show_pre_booking_notes', checked)}
                  />
                </div>
                {settings.show_pre_booking_notes && (
                  <Textarea 
                    value={settings.pre_booking_notes || ''}
                    onChange={(e) => onSettingsChange('pre_booking_notes', e.target.value)}
                    placeholder="Por favor, chegue 10 minutos antes do horário agendado..."
                    rows={3}
                    maxLength={500}
                  />
                )}
              </div>

              {/* 4.3 Texto do Botão de Agendamento */}
              <div className="space-y-2">
                <Label className="font-medium">Texto do Botão de Agendamento (CTA)</Label>
                <Input 
                  value={settings.cta_button_text || ''}
                  onChange={(e) => onSettingsChange('cta_button_text', e.target.value.replace(/<[^>]*>/g, ''))}
                  placeholder="Confirmar Agendamento"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Sugestões: "Agendar minha consulta", "Iniciar acompanhamento", "Escolher horário"
                </p>
              </div>
            </div>
          </PremiumWrapper>
        </CardContent>
      </Card>

      {/* 5. Selos de Confiança */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Selos de Confiança
            {!isPremium && <Badge variant="outline" className="ml-2 text-warning border-warning"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </CardTitle>
          <CardDescription>Adicione credibilidade à sua página pública</CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumWrapper>
            <div className="space-y-3">
              {TRUST_BADGES.map(badge => (
                <div key={badge.id} className="flex items-center space-x-3">
                  <Checkbox 
                    id={badge.id}
                    checked={selectedBadges.includes(badge.id)}
                    onCheckedChange={() => toggleBadge(badge.id)}
                  />
                  <Label htmlFor={badge.id} className="flex items-center gap-2 cursor-pointer">
                    <span>{badge.icon}</span>
                    <span className="text-sm">{badge.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </PremiumWrapper>
        </CardContent>
      </Card>

      {/* 6. Exibição Inteligente de Valores */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-primary" />
            Exibição de Valores
            {!isPremium && <Badge variant="outline" className="ml-2 text-warning border-warning"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </CardTitle>
          <CardDescription>Controle como os valores são exibidos</CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumWrapper>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Mostrar valores apenas após seleção do horário</Label>
                  <p className="text-xs text-muted-foreground">Valores aparecem somente após escolher data/hora</p>
                </div>
                <Switch 
                  checked={settings.show_values_after_selection ?? false}
                  onCheckedChange={(checked) => onSettingsChange('show_values_after_selection', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Mostrar valor "a partir de R$ X"</Label>
                  <p className="text-xs text-muted-foreground">Exibe o menor valor disponível</p>
                </div>
                <Switch 
                  checked={settings.show_starting_from_value ?? false}
                  onCheckedChange={(checked) => onSettingsChange('show_starting_from_value', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Destacar valor da primeira consulta</Label>
                  <p className="text-xs text-muted-foreground">Enfatiza preço especial para novos pacientes</p>
                </div>
                <Switch 
                  checked={settings.emphasize_first_consultation ?? false}
                  onCheckedChange={(checked) => onSettingsChange('emphasize_first_consultation', checked)}
                />
              </div>
            </div>
          </PremiumWrapper>
        </CardContent>
      </Card>
    </div>
  )
}

export default PremiumDesignSettings
