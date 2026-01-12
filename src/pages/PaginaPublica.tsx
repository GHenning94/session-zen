import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { Clock, CreditCard, Share2, Save } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import SharingSettings from "@/components/sharing/SharingSettings"

type AllSettings = Record<string, any>;
type ScheduleUI = Record<string, { ativo: boolean, inicio: string, fim: string }>;

const PaginaPublica = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [settings, setSettings] = useState<AllSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("schedule")
  const [scheduleUi, setScheduleUi] = useState<ScheduleUI>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Carregar dados básicos do perfil (sem informações financeiras sensíveis)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, nome, profissao, especialidade, bio, crp, telefone, avatar_url, public_avatar_url, subscription_plan, created_at, updated_at')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) throw profileError;

      const { data: configData, error: configError } = await supabase.from('configuracoes').select('*').eq('user_id', user.id).single();
      if (configError && configError.code !== 'PGRST116') throw configError;
      
      const allSettings = { ...profileData, ...(configData || {}), email: user.email || '' };
      setSettings(allSettings);

      const scheduleFromDb = (configData as any)?.dias_atendimento_array || ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
      const horariosPorDia = (configData as any)?.horarios_por_dia || {};
      const initialScheduleUi: ScheduleUI = {};
      const diasSemanaKeys = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
      diasSemanaKeys.forEach(day => {
        const horarioDoDia = horariosPorDia[day];
        initialScheduleUi[day] = {
          ativo: scheduleFromDb.includes(day),
          inicio: horarioDoDia?.inicio || allSettings.horario_inicio || '08:00',
          fim: horarioDoDia?.fim || allSettings.horario_fim || '18:00'
        };
      });
      setScheduleUi(initialScheduleUi);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro ao carregar dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { loadData() }, [loadData]);

  const handleSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (day: string, field: 'ativo' | 'inicio' | 'fim', value: any) => {
    setScheduleUi(prev => ({ ...prev, [day]: { ...prev[day], [field]: value }}));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const diasAtendimentoArray = Object.entries(scheduleUi).filter(([, value]) => value.ativo).map(([key]) => key);

      const horariosPorDia = Object.entries(scheduleUi).reduce((acc, [day, config]) => {
        if (config.ativo) {
          acc[day] = { inicio: config.inicio, fim: config.fim };
        }
        return acc;
      }, {} as Record<string, { inicio: string, fim: string }>);

      const diasAtivos = Object.entries(scheduleUi).filter(([, value]) => value.ativo);
      let horarioInicioGlobal = '23:59';
      let horarioFimGlobal = '00:00';
      
      diasAtivos.forEach(([, value]) => {
        if (value.inicio < horarioInicioGlobal) horarioInicioGlobal = value.inicio;
        if (value.fim > horarioFimGlobal) horarioFimGlobal = value.fim;
      });

      const configFields = ['duracao_sessao', 'intervalo_sessoes', 'valor_padrao', 'valor_primeira_consulta', 'aceita_pix', 'aceita_cartao', 'aceita_transferencia', 'aceita_dinheiro', 'chave_pix', 'dados_bancarios', 'email_contato_pacientes', 'whatsapp_contato_pacientes', 'slug', 'page_title', 'page_description', 'brand_color', 'background_color', 'logo_url', 'background_image', 'custom_css', 'custom_domain', 'custom_footer', 'booking_enabled', 'show_price', 'show_duration', 'show_photo', 'show_specialty', 'show_bio', 'show_session_value', 'show_first_consultation_value', 'show_pix_key', 'show_bank_details', 'show_payment_methods', 'show_page_title', 'show_page_description', 'visual_theme', 'block_order', 'highlight_first_consultation', 'highlight_today_slots', 'highlight_promotional_value', 'welcome_message', 'show_pre_booking_notes', 'pre_booking_notes', 'cta_text', 'trust_badges', 'show_values_after_selection', 'show_starting_from_value', 'emphasize_first_consultation'];
      
      const configData: Record<string, any> = { 
        dias_atendimento_array: diasAtendimentoArray,
        horarios_por_dia: horariosPorDia,
        horario_inicio: diasAtivos.length > 0 ? horarioInicioGlobal : '08:00',
        horario_fim: diasAtivos.length > 0 ? horarioFimGlobal : '18:00'
      };
      
      for (const key in settings) {
        if (configFields.includes(key)) configData[key] = settings[key];
      }
      
      const { error: configError } = await supabase.from('configuracoes').upsert({ user_id: user.id, ...configData });
      if (configError) throw configError;
      
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro ao salvar configurações.", description: (error as any).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2).toString().padStart(2, '0');
    const minute = (i % 2 === 0) ? '00' : '30';
    return `${hour}:${minute}`;
  });

  if (isLoading) return <Layout><p className="p-4">Carregando configurações...</p></Layout>;

  const diasSemana = [
    { key: 'segunda', label: 'Segunda' }, { key: 'terca', label: 'Terça' }, { key: 'quarta', label: 'Quarta' },
    { key: 'quinta', label: 'Quinta' }, { key: 'sexta', label: 'Sexta' }, { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Página Pública</h1>
          <p className="text-muted-foreground">Configure como sua página de agendamentos será exibida aos pacientes</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Horários</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="sharing">Compartilhamento</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schedule" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock />Horários de Atendimento
                </CardTitle>
                <CardDescription>Configure seus horários disponíveis para agendamento público</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  {diasSemana.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Switch 
                          checked={scheduleUi[key]?.ativo ?? false} 
                          onCheckedChange={(c) => handleScheduleChange(key, 'ativo', c)} 
                        />
                        <span className="font-medium w-20">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={scheduleUi[key]?.inicio || '08:00'} 
                          onValueChange={(v) => handleScheduleChange(key, 'inicio', v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => (
                              <SelectItem key={`start-${key}-${time}`} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">até</span>
                        <Select 
                          value={scheduleUi[key]?.fim || '18:00'} 
                          onValueChange={(v) => handleScheduleChange(key, 'fim', v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => (
                              <SelectItem key={`end-${key}-${time}`} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração Padrão da Sessão</Label>
                    <Select 
                      value={String(settings.duracao_sessao || '50')} 
                      onValueChange={(v) => handleSettingsChange('duracao_sessao', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="50">50 minutos</SelectItem>
                        <SelectItem value="60">60 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Intervalo Entre Sessões</Label>
                    <Select 
                      value={String(settings.intervalo_sessoes || '10')} 
                      onValueChange={(v) => handleSettingsChange('intervalo_sessoes', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sem intervalo</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="20">20 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading} size="sm" className="bg-gradient-primary hover:opacity-90">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Horários'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard />Formas de Pagamento
                </CardTitle>
                <CardDescription>Configure os valores e métodos de pagamento aceitos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Padrão da Sessão (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="150.00" 
                      value={settings.valor_padrao || ''} 
                      onChange={(e) => handleSettingsChange('valor_padrao', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Primeira Consulta (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="120.00" 
                      value={settings.valor_primeira_consulta || ''} 
                      onChange={(e) => handleSettingsChange('valor_primeira_consulta', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Métodos de Pagamento Aceitos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.aceita_pix ?? false} 
                        onCheckedChange={(c) => handleSettingsChange('aceita_pix', c)} 
                      />
                      <Label>PIX</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.aceita_cartao ?? false} 
                        onCheckedChange={(c) => handleSettingsChange('aceita_cartao', c)} 
                      />
                      <Label>Cartão</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.aceita_dinheiro ?? false} 
                        onCheckedChange={(c) => handleSettingsChange('aceita_dinheiro', c)} 
                      />
                      <Label>Dinheiro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.aceita_transferencia ?? false} 
                        onCheckedChange={(c) => handleSettingsChange('aceita_transferencia', c)} 
                      />
                      <Label>Transferência</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input 
                      placeholder="sua@chave.pix" 
                      value={settings.chave_pix || ''} 
                      onChange={(e) => handleSettingsChange('chave_pix', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dados Bancários</Label>
                    <Input 
                      placeholder="Banco: 001, Agência: 1234, Conta: 12345-6" 
                      value={settings.dados_bancarios || ''} 
                      onChange={(e) => handleSettingsChange('dados_bancarios', e.target.value)} 
                    />
                  </div>
                </div>
                
                <Button onClick={handleSave} disabled={isLoading} size="sm" className="bg-gradient-primary hover:opacity-90">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sharing" className="space-y-6">
            <SharingSettings
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onSave={handleSave}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default PaginaPublica