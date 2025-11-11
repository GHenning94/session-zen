import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { User, Bell, CreditCard, Save, Building, ExternalLink, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { NotificationSettings } from "@/components/notifications/NotificationSettings"
import { PaymentMethodCard } from "@/components/PaymentMethodCard"
import { UpdatePaymentMethodModal } from "@/components/UpdatePaymentMethodModal"
import { SubscriptionInvoices } from "@/components/SubscriptionInvoices"
import { SubscriptionInfo } from "@/components/SubscriptionInfo"

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const loadPaymentMethods = async () => {
    if (!user) return;
    
    try {
      setLoadingPayments(true);
      const { data, error } = await supabase.functions.invoke('get-payment-methods');
      
      if (error) {
        console.warn('[Configuracoes] Could not load payment methods:', error);
        setPaymentMethods([]);
        return;
      }
      
      setPaymentMethods(data.paymentMethods || []);
    } catch (error: any) {
      console.error('[Configuracoes] Error loading payment methods:', error);
      
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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, nome, profissao, especialidade, bio, crp, telefone, avatar_url, public_avatar_url, subscription_plan, billing_interval, created_at, updated_at')
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
  
  useEffect(() => {
    const loadPaymentMethodsIfSubscribed = async () => {
      if (activeTab === 'platform-payments' && user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_plan')
            .eq('user_id', user.id)
            .single();
          
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETAR') {
      toast({
        title: "Confirmação necessária",
        description: "Digite DELETAR para confirmar a exclusão da conta",
        variant: "destructive"
      })
      return
    }

    setIsDeletingAccount(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account')
      
      if (error) throw error

      localStorage.clear()
      sessionStorage.clear()
      supabase.removeAllChannels()
      
      await supabase.auth.signOut()
      
      toast({
        title: "Conta deletada",
        description: "Sua conta foi permanentemente deletada",
      })
      
      window.location.href = '/'
    } catch (error: any) {
      console.error('Erro ao deletar conta:', error)
      toast({
        title: "Erro ao deletar conta",
        description: error.message || "Não foi possível deletar a conta",
        variant: "destructive"
      })
    } finally {
      setIsDeletingAccount(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
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
                      type="tel" 
                      value={settings.telefone || ''} 
                      onChange={(e) => handleSettingsChange('telefone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CRP</Label>
                    <Input 
                      value={settings.crp || ''} 
                      onChange={(e) => handleSettingsChange('crp', e.target.value)}
                      placeholder="00/00000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
                    <Input 
                      value={settings.especialidade || ''} 
                      onChange={(e) => handleSettingsChange('especialidade', e.target.value)}
                      placeholder="Ex: Terapia Cognitivo-Comportamental"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Biografia</Label>
                  <Textarea 
                    value={settings.bio || ''} 
                    onChange={(e) => handleSettingsChange('bio', e.target.value)}
                    placeholder="Conte um pouco sobre você e sua experiência profissional..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>

            {/* Zona de Perigo */}
            <Card className="border-destructive shadow-soft">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Zona de Perigo
                </CardTitle>
                <CardDescription>
                  Ações irreversíveis da conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Deletar Conta Permanentemente
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="platform-payments" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard /> Assinatura e Pagamentos
                </CardTitle>
                <CardDescription>Gerencie sua assinatura e métodos de pagamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informações da Assinatura */}
                <SubscriptionInfo />

                {/* Faturas (apenas para planos pagos) */}
                {settings.subscription_plan && settings.subscription_plan !== 'basico' && (
                  <>
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Histórico de Faturas</h3>
                      <SubscriptionInvoices />
                    </div>

                    {/* Métodos de Pagamento */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Métodos de Pagamento</h3>
                        <Button
                          onClick={() => setShowUpdatePaymentModal(true)}
                          variant="outline"
                          size="sm"
                        >
                          Adicionar Cartão
                        </Button>
                      </div>

                      {loadingPayments ? (
                        <p className="text-sm text-muted-foreground">Carregando...</p>
                      ) : paymentMethods.length > 0 ? (
                        <div className="grid gap-4">
                          {paymentMethods.map((pm) => (
                            <PaymentMethodCard
                              key={pm.id}
                              paymentMethod={pm}
                              onSetDefault={() => handleSetDefaultPaymentMethod(pm.id)}
                              onDelete={() => handleDeletePaymentMethod(pm.id)}
                              isDeleting={deletingPaymentMethod === pm.id}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum método de pagamento cadastrado
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Modal de atualização de pagamento */}
            {showUpdatePaymentModal && (
              <UpdatePaymentMethodModal
                isOpen={showUpdatePaymentModal}
                onClose={() => setShowUpdatePaymentModal(false)}
                onSuccess={handlePaymentSuccess}
              />
            )}
          </TabsContent>

          <TabsContent value="bank-details" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building /> Dados Bancários
                </CardTitle>
                <CardDescription>
                  Informações para recebimento de pagamentos dos seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input
                      value={settings.banco || ''}
                      onChange={(e) => handleSettingsChange('banco', e.target.value)}
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input
                      value={settings.agencia || ''}
                      onChange={(e) => handleSettingsChange('agencia', e.target.value)}
                      placeholder="0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input
                      value={settings.conta || ''}
                      onChange={(e) => handleSettingsChange('conta', e.target.value)}
                      placeholder="00000-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <Select
                      value={settings.tipo_conta || ''}
                      onValueChange={(v) => handleSettingsChange('tipo_conta', v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca">Conta Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>CPF/CNPJ</Label>
                    <Input
                      value={settings.cpf_cnpj || ''}
                      onChange={(e) => handleSettingsChange('cpf_cnpj', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Dados Bancários
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente sua conta
              e remover todos os seus dados dos nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Digite DELETAR para confirmar</Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETAR"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAccount ? 'Deletando...' : 'Deletar Conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default Configuracoes