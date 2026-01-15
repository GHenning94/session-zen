import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { Badge } from "@/components/ui/badge"
import { User, Bell, CreditCard, Save, Building, Trash2, Shield, Palette, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Lock, Crown } from "lucide-react"
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
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { PaymentMethodCard } from "@/components/PaymentMethodCard"
import { UpdatePaymentMethodModal } from "@/components/UpdatePaymentMethodModal"
import { SubscriptionInvoices } from "@/components/SubscriptionInvoices"
import { SubscriptionInfo } from "@/components/SubscriptionInfo"
import { TwoFactorSettings } from "@/components/TwoFactorSettings"
import { useTheme } from "next-themes"
import { useUserTheme } from "@/hooks/useUserTheme"
import { Sun, Moon } from "lucide-react"
import { ColorPicker } from "@/components/ColorPicker"
import { useColorTheme } from "@/hooks/useColorTheme"
import { ProfileAvatarUpload } from "@/components/ProfileAvatarUpload"
import { formatPhone, formatCRP, formatCRM, validatePassword, formatCPFCNPJ, validateCPFCNPJ, formatPixKey, detectPixKeyType } from "@/utils/inputMasks"
import { BRAZILIAN_BANKS, formatAgencia, formatConta } from "@/utils/brazilianBanks"
import { EncryptionAuditReport } from "@/components/EncryptionAuditReport"
import { encryptSensitiveData, decryptSensitiveData } from "@/utils/encryptionMiddleware"
import { cleanupInvalidSession } from "@/utils/sessionCleanup"
import { useNavigate } from "react-router-dom"
import { useGoogleCalendarBackgroundSync } from "@/hooks/useGoogleCalendarBackgroundSync"
import { useNotificationSound, playNotificationSound } from "@/hooks/useNotificationSound"
import { useNotifications } from "@/hooks/useNotifications"
import { Volume2, VolumeX } from "lucide-react"
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { UpgradeModal } from "@/components/UpgradeModal"
import { NewFeatureBadge } from "@/components/NewFeatureBadge"

type AllSettings = Record<string, any>;

// Componente de seleção de tema com dois botões separados
const ThemeSelector = () => {
  const { theme, setTheme } = useTheme()
  const { saveThemePreference } = useUserTheme()
  const { user } = useAuth()
  const [isChanging, setIsChanging] = useState(false)

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    if (theme === newTheme || isChanging) return // Não fazer nada se já está no tema ou está mudando
    
    const root = document.documentElement
    
    // Captura as cores computadas atuais antes de qualquer mudança
    const bodyStyle = window.getComputedStyle(document.body)
    const bgColor = bodyStyle.backgroundColor
    const fgColor = bodyStyle.color
    
    // Congela as cores do overlay para evitar piscada durante a transição
    root.style.setProperty('--transition-bg', bgColor)
    root.style.setProperty('--transition-fg', fgColor)
    
    // Ativa o overlay ANTES de trocar o tema
    root.classList.add('theme-transitioning')
    setIsChanging(true)

    // Troca o tema no próximo frame, garantindo que o overlay já está ativo
    requestAnimationFrame(() => {
      setTheme(newTheme)
      saveThemePreference(newTheme)
      
      // Atualizar cache local imediatamente para evitar flash ao recarregar
      if (user) {
        localStorage.setItem(`user-theme-cache_${user.id}`, newTheme)
      }
      
      // Remove o overlay depois que o novo tema foi aplicado
      setTimeout(() => {
        root.classList.remove('theme-transitioning')
        root.style.removeProperty('--transition-bg')
        root.style.removeProperty('--transition-fg')
        setIsChanging(false)
      }, 300)
    })
  }

  return (
    <div className="space-y-2">
      <Label>Tema de Cores</Label>
      <p className="text-sm text-muted-foreground mb-2">
        Altere o tema da plataforma
      </p>
      <div className="flex gap-3">
        <Button
          variant={theme === "light" ? "default" : "outline"}
          size="sm"
          className="w-[120px]"
          onClick={() => handleThemeChange("light")}
          disabled={isChanging}
        >
          <Sun className="h-4 w-4 mr-2" />
          Claro
        </Button>
        <Button
          variant={theme === "dark" ? "default" : "outline"}
          size="sm"
          className="w-[120px]"
          onClick={() => handleThemeChange("dark")}
          disabled={isChanging}
        >
          <Moon className="h-4 w-4 mr-2" />
          Escuro
        </Button>
      </div>
    </div>
  )
}

const Configuracoes = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { hasAccessToFeature, currentPlan } = useSubscription()
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
  const [showColorUpgradeModal, setShowColorUpgradeModal] = useState(false)
  const [showPremiumUpgradeModal, setShowPremiumUpgradeModal] = useState(false)
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
  const [passwordChangeCaptchaToken, setPasswordChangeCaptchaToken] = useState<string | null>(null)
  const passwordCaptchaRef = useRef<TurnstileInstance>(null)
  const [emailChangeCaptchaToken, setEmailChangeCaptchaToken] = useState<string | null>(null)
  const emailCaptchaRef = useRef<TurnstileInstance>(null)
  const [cpfCnpjValid, setCpfCnpjValid] = useState<boolean | null>(null)
  const [savingBankDetails, setSavingBankDetails] = useState(false)
  
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
        .select('id, user_id, nome, profissao, especialidade, bio, crp, telefone, avatar_url, public_avatar_url, subscription_plan, billing_interval, created_at, updated_at, banco, agencia, conta, tipo_conta, cpf_cnpj, tipo_pessoa, nome_titular, chave_pix, bank_details_validated')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) throw profileError;

      // CORREÇÃO: Descriptografar dados sensíveis do perfil
      const decryptedProfileData = await decryptSensitiveData('profiles', profileData);

      const { data: configData, error: configError } = await supabase.from('configuracoes').select('*').eq('user_id', user.id).single();
      if (configError && configError.code !== 'PGRST116') throw configError;
      
      // CORREÇÃO: Descriptografar dados de configuração se existirem
      const decryptedConfigData = configData 
        ? await decryptSensitiveData('configuracoes', configData) 
        : {};
      
      const allSettings = { ...decryptedProfileData, ...decryptedConfigData, email: user.email || '' };
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
    if (!passwordChangeCaptchaToken) {
      toast({
        title: "Erro",
        description: "Por favor, complete a verificação de segurança",
        variant: "destructive"
      });
      return;
    }

    setChangingPassword(true);
    try {
      // Primeiro, validar a senha atual tentando fazer reauthentication
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
        options: {
          captchaToken: passwordChangeCaptchaToken
        }
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
      setPasswordChangeCaptchaToken(null);
      passwordCaptchaRef.current?.reset();

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

    if (!emailChangeCaptchaToken) {
      toast({
        title: "Erro",
        description: "Por favor, complete a verificação de segurança",
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
      setEmailChangeCaptchaToken(null);
      emailCaptchaRef.current?.reset();

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
      
      // Encrypt sensitive profile fields before saving
      const encryptedProfileData = await encryptSensitiveData('profiles', profileData);
      
      const { error: profileError } = await supabase.from('profiles').update(encryptedProfileData).eq('user_id', user.id);
      if (profileError) throw profileError;
      
      if (Object.keys(configData).length > 0) {
        // Encrypt sensitive config fields before saving
        const encryptedConfigData = await encryptSensitiveData('configuracoes', configData);
        const { error: configError } = await supabase.from('configuracoes').upsert({ user_id: user.id, ...encryptedConfigData });
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
                <Button onClick={handleSave} disabled={isLoading} size="sm" className="bg-gradient-primary hover:opacity-90">
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
                  size="sm"
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
                    autoComplete="off"
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
                  size="sm"
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
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
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
                <ThemeSelector />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Cor da Plataforma</Label>
                    {!hasAccessToFeature('color_customization') && (
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Personalize a cor principal da plataforma
                  </p>
                  <div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (hasAccessToFeature('color_customization')) {
                          setShowColorPicker(true)
                        } else {
                          setShowColorUpgradeModal(true)
                        }
                      }} 
                      className="w-full sm:w-[240px] h-10 justify-start gap-2"
                    >
                      <Palette className="w-4 h-4" />
                      Personalizar Cores
                      {!hasAccessToFeature('color_customization') && (
                        <Lock className="w-4 h-4 ml-auto" />
                      )}
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

          </TabsContent>

          <TabsContent value="bank-details" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building /> Dados Bancários
                  {settings.bank_details_validated && (
                    <span className="flex items-center gap-1 text-sm font-normal text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4" />
                      Validado
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Estes dados são usados exclusivamente para pagamentos do programa de indicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Tipo de Pessoa */}
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <Select
                    value={settings.tipo_pessoa ?? undefined}
                    onValueChange={(v) => {
                      handleSettingsChange('tipo_pessoa', v);
                      handleSettingsChange('cpf_cnpj', '');
                      setCpfCnpjValid(null);
                      handleSettingsChange('bank_data_confirmed', false);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo de pessoa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CPF/CNPJ com validação em tempo real */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {settings.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}
                    {cpfCnpjValid === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {cpfCnpjValid === false && <XCircle className="w-4 h-4 text-destructive" />}
                  </Label>
                  <Input
                    value={settings.cpf_cnpj ?? ''}
                    onChange={(e) => {
                      const formatted = formatCPFCNPJ(e.target.value);
                      handleSettingsChange('cpf_cnpj', formatted);
                      handleSettingsChange('bank_data_confirmed', false);
                      
                      const cleaned = formatted.replace(/\D/g, '');
                      if (settings.tipo_pessoa === 'fisica' && cleaned.length === 11) {
                        setCpfCnpjValid(validateCPFCNPJ(formatted));
                      } else if (settings.tipo_pessoa === 'juridica' && cleaned.length === 14) {
                        setCpfCnpjValid(validateCPFCNPJ(formatted));
                      } else {
                        setCpfCnpjValid(null);
                      }
                    }}
                    placeholder={settings.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                    maxLength={settings.tipo_pessoa === 'juridica' ? 18 : 14}
                    className={cpfCnpjValid === false ? 'border-destructive focus-visible:ring-destructive' : cpfCnpjValid === true ? 'border-green-500 focus-visible:ring-green-500' : ''}
                    autoComplete="new-password"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    name={`cpf_cnpj_nofill_${Date.now()}`}
                  />
                  {cpfCnpjValid === false && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {settings.tipo_pessoa === 'juridica' ? 'CNPJ inválido' : 'CPF inválido'}
                    </p>
                  )}
                </div>

                {/* Nome do Titular */}
                <div className="space-y-2">
                  <Label>Nome do Titular</Label>
                  <Input
                    value={settings.nome_titular ?? ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 100);
                      handleSettingsChange('nome_titular', value);
                      handleSettingsChange('bank_data_confirmed', false);
                    }}
                    placeholder={settings.tipo_pessoa === 'juridica' ? 'Razão Social' : 'Nome completo conforme documento'}
                    maxLength={100}
                    autoComplete="new-password"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    name={`nome_titular_nofill_${Date.now()}`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Select
                      value={settings.banco ?? undefined}
                      onValueChange={(v) => {
                        handleSettingsChange('banco', v);
                        handleSettingsChange('bank_data_confirmed', false);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {BRAZILIAN_BANKS.map((bank) => (
                          <SelectItem key={bank.code} value={`${bank.code} - ${bank.name}`}>
                            {bank.code} - {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input
                      value={settings.agencia ?? ''}
                      onChange={(e) => {
                        const formatted = formatAgencia(e.target.value);
                        handleSettingsChange('agencia', formatted);
                        handleSettingsChange('bank_data_confirmed', false);
                      }}
                      placeholder="0000"
                      maxLength={5}
                      inputMode="numeric"
                      autoComplete="new-password"
                      data-form-type="other"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      name={`agencia_nofill_${Date.now()}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input
                      value={settings.conta ?? ''}
                      onChange={(e) => {
                        const formatted = formatConta(e.target.value);
                        handleSettingsChange('conta', formatted);
                        handleSettingsChange('bank_data_confirmed', false);
                      }}
                      placeholder="00000000-0"
                      maxLength={15}
                      inputMode="numeric"
                      autoComplete="new-password"
                      data-form-type="other"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      name={`conta_nofill_${Date.now()}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <Select
                      value={settings.tipo_conta ?? undefined}
                      onValueChange={(v) => {
                        handleSettingsChange('tipo_conta', v);
                        handleSettingsChange('bank_data_confirmed', false);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca">Conta Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Chave PIX */}
                <div className="space-y-2">
                  <Label>Chave PIX (opcional)</Label>
                  <Input
                    value={settings.chave_pix ?? ''}
                    onChange={(e) => {
                      const formatted = formatPixKey(e.target.value);
                      handleSettingsChange('chave_pix', formatted);
                      handleSettingsChange('bank_data_confirmed', false);
                    }}
                    placeholder="E-mail, telefone, CPF/CNPJ ou chave aleatória"
                    maxLength={77}
                    autoComplete="new-password"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    name={`chave_pix_nofill_${Date.now()}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {settings.chave_pix ? (
                      <>
                        Tipo detectado: {' '}
                        <span className="font-medium">
                          {detectPixKeyType(settings.chave_pix) === 'email' && 'E-mail'}
                          {detectPixKeyType(settings.chave_pix) === 'phone' && 'Telefone'}
                          {detectPixKeyType(settings.chave_pix) === 'cpf' && 'CPF'}
                          {detectPixKeyType(settings.chave_pix) === 'cnpj' && 'CNPJ'}
                          {detectPixKeyType(settings.chave_pix) === 'random' && 'Chave Aleatória'}
                          {detectPixKeyType(settings.chave_pix) === 'unknown' && 'Formato não reconhecido'}
                        </span>
                      </>
                    ) : (
                      'Se preenchido, a chave PIX será usada preferencialmente para pagamentos'
                    )}
                  </p>
                </div>

                {/* Checkbox de confirmação obrigatório */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                  <input
                    type="checkbox"
                    id="bank_data_confirmed"
                    checked={settings.bank_data_confirmed === true}
                    onChange={(e) => handleSettingsChange('bank_data_confirmed', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="bank_data_confirmed" className="text-sm text-foreground cursor-pointer">
                    <span className="font-medium">Confirmo que os dados bancários informados são da minha titularidade</span>
                    <span className="block text-muted-foreground mt-1">
                      Declaro que sou o titular da conta bancária informada e que os dados estão corretos. 
                      Estou ciente de que pagamentos não serão realizados para contas de terceiros.
                    </span>
                  </label>
                </div>

                <Button 
                  onClick={async () => {
                    if (!user) return;
                    
                    // Validar campos obrigatórios
                    if (!settings.tipo_pessoa) {
                      toast({ title: "Selecione o tipo de pessoa", variant: "destructive" });
                      return;
                    }
                    if (!settings.cpf_cnpj || cpfCnpjValid === false) {
                      toast({ title: settings.tipo_pessoa === 'juridica' ? 'CNPJ inválido' : 'CPF inválido', variant: "destructive" });
                      return;
                    }
                    if (!settings.nome_titular) {
                      toast({ title: "Preencha o nome do titular", variant: "destructive" });
                      return;
                    }
                    if (!settings.banco || !settings.agencia || !settings.conta || !settings.tipo_conta) {
                      toast({ title: "Preencha todos os dados bancários", variant: "destructive" });
                      return;
                    }
                    if (!settings.bank_data_confirmed) {
                      toast({ title: "Confirme que os dados são da sua titularidade", variant: "destructive" });
                      return;
                    }
                    
                    setSavingBankDetails(true);
                    try {
                      // Chamar edge function para validar e salvar
                      const { data, error } = await supabase.functions.invoke('referral-validate-bank-details', {
                        body: {
                          tipo_pessoa: settings.tipo_pessoa,
                          cpf_cnpj: settings.cpf_cnpj,
                          nome_titular: settings.nome_titular,
                          banco: settings.banco,
                          agencia: settings.agencia,
                          conta: settings.conta,
                          tipo_conta: settings.tipo_conta,
                          chave_pix: settings.chave_pix || null,
                          bank_data_confirmed: true
                        }
                      });
                      
                      if (error) throw error;
                      if (!data?.success) throw new Error(data?.error || 'Erro ao validar dados');
                      
                      // Recarregar os dados para atualizar o estado com os dados descriptografados
                      await loadData();
                      toast({ title: "Dados bancários validados e salvos com sucesso!" });
                    } catch (error: any) {
                      console.error('Erro ao salvar dados bancários:', error);
                      toast({ 
                        title: "Erro ao validar dados", 
                        description: error.message || "Verifique os dados e tente novamente",
                        variant: "destructive" 
                      });
                    } finally {
                      setSavingBankDetails(false);
                    }
                  }} 
                  disabled={savingBankDetails || cpfCnpjValid === false || !settings.bank_data_confirmed} 
                  size="sm" 
                  className="bg-gradient-primary hover:opacity-90"
                >
                  {savingBankDetails ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Validar e Salvar Dados Bancários
                    </>
                  )}
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
                          await createNotification(
                            'Teste de Notificação',
                            'Esta é uma notificação de teste para verificar a animação.'
                          )
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
                  
                  <div 
                    className="flex items-center justify-between"
                    onMouseEnter={() => {
                      if (hasAccessToFeature('whatsapp_notifications')) {
                        const { dismissFeatureBadge } = require('@/components/NewFeatureBadge')
                        dismissFeatureBadge('whatsapp_notifications')
                      }
                    }}
                  >
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        Notificações por WhatsApp
                        {!hasAccessToFeature('whatsapp_notifications') ? (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <Crown className="w-3 h-3" />
                            Premium
                          </Badge>
                        ) : (
                          <NewFeatureBadge featureKey="whatsapp_notifications" />
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receba notificações sobre sessões e lembretes por WhatsApp
                      </p>
                    </div>
                    {hasAccessToFeature('whatsapp_notifications') ? (
                      <Switch
                        checked={settings.notificacao_whatsapp || false}
                        onCheckedChange={(checked) => handleSettingsChange('notificacao_whatsapp', checked)}
                      />
                    ) : (
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setShowPremiumUpgradeModal(true)}
                      >
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <Switch disabled checked={false} />
                      </div>
                    )}
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
                    <div 
                      className="flex items-center justify-between"
                      onMouseEnter={() => {
                        if (hasAccessToFeature('google_calendar')) {
                          const { dismissFeatureBadge } = require('@/components/NewFeatureBadge')
                          dismissFeatureBadge('google_calendar')
                        }
                      }}
                    >
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          Sincronização Google Calendar
                          {!hasAccessToFeature('google_calendar') ? (
                            <Badge variant="warning" className="text-[10px] gap-1">
                              <Crown className="w-3 h-3" />
                              Premium
                            </Badge>
                          ) : (
                            <NewFeatureBadge featureKey="google_calendar" />
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Verifica conflitos e eventos cancelados a cada 15 minutos
                        </p>
                      </div>
                      {hasAccessToFeature('google_calendar') ? (
                        <Switch
                          checked={isAutoSyncEnabled}
                          onCheckedChange={toggleAutoSync}
                          disabled={!localStorage.getItem('google_access_token')}
                        />
                      ) : (
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setShowPremiumUpgradeModal(true)}
                      >
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <Switch disabled checked={false} />
                      </div>
                    )}
                    </div>

                    {hasAccessToFeature('google_calendar') && !localStorage.getItem('google_access_token') && (
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
                
                <Button onClick={handleSave} disabled={isLoading} size="sm" className="bg-gradient-primary hover:opacity-90">
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
      <AlertDialog open={showEmailChangeDialog} onOpenChange={(open) => {
        setShowEmailChangeDialog(open);
        if (!open) {
          setEmailChangeCaptchaToken(null);
          emailCaptchaRef.current?.reset();
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de e-mail</AlertDialogTitle>
            <AlertDialogDescription>
              Ao prosseguir com a alteração do e-mail, você será deslogado da plataforma e precisará confirmar o novo e-mail através do link enviado. Após a confirmação, será necessário fazer login novamente com os novos dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Digite sua senha para confirmar</Label>
              <Input
                type="password"
                value={emailChangePassword}
                onChange={(e) => setEmailChangePassword(e.target.value)}
                placeholder="Senha"
              />
            </div>
            <div className="flex justify-center">
              <Turnstile
                ref={emailCaptchaRef}
                siteKey="0x4AAAAAAB43UmamQYOA5yfH"
                onSuccess={(token) => setEmailChangeCaptchaToken(token)}
                onExpire={() => setEmailChangeCaptchaToken(null)}
                onError={() => setEmailChangeCaptchaToken(null)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEmailChangePassword('');
              setEmailChangeCaptchaToken(null);
              emailCaptchaRef.current?.reset();
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmailChange} disabled={isLoading || !emailChangePassword || !emailChangeCaptchaToken}>
              {isLoading ? 'Processando...' : 'Continuar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de mudança de senha */}
      <AlertDialog open={showPasswordChangeDialog} onOpenChange={(open) => {
        setShowPasswordChangeDialog(open);
        if (!open) {
          setPasswordChangeCaptchaToken(null);
          passwordCaptchaRef.current?.reset();
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de senha</AlertDialogTitle>
            <AlertDialogDescription>
              Ao prosseguir com a alteração da senha, você será deslogado da plataforma e precisará fazer login novamente com a nova senha. 
              Esta ação não pode ser desfeita e você precisará da nova senha para acessar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center my-4">
            <Turnstile
              ref={passwordCaptchaRef}
              siteKey="0x4AAAAAAB43UmamQYOA5yfH"
              onSuccess={(token) => setPasswordChangeCaptchaToken(token)}
              onExpire={() => setPasswordChangeCaptchaToken(null)}
              onError={() => setPasswordChangeCaptchaToken(null)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCurrentPassword('');
              setPendingNewPassword('');
              setPasswordChangeCaptchaToken(null);
              passwordCaptchaRef.current?.reset();
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPasswordChange} disabled={changingPassword || !passwordChangeCaptchaToken}>
              {changingPassword ? 'Processando...' : 'Confirmar e Deslogar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de upgrade para cores */}
      <UpgradeModal 
        open={showColorUpgradeModal} 
        onOpenChange={setShowColorUpgradeModal}
        feature="Personalização de Cores"
        premiumOnly
      />

      {/* Modal de upgrade para funcionalidades Premium */}
      <UpgradeModal 
        open={showPremiumUpgradeModal} 
        onOpenChange={setShowPremiumUpgradeModal}
        feature="esta funcionalidade"
        premiumOnly
      />
    </Layout>
  )
}

export default Configuracoes