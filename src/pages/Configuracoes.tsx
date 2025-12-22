import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { User, Bell, CreditCard, Save, Building, Trash2, Shield, Palette, Loader2, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasswordRequirements } from "@/components/PasswordRequirements"
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
import { PaymentMethodCard } from "@/components/PaymentMethodCard"
import { UpdatePaymentMethodModal } from "@/components/UpdatePaymentMethodModal"
import { SubscriptionInvoices } from "@/components/SubscriptionInvoices"
import { SubscriptionInfo } from "@/components/SubscriptionInfo"
import { TwoFactorSettings } from "@/components/TwoFactorSettings"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ColorPicker } from "@/components/ColorPicker"
import { useColorTheme } from "@/hooks/useColorTheme"
import { ProfileAvatarUpload } from "@/components/ProfileAvatarUpload"
import { formatPhone, formatCRP, formatCRM, validatePassword } from "@/utils/inputMasks"
import { EncryptionAuditReport } from "@/components/EncryptionAuditReport"
import { cleanupInvalidSession } from "@/utils/sessionCleanup"
import { useNavigate } from "react-router-dom"
import { useGoogleCalendarBackgroundSync } from "@/hooks/useGoogleCalendarBackgroundSync"
import { useNotificationSound, playNotificationSound } from "@/hooks/useNotificationSound"
import { useNotifications } from "@/hooks/useNotifications"
import { Volume2, VolumeX } from "lucide-react"

type AllSettings = Record<string, any>;

const Configuracoes = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { applyBrandColor, saveBrandColor } = useColorTheme()
  const { isAutoSyncEnabled, toggleAutoSync, isSyncing, lastSyncResult, manualSync } = useGoogleCalendarBackgroundSync()
  const { soundEnabled, setSoundEnabled } = useNotificationSound()
  const { createNotification } = useNotifications()
  const [settings, setSettings] = useState<AllSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false)
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false)
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState('')
  const [pendingNewPassword, setPendingNewPassword] = useState('')
  const [emailChangePassword, setEmailChangePassword] = useState('')
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  
  // Ler tab da URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['profile', 'security', 'preferences', 'platform-payments', 'bank-details', 'notifications'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

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

  const handleAvatarChange = async (avatarPath: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarPath })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, avatar_url: avatarPath }));
      
      // Force page reload to update all avatar instances
      window.location.reload();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto.",
        variant: "destructive",
      });
    }
  };

  const handlePhoneChange = (value: string) => {
    handleSettingsChange('telefone', formatPhone(value));
  };

  const handleCRPChange = (value: string) => {
    handleSettingsChange('crp', formatCRP(value));
  };

  const handleCRMChange = (value: string) => {
    handleSettingsChange('crp', formatCRM(value));
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos de senha",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (!validatePassword(newPassword)) {
      toast({
        title: "Senha inválida",
        description: "A senha deve atender a todos os requisitos de segurança",
        variant: "destructive"
      });
      return;
    }

    // Armazenar a senha atual e mostrar dialog de confirmação
    setPendingNewPassword(newPassword);
    setShowPasswordChangeDialog(true);
  };

  const confirmPasswordChange = async () => {
    setChangingPassword(true);
    try {
      // Primeiro, validar a senha atual tentando fazer reauthentication
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (authError) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta",
          variant: "destructive"
        });
        return;
      }

      // Se a validação passou, atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: pendingNewPassword
      });

      if (updateError) throw updateError;

      // Enviar notificação de segurança por email
      try {
        await supabase.functions.invoke('send-security-notification', {
          body: {
            email: user?.email,
            type: 'password_changed',
            userName: settings.nome
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar notificação de segurança:', emailError);
        // Não bloquear a operação se o email falhar
      }

      toast({
        title: "Senha alterada com sucesso!",
        description: "Você será redirecionado para fazer login novamente"
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordChangeDialog(false);

      // Aguardar 2 segundos para o usuário ver a mensagem
      setTimeout(async () => {
        await cleanupInvalidSession('Mudança de senha');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha",
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail) {
      toast({
        title: "Erro",
        description: "Digite o novo e-mail",
        variant: "destructive"
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Erro",
        description: "Digite um e-mail válido",
        variant: "destructive"
      });
      return;
    }

    // Mostrar dialog de confirmação
    setPendingNewEmail(newEmail);
    setShowEmailChangeDialog(true);
  };

  const confirmEmailChange = async () => {
    if (!pendingNewEmail || !emailChangePassword) {
      toast({
        title: "Erro",
        description: "Digite sua senha para confirmar",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    const oldEmail = user?.email || '';
    
    try {
      // Chamar edge function para iniciar processo de mudança de email (com verificação de senha)
      const { data, error } = await supabase.functions.invoke('request-email-change', {
        body: {
          new_email: pendingNewEmail,
          user_name: settings.nome,
          password: emailChangePassword
        }
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao solicitar mudança de email');
      }

      toast({
        title: "E-mail de confirmação enviado",
        description: "Você será deslogado. Verifique seu novo e-mail para confirmar a alteração.",
      });

      setNewEmail('');
      setEmailChangePassword('');
      setShowEmailChangeDialog(false);

      // Marcar que está em processo de mudança de email
      sessionStorage.setItem('IS_EMAIL_CHANGE_PENDING', 'true');

      // Deslogar e redirecionar para página de confirmação
      await supabase.auth.signOut();
      navigate(`/email-change-confirmation?email=${encodeURIComponent(pendingNewEmail)}`);
    } catch (error: any) {
      toast({
        title: "Erro ao alterar e-mail",
        description: error.message,
        variant: "destructive"
      });
      setEmailChangePassword('');
      setShowEmailChangeDialog(false);
    } finally {
      setIsLoading(false);
    }
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

    if (!deleteAccountPassword) {
      toast({
        title: "Senha necessária",
        description: "Digite sua senha para confirmar a exclusão",
        variant: "destructive"
      })
      return
    }

    setIsDeletingAccount(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: {
          password: deleteAccountPassword
        }
      })
      
      if (error) throw error

      if (!data?.success) {
        if (data?.errorType === 'INVALID_PASSWORD') {
          throw new Error('Senha incorreta. Verifique sua senha e tente novamente.')
        }
        throw new Error(data?.error || 'Não foi possível deletar a conta')
      }

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
      setDeleteAccountPassword('')
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
          <TabsList className="w-full h-auto flex-wrap gap-1 p-1 md:grid md:grid-cols-6">
            <TabsTrigger value="profile" className="text-xs md:text-sm px-2 py-1.5">Perfil</TabsTrigger>
            <TabsTrigger value="security" className="text-xs md:text-sm px-2 py-1.5">Segurança</TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs md:text-sm px-2 py-1.5">Preferências</TabsTrigger>
            <TabsTrigger value="platform-payments" className="text-xs md:text-sm px-2 py-1.5">Assinatura</TabsTrigger>
            <TabsTrigger value="bank-details" className="text-xs md:text-sm px-2 py-1.5">Dados Bancários</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs md:text-sm px-2 py-1.5">Notificações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            {/* Foto de Perfil */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User />Foto de Perfil
                </CardTitle>
                <CardDescription>Atualize sua foto de perfil</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <ProfileAvatarUpload
                  userName={settings.nome || "Usuário"}
                  currentAvatarUrl={settings.avatar_url || ""}
                  onAvatarChange={handleAvatarChange}
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Dados Pessoais */}
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={settings.email || ''} disabled />
                    <p className="text-xs text-muted-foreground">
                      Para alterar seu e-mail, vá para a aba "Segurança"
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input 
                      type="tel" 
                      value={settings.telefone || ''} 
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  {settings.profissao === 'psicologo' && (
                    <div className="space-y-2">
                      <Label>CRP</Label>
                      <Input 
                        value={settings.crp || ''} 
                        onChange={(e) => handleCRPChange(e.target.value)}
                        placeholder="00/00000"
                      />
                    </div>
                  )}
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
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  E-mail da Conta
                </CardTitle>
                <CardDescription>Altere o e-mail da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>E-mail Atual</Label>
                  <Input type="email" value={settings.email || ''} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label>Novo E-mail</Label>
                  <Input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Digite o novo e-mail"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você receberá um e-mail de verificação no novo endereço
                  </p>
                </div>
                
                <Button 
                  onClick={handleEmailChange} 
                  disabled={isLoading || !newEmail}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Alterar E-mail
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>Atualize sua senha de acesso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    autoComplete="current-password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                  />
                  {newPassword && <PasswordRequirements password={newPassword} />}
                </div>
                
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input 
                    type="password" 
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    autoComplete="new-password"
                  />
                </div>
                
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Autenticação em Dois Fatores
                </CardTitle>
                <CardDescription>Configure a segurança adicional da sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <TwoFactorSettings />
              </CardContent>
            </Card>
            
            <Card className="border-destructive shadow-soft">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Zona de Perigo
                </CardTitle>
                <CardDescription>Ações irreversíveis da conta</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  Deletar Conta Permanentemente
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Preferências
                </CardTitle>
                <CardDescription>Personalize a aparência da plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Modo Escuro/Claro</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Altere o tema da plataforma
                  </p>
                  <ThemeToggle />
                </div>
                
                <div className="space-y-2">
                  <Label>Cor da Plataforma</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Personalize a cor principal da plataforma
                  </p>
                  <div>
                    <Button variant="outline" onClick={() => setShowColorPicker(true)} className="w-full sm:w-[200px] h-10 justify-start gap-2">
                      <Palette className="w-4 h-4" />
                      Personalizar Cores
                    </Button>
                  </div>
                </div>
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
                {/* 1. Assinatura */}
                <SubscriptionInfo />

                {settings.subscription_plan && settings.subscription_plan !== 'basico' && (
                  <>
                    {/* 2. Métodos de Pagamento */}
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

                    {/* 3. Histórico de Faturas */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Histórico de Cobranças</h3>
                      <SubscriptionInvoices />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {showUpdatePaymentModal && (
              <UpdatePaymentMethodModal
                open={showUpdatePaymentModal}
                onOpenChange={setShowUpdatePaymentModal}
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
                  Estes dados são usados exclusivamente para pagamentos do programa de indicação
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
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell /> Notificações
                </CardTitle>
                <CardDescription>Configure como deseja receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Som de Notificação */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        Som de Notificação
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Tocar um som quando novas notificações chegarem
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playNotificationSound()}
                        className="text-xs"
                      >
                        Testar Som
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const success = await createNotification(
                            'Teste de Notificação',
                            'Esta é uma notificação de teste para verificar a animação.'
                          )
                          if (success) {
                            toast({ title: 'Notificação de teste criada', description: 'Verifique o sininho para ver a animação.' })
                          }
                        }}
                        className="text-xs"
                      >
                        Testar Animação
                      </Button>
                      <Switch
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações por E-mail</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba notificações sobre sessões e lembretes por e-mail
                      </p>
                    </div>
                    <Switch
                      checked={settings.notificacao_email || false}
                      onCheckedChange={(checked) => handleSettingsChange('notificacao_email', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações por WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba notificações sobre sessões e lembretes por WhatsApp
                      </p>
                    </div>
                    <Switch
                      checked={settings.notificacao_whatsapp || false}
                      onCheckedChange={(checked) => handleSettingsChange('notificacao_whatsapp', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Lembrete 24h antes</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar lembrete automático 24h antes das sessões
                      </p>
                    </div>
                    <Switch
                      checked={settings.lembrete_24h || false}
                      onCheckedChange={(checked) => handleSettingsChange('lembrete_24h', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Relatório Semanal</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber resumo semanal de suas atividades
                      </p>
                    </div>
                    <Switch
                      checked={settings.relatorio_semanal || false}
                      onCheckedChange={(checked) => handleSettingsChange('relatorio_semanal', checked)}
                    />
                  </div>

                  {/* Google Calendar Sync - dentro do card de notificações */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          Sincronização Google Calendar
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Verifica conflitos e eventos cancelados a cada 15 minutos
                        </p>
                      </div>
                      <Switch
                        checked={isAutoSyncEnabled}
                        onCheckedChange={toggleAutoSync}
                        disabled={!localStorage.getItem('google_access_token')}
                      />
                    </div>

                    {!localStorage.getItem('google_access_token') && (
                      <p className="text-sm text-muted-foreground italic mt-2">
                        Conecte-se ao Google Calendar na página de Integrações para ativar esta funcionalidade.
                      </p>
                    )}

                    {lastSyncResult && (
                      <div className="p-3 bg-muted rounded-lg text-sm mt-3">
                        <p className="font-medium mb-1">Última sincronização:</p>
                        <p className="text-muted-foreground">
                          {lastSyncResult.timestamp.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-muted-foreground">
                          {lastSyncResult.mirroredUpdated} atualizada(s), {lastSyncResult.conflicts} conflito(s), {lastSyncResult.cancelled} cancelada(s)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente sua conta
              e remover todos os seus dados dos nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Digite sua senha</Label>
              <Input
                type="password"
                value={deleteAccountPassword}
                onChange={(e) => setDeleteAccountPassword(e.target.value)}
                placeholder="Senha"
              />
            </div>
            <div className="space-y-2">
              <Label>Digite DELETAR para confirmar</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETAR"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmText('')
              setDeleteAccountPassword('')
            }}>
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

      <UpdatePaymentMethodModal 
        open={showUpdatePaymentModal}
        onOpenChange={setShowUpdatePaymentModal}
        onSuccess={handlePaymentSuccess}
      />

      {showColorPicker && (
        <ColorPicker
          open={showColorPicker}
          onOpenChange={setShowColorPicker}
          currentColor={settings.brand_color}
          onSaveColor={async (color) => {
            const success = await saveBrandColor(color)
            if (success) {
              handleSettingsChange('brand_color', color)
              applyBrandColor(color)
            }
            return success
          }}
        />
      )}

      {/* Dialog de confirmação de mudança de email */}
      <AlertDialog open={showEmailChangeDialog} onOpenChange={setShowEmailChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de e-mail</AlertDialogTitle>
            <AlertDialogDescription>
              Ao prosseguir com a alteração do e-mail, você será deslogado da plataforma e precisará confirmar o novo e-mail através do link enviado. Após a confirmação, será necessário fazer login novamente com os novos dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Digite sua senha para confirmar</Label>
            <Input
              type="password"
              value={emailChangePassword}
              onChange={(e) => setEmailChangePassword(e.target.value)}
              placeholder="Senha"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmailChangePassword('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmailChange} disabled={isLoading || !emailChangePassword}>
              {isLoading ? 'Processando...' : 'Continuar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de mudança de senha */}
      <AlertDialog open={showPasswordChangeDialog} onOpenChange={setShowPasswordChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de senha</AlertDialogTitle>
            <AlertDialogDescription>
              Ao prosseguir com a alteração da senha, você será deslogado da plataforma e precisará fazer login novamente com a nova senha. 
              Esta ação não pode ser desfeita e você precisará da nova senha para acessar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCurrentPassword('');
              setPendingNewPassword('');
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPasswordChange} disabled={changingPassword}>
              {changingPassword ? 'Processando...' : 'Confirmar e Deslogar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default Configuracoes