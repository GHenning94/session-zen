import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface TwoFASettings {
  email_2fa_enabled: boolean;
  authenticator_2fa_enabled: boolean;
  authenticator_secret?: string;
}

export const use2FA = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TwoFASettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  // INÍCIO DA CORREÇÃO: Função helper para chamadas autenticadas
  const invokeAuthenticatedFunction = async (functionName: string, body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({ 
        title: "Erro de Autenticação", 
        description: "Sua sessão expirou. Por favor, faça login novamente.", 
        variant: "destructive" 
      });
      throw new Error("Usuário não autenticado");
    }

    // Define o token de autenticação para a próxima chamada
    supabase.functions.setAuth(session.access_token);
    
    // Executa a chamada
    return supabase.functions.invoke(functionName, { body });
  };
  // FIM DA CORREÇÃO

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('email_2fa_enabled, authenticator_2fa_enabled, authenticator_secret')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setSettings(data || {
        email_2fa_enabled: false,
        authenticator_2fa_enabled: false,
      });
    } catch (error) {
      console.error('Error loading 2FA settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmail2FA = async (enable: boolean) => {
    try {
      // CORRIGIDO: Usa a função helper
      const { error } = await invokeAuthenticatedFunction('twofa-setup-email', {
        enable,
      });

      if (error) throw error;

      toast({
        title: enable ? '2FA por e-mail ativado' : '2FA por e-mail desativado',
        description: enable 
          ? 'Você receberá um código por e-mail em cada login'
          : 'A verificação por e-mail foi desativada',
      });

      await loadSettings();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateAuthenticator = async () => {
    try {
      // CORRIGIDO: Usa a função helper
      const { data, error } = await invokeAuthenticatedFunction('twofa-setup-authenticator', {
        action: 'generate',
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const verifyAndEnableAuthenticator = async (code: string) => {
    try {
      // CORRIGIDO: Usa a função helper
      const { data, error } = await invokeAuthenticatedFunction('twofa-setup-authenticator', {
        action: 'verify', enable: true, code,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao verificar código');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Authenticator configurado',
        description: 'Google Authenticator ativado com sucesso',
      });

      await loadSettings();
      return true;
    } catch (error: any) {
      console.error('verifyAndEnableAuthenticator error:', error);
      toast({
        title: 'Erro ao verificar código',
        description: error.message || 'Verifique o código e tente novamente',
        variant: 'destructive',
      });
      return false;
    }
  };

  const disableAuthenticator = async () => {
    try {
      // CORRIGIDO: Usa a função helper
      const { error } = await invokeAuthenticatedFunction('twofa-setup-authenticator', {
        action: 'disable',
      });

      if (error) throw error;

      toast({
        title: 'Authenticator desativado',
        description: 'Google Authenticator foi desativado',
      });

      await loadSettings();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateBackupCodes = async () => {
    try {
      // CORRIGIDO: Usa a função helper
      const { data, error } = await invokeAuthenticatedFunction('twofa-generate-backup-codes', {});

      if (error) throw error;

      setBackupCodes(data.codes);
      
      toast({
        title: 'Códigos de backup gerados',
        description: 'Guarde estes códigos em um local seguro',
      });

      return data.codes;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const has2FAConfigured = () => {
    return settings?.email_2fa_enabled || settings?.authenticator_2fa_enabled;
  };

  return {
    settings,
    loading,
    backupCodes,
    toggleEmail2FA,
    generateAuthenticator,
    verifyAndEnableAuthenticator,
    disableAuthenticator,
    generateBackupCodes,
    has2FAConfigured,
    refreshSettings: loadSettings,
  };
};