import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { User, Bell, CreditCard, Save, Building, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { NotificationSettings } from "@/components/notifications/NotificationSettings"
import { PaymentMethodCard } from "@/components/PaymentMethodCard"
import { UpdatePaymentMethodModal } from "@/components/UpdatePaymentMethodModal"
import { SubscriptionInvoices } from "@/components/SubscriptionInvoices"

type AllSettings = Record<string, any>;

const Configuracoes = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [settings, setSettings] = useState<AllSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const [showNotificationModal, setShowNotificationModal] = useState<{ type: 'email' | 'whatsapp' | 'reminder' | 'reports'; title: string } | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false)
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<string | null>(null)

  const loadPaymentMethods = async () => {
    if (!user) return;
    
    try {
      setLoadingPayments(true);
      const { data, error } = await supabase.functions.invoke('get-payment-methods');
      
      if (error) {
        // Silent fail if it's a configuration issue
        console.warn('[Configuracoes] Could not load payment methods:', error);
        setPaymentMethods([]);
        return;
      }
      
      setPaymentMethods(data.paymentMethods || []);
    } catch (error: any) {
      console.error('[Configuracoes] Error loading payment methods:', error);
      
      // Only show toast for unexpected errors, not configuration issues
      if (error?.message && !error.message.includes('not found') && !error.message.includes('No customer')) {
        toast({
          title: "Erro",
          description: "Erro ao carregar métodos de pagamento.",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingPayments(false);
    }
  };

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

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro ao carregar dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { loadData() }, [loadData]);
  
  // Lazy load payment methods only when viewing subscription tab
  useEffect(() => {
    const loadPaymentMethodsIfSubscribed = async () => {
      if (activeTab === 'platform-payments' && user) {
        // Check if user has active subscription first
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_plan')
            .eq('user_id', user.id)
            .single();
          
          // Only load payment methods if user has a paid plan
          if (profile?.subscription_plan && profile.subscription_plan !== 'basico') {
            console.log('[Configuracoes] Loading payment methods for subscription tab');
            loadPaymentMethods();
          } else {
            console.log('[Configuracoes] Basic plan - skipping payment methods');
            setPaymentMethods([]);
          }
        } catch (error) {
          console.warn('[Configuracoes] Could not check subscription:', error);
        }
      }
    };
    
    loadPaymentMethodsIfSubscribed();
  }, [activeTab, user]);

  const handleSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const profileFields = ['nome', 'profissao', 'telefone', 'crp', 'especialidade', 'bio', 'avatar_url', 'public_avatar_url', 'banco', 'agencia', 'conta', 'tipo_conta', 'cpf_cnpj'];
      const configFields = ['notificacao_email', 'notificacao_whatsapp', 'lembrete_24h', 'relatorio_semanal', 'email_contato_pacientes', 'whatsapp_contato_pacientes'];
      
      const profileData: Record<string, any> = {};
      const configData: Record<string, any> = {};
      
      for (const key in settings) {
        if (profileFields.includes(key)) profileData[key] = settings[key];
        if (configFields.includes(key)) configData[key] = settings[key];
      }
      
      const { error: profileError } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
      if (profileError) throw profileError;
      
      if (Object.keys(configData).length > 0) {
        const { error: configError } = await supabase.from('configuracoes').upsert({ user_id: user.id, ...configData });
        if (configError) throw configError;
      }
      
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro ao salvar configurações.", description: (error as any).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    loadPaymentMethods();
    toast({
      title: "Sucesso!",
      description: "Método de pagamento atualizado com sucesso.",
    });
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!user) return

    setDeletingPaymentMethod(paymentMethodId)
    try {
      const { error } = await supabase.functions.invoke('delete-payment-method', {
        body: { paymentMethodId }
      })

      if (error) throw error

      await loadPaymentMethods()
      toast({
        title: "Cartão removido",
        description: "O método de pagamento foi removido com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao deletar método de pagamento:', error)
      toast({
        title: "Erro",
        description: "Erro ao remover método de pagamento.",
        variant: "destructive",
      })
    } finally {
      setDeletingPaymentMethod(null)
    }
  }

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!user) return

    try {
      const { error } = await supabase.functions.invoke('update-default-payment-method', {
        body: { paymentMethodId }
      })

      if (error) throw error

      await loadPaymentMethods()
      toast({
        title: "Cartão padrão definido",
        description: "O método de pagamento padrão foi atualizado.",
      })
    } catch (error) {
      console.error('Erro ao definir método padrão:', error)
      toast({
        title: "Erro",
        description: "Erro ao definir método de pagamento padrão.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) return <Layout><p className="p-4">Carregando configurações...</p></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e configurações da conta</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="platform-payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="bank-details">Dados Bancários</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User />Dados Pessoais
                </CardTitle>
                <CardDescription>Atualize suas informações básicas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input 
                      value={settings.nome || ''} 
                      onChange={(e) => handleSettingsChange('nome', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profissão</Label>
                    <Select 
                      value={settings.profissao || ''} 
                      onValueChange={(v) => handleSettingsChange('profissao', v)}
                    >
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="psicologo">Psicólogo(a)</SelectItem>
                        <SelectItem value="psicanalista">Psicanalista</SelectItem>
                        <SelectItem value="terapeuta">Terapeuta</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="psiquiatra">Psiquiatra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={settings.email || ''} disabled />
                    <p className="text-xs text-muted-foreground">
                      Para alterar seu e-mail, entre em contato com o suporte
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input 
                      value={settings.telefone || ''} 
                      onChange={(e) => handleSettingsChange('telefone', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CRP/Registro</Label>
                    <Input 
                      placeholder="CRP 01/12345" 
                      value={settings.crp || ''} 
                      onChange={(e) => handleSettingsChange('crp', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
                    <Input 
                      placeholder="Terapia Cognitivo Comportamental" 
                      value={settings.especialidade || ''} 
                      onChange={(e) => handleSettingsChange('especialidade', e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Biografia Profissional</Label>
                  <Textarea 
                    placeholder="Descreva sua experiência..." 
                    value={settings.bio || ''} 
                    onChange={(e) => handleSettingsChange('bio', e.target.value)} 
                    className="min-h-[100px]"
                  />
                </div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platform-payments" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard />Métodos de Pagamento
                </CardTitle>
                <CardDescription>
                  Gerencie seus cartões de crédito e débito para pagamento da assinatura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPayments ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <PaymentMethodCard
                        key={method.id}
                        paymentMethod={method}
                        onEdit={() => setShowUpdatePaymentModal(true)}
                        onDelete={() => handleDeletePaymentMethod(method.id)}
                        onSetDefault={() => handleSetDefaultPaymentMethod(method.id)}
                        isDeleting={deletingPaymentMethod === method.id}
                      />
                    ))}
                    <Button 
                      onClick={() => setShowUpdatePaymentModal(true)}
                      variant="outline"
                      className="w-full"
                    >
                      Adicionar Novo Cartão
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Nenhum método de pagamento cadastrado
                    </p>
                    <Button 
                      onClick={() => setShowUpdatePaymentModal(true)}
                      variant="outline"
                    >
                      Adicionar Primeiro Cartão
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Invoices */}
            <SubscriptionInvoices />
          </TabsContent>

          <TabsContent value="bank-details" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building />Dados Bancários
                </CardTitle>
                <CardDescription>Configure sua conta bancária para recebimento dos valores do programa de indicação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input 
                      placeholder="Ex: Banco do Brasil" 
                      value={settings.banco || ''} 
                      onChange={(e) => handleSettingsChange('banco', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input 
                      placeholder="Ex: 1234" 
                      value={settings.agencia || ''} 
                      onChange={(e) => handleSettingsChange('agencia', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input 
                      placeholder="Ex: 12345-6" 
                      value={settings.conta || ''} 
                      onChange={(e) => handleSettingsChange('conta', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <Select 
                      value={settings.tipo_conta || ''} 
                      onValueChange={(v) => handleSettingsChange('tipo_conta', v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>CPF/CNPJ</Label>
                    <Input 
                      placeholder="000.000.000-00" 
                      value={settings.cpf_cnpj || ''} 
                      onChange={(e) => handleSettingsChange('cpf_cnpj', e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Importante</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Estes dados serão utilizados exclusivamente para o repasse dos valores do programa de indicação. 
                    Certifique-se de que as informações estão corretas.
                  </p>
                </div>
                
                <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Dados Bancários'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell/>Preferências de Notificação
                </CardTitle>
                <CardDescription>Configure como e quando receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-medium">Notificações por E-mail</h4>
                       <p className="text-sm text-muted-foreground">Receber avisos sobre agendamentos por e-mail</p>
                     </div>
                     <div className="flex gap-2">
                       <Switch 
                         checked={settings.notificacao_email ?? false} 
                         onCheckedChange={(c) => handleSettingsChange('notificacao_email', c)} 
                       />
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setShowNotificationModal({ type: 'email', title: 'Notificações por E-mail' })}
                       >
                         Configurar
                       </Button>
                     </div>
                   </div>
                   <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-medium">Notificações WhatsApp</h4>
                       <p className="text-sm text-muted-foreground">Enviar lembretes por WhatsApp</p>
                     </div>
                     <div className="flex gap-2">
                       <Switch 
                         checked={settings.notificacao_whatsapp ?? false} 
                         onCheckedChange={(c) => handleSettingsChange('notificacao_whatsapp', c)} 
                       />
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setShowNotificationModal({ type: 'whatsapp', title: 'Notificações WhatsApp' })}
                       >
                         Configurar
                       </Button>
                     </div>
                   </div>
                   <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-medium">Lembrete de Sessão</h4>
                       <p className="text-sm text-muted-foreground">Notificar 24h antes da sessão</p>
                     </div>
                     <div className="flex gap-2">
                       <Switch 
                         checked={settings.lembrete_24h ?? false} 
                         onCheckedChange={(c) => handleSettingsChange('lembrete_24h', c)} 
                       />
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setShowNotificationModal({ type: 'reminder', title: 'Lembrete de Sessão' })}
                       >
                         Configurar
                       </Button>
                     </div>
                   </div>
                   <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-medium">Relatórios Semanais</h4>
                       <p className="text-sm text-muted-foreground">Resumo semanal de atividades</p>
                     </div>
                     <div className="flex gap-2">
                       <Switch 
                         checked={settings.relatorio_semanal ?? false} 
                         onCheckedChange={(c) => handleSettingsChange('relatorio_semanal', c)} 
                       />
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setShowNotificationModal({ type: 'reports', title: 'Relatórios Semanais' })}
                       >
                         Configurar
                       </Button>
                     </div>
                   </div>
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Contatos dos Pacientes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail de Contato</Label>
                      <Input 
                        placeholder="contato@clinica.com" 
                        value={settings.email_contato_pacientes || ''} 
                        onChange={(e) => handleSettingsChange('email_contato_pacientes', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp Business</Label>
                      <Input 
                        placeholder="(11) 99999-9999" 
                        value={settings.whatsapp_contato_pacientes || ''} 
                        onChange={(e) => handleSettingsChange('whatsapp_contato_pacientes', e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Preferências'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showNotificationModal && (
          <NotificationSettings
            open={!!showNotificationModal}
            onOpenChange={(open) => !open && setShowNotificationModal(null)}
            type={showNotificationModal.type}
            title={showNotificationModal.title}
          />
        )}
        
        <UpdatePaymentMethodModal
          open={showUpdatePaymentModal}
          onOpenChange={setShowUpdatePaymentModal}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </Layout>
  )
}

export default Configuracoes