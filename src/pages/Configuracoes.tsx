import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { User, Clock, Bell, CreditCard, Save } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import SharingSettings from "@/components/sharing/SharingSettings"
import GoogleCalendarIntegration from "@/components/google/GoogleCalendarIntegration"

type AllSettings = Record<string, any>;
type ScheduleUI = Record<string, { ativo: boolean, inicio: string, fim: string }>;

const Configuracoes = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [settings, setSettings] = useState<AllSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const [scheduleUi, setScheduleUi] = useState<ScheduleUI>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (profileError) throw profileError;

      const { data: configData, error: configError } = await supabase.from('configuracoes').select('*').eq('user_id', user.id).single();
      if (configError && configError.code !== 'PGRST116') throw configError;
      
      const allSettings = { ...profileData, ...(configData || {}), email: user.email || '' };
      setSettings(allSettings);

      const scheduleFromDb = (configData as any)?.dias_atendimento_array || ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
      const initialScheduleUi: ScheduleUI = {};
      const diasSemanaKeys = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
      diasSemanaKeys.forEach(day => {
        initialScheduleUi[day] = {
          ativo: scheduleFromDb.includes(day),
          inicio: allSettings.horario_inicio || '08:00',
          fim: allSettings.horario_fim || '18:00'
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

      const profileFields = ['nome', 'profissao', 'telefone', 'crp', 'especialidade', 'bio'];
      const configFields = ['duracao_sessao', 'intervalo_sessoes', 'valor_padrao', 'valor_primeira_consulta', 'aceita_pix', 'aceita_cartao', 'aceita_transferencia', 'aceita_dinheiro', 'chave_pix', 'dados_bancarios', 'notificacao_email', 'notificacao_whatsapp', 'lembrete_24h', 'relatorio_semanal', 'email_contato_pacientes', 'whatsapp_contato_pacientes'];
      
      const profileData: Record<string, any> = {};
      const configData: Record<string, any> = { dias_atendimento_array: diasAtendimentoArray };
      
      for (const key in settings) {
        if (profileFields.includes(key)) profileData[key] = settings[key];
        if (configFields.includes(key)) configData[key] = settings[key];
      }
      
      const { error: profileError } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
      if (profileError) throw profileError;
      
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
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e configurações da conta</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="schedule">Horários</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="sharing">Compartilhamento</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><User />Dados Pessoais</CardTitle><CardDescription>Atualize suas informações básicas</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nome Completo</Label><Input value={settings.nome || ''} onChange={(e) => handleSettingsChange('nome', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Profissão</Label><Select value={settings.profissao || ''} onValueChange={(v) => handleSettingsChange('profissao', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="psicologo">Psicólogo(a)</SelectItem><SelectItem value="psicanalista">Psicanalista</SelectItem><SelectItem value="terapeuta">Terapeuta</SelectItem><SelectItem value="coach">Coach</SelectItem><SelectItem value="psiquiatra">Psiquiatra</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={settings.email || ''} disabled /></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={settings.telefone || ''} onChange={(e) => handleSettingsChange('telefone', e.target.value)} /></div>
                  <div className="space-y-2"><Label>CRP/Registro</Label><Input placeholder="CRP 01/12345" value={settings.crp || ''} onChange={(e) => handleSettingsChange('crp', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Especialidade</Label><Input placeholder="Terapia Cognitivo Comportamental" value={settings.especialidade || ''} onChange={(e) => handleSettingsChange('especialidade', e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Biografia Profissional</Label><Textarea placeholder="Descreva sua experiência..." value={settings.bio || ''} onChange={(e) => handleSettingsChange('bio', e.target.value)} className="min-h-[100px]"/></div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90"><Save className="w-4 h-4 mr-2" />{isLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock/>Horários de Atendimento</CardTitle><CardDescription>Configure seus horários disponíveis para agendamento</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  {diasSemana.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Switch checked={scheduleUi[key]?.ativo ?? false} onCheckedChange={(c) => handleScheduleChange(key, 'ativo', c)} />
                        <span className="font-medium w-20">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={scheduleUi[key]?.inicio || '08:00'} onValueChange={(v) => handleScheduleChange(key, 'inicio', v)}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => <SelectItem key={`start-${key}-${time}`} value={time}>{time}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">até</span>
                        <Select value={scheduleUi[key]?.fim || '18:00'} onValueChange={(v) => handleScheduleChange(key, 'fim', v)}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => <SelectItem key={`end-${key}-${time}`} value={time}>{time}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Duração Padrão da Sessão</Label><Select value={String(settings.duracao_sessao || '50')} onValueChange={(v) => handleSettingsChange('duracao_sessao', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">30 minutos</SelectItem><SelectItem value="45">45 minutos</SelectItem><SelectItem value="50">50 minutos</SelectItem><SelectItem value="60">60 minutos</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Intervalo Entre Sessões</Label><Select value={String(settings.intervalo_sessoes || '10')} onValueChange={(v) => handleSettingsChange('intervalo_sessoes', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Sem intervalo</SelectItem><SelectItem value="10">10 minutos</SelectItem><SelectItem value="15">15 minutos</SelectItem><SelectItem value="20">20 minutos</SelectItem></SelectContent></Select></div>
                </div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90"><Save className="w-4 h-4 mr-2" />{isLoading ? 'Salvando...' : 'Salvar Horários'}</Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell/>Preferências de Notificação</CardTitle><CardDescription>Configure como e quando receber notificações</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><div><h4 className="font-medium">Notificações por E-mail</h4><p className="text-sm text-muted-foreground">Receber avisos sobre agendamentos por e-mail</p></div><Switch checked={settings.notificacao_email ?? false} onCheckedChange={(c) => handleSettingsChange('notificacao_email', c)} /></div>
                  <div className="flex items-center justify-between"><div><h4 className="font-medium">Notificações WhatsApp</h4><p className="text-sm text-muted-foreground">Enviar lembretes por WhatsApp</p></div><Switch checked={settings.notificacao_whatsapp ?? false} onCheckedChange={(c) => handleSettingsChange('notificacao_whatsapp', c)} /></div>
                  <div className="flex items-center justify-between"><div><h4 className="font-medium">Lembrete de Sessão</h4><p className="text-sm text-muted-foreground">Notificar 24h antes da sessão</p></div><Switch checked={settings.lembrete_24h ?? false} onCheckedChange={(c) => handleSettingsChange('lembrete_24h', c)} /></div>
                  <div className="flex items-center justify-between"><div><h4 className="font-medium">Relatórios Semanais</h4><p className="text-sm text-muted-foreground">Resumo semanal de atividades</p></div><Switch checked={settings.relatorio_semanal ?? false} onCheckedChange={(c) => handleSettingsChange('relatorio_semanal', c)} /></div>
                </div>
                <div className="space-y-4 pt-4 border-t"><h4 className="font-medium">Contatos dos Pacientes</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>E-mail de Contato</Label><Input placeholder="contato@clinica.com" value={settings.email_contato_pacientes || ''} onChange={(e) => handleSettingsChange('email_contato_pacientes', e.target.value)} /></div><div className="space-y-2"><Label>WhatsApp Business</Label><Input placeholder="(11) 99999-9999" value={settings.whatsapp_contato_pacientes || ''} onChange={(e) => handleSettingsChange('whatsapp_contato_pacientes', e.target.value)} /></div></div></div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90"><Save className="w-4 h-4 mr-2" />{isLoading ? 'Salvando...' : 'Salvar Preferências'}</Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard/>Configurações de Pagamento</CardTitle><CardDescription>Configure valores e formas de pagamento</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor Padrão da Consulta (R$)</Label><Input type="number" placeholder="200.00" value={settings.valor_padrao || ''} onChange={(e) => handleSettingsChange('valor_padrao', parseFloat(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Valor da Primeira Consulta (R$)</Label><Input type="number" placeholder="220.00" value={settings.valor_primeira_consulta || ''} onChange={(e) => handleSettingsChange('valor_primeira_consulta', parseFloat(e.target.value))} /></div>
                </div>
                <div className="space-y-4"><h4 className="font-medium">Formas de Pagamento Aceitas</h4><div className="grid grid-cols-2 gap-4"><div className="flex items-center space-x-2"><Switch checked={settings.aceita_pix ?? false} onCheckedChange={(c) => handleSettingsChange('aceita_pix', c)} /><Label>Pix</Label></div><div className="flex items-center space-x-2"><Switch checked={settings.aceita_cartao ?? false} onCheckedChange={(c) => handleSettingsChange('aceita_cartao', c)} /><Label>Cartão de Crédito</Label></div><div className="flex items-center space-x-2"><Switch checked={settings.aceita_transferencia ?? false} onCheckedChange={(c) => handleSettingsChange('aceita_transferencia', c)} /><Label>Transferência Bancária</Label></div><div className="flex items-center space-x-2"><Switch checked={settings.aceita_dinheiro ?? false} onCheckedChange={(c) => handleSettingsChange('aceita_dinheiro', c)} /><Label>Dinheiro</Label></div></div></div>
                <div className="space-y-2"><Label>Chave PIX</Label><Input placeholder="seu@email.com" value={settings.chave_pix || ''} onChange={(e) => handleSettingsChange('chave_pix', e.target.value)} /><p className="text-xs text-muted-foreground">Esta chave será compartilhada com os pacientes</p></div>
                <div className="space-y-2"><Label>Dados Bancários (Opcional)</Label><Textarea placeholder="Banco: 123..." value={settings.dados_bancarios || ''} onChange={(e) => handleSettingsChange('dados_bancarios', e.target.value)} className="min-h-[80px]"/></div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90"><Save className="w-4 h-4 mr-2" />{isLoading ? 'Salvando...' : 'Salvar Configurações'}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sharing">
            <SharingSettings
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onSave={handleSave}
              isLoading={isLoading}
            />
          </TabsContent>
          <TabsContent value="integrations"><GoogleCalendarIntegration /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
export default Configuracoes;