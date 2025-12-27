import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApiCall } from "@/utils/adminApi";
import { toast } from "sonner";
import { Settings, Key, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminSystemConfig() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await adminApiCall('admin-system-config');

      if (error) throw error;
      setConfig(data.config || {});
    } catch (error: any) {
      console.error('Error loading config:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    try {
      const { data, error } = await adminApiCall('admin-system-config', { 
        action: 'regenerate_encryption_key' 
      });

      if (error) throw error;
      toast.success('Solicitação de regeneração registrada');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erro ao solicitar regeneração');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AdminLayout>
    );
  }

  const configItems = [
    { label: 'Stripe Secret Key', value: config.has_stripe_key, key: 'stripe' },
    { label: 'Encryption Key', value: config.has_encryption_key, key: 'encryption' },
    { label: 'VAPID Keys', value: config.has_vapid_keys, key: 'vapid' },
    { label: 'Gemini API Key', value: config.has_gemini_key, key: 'gemini' },
    { label: 'SendPulse Keys', value: config.has_sendpulse_keys, key: 'sendpulse' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">Gerencie configurações e secrets do sistema</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>Configurações gerais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Ambiente:</span>
                <Badge>{config.environment}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Supabase URL:</span>
                <span className="text-xs font-mono">{config.supabase_url?.slice(0, 30)}...</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Google Analytics:</span>
                <Badge variant="outline">{config.ga_tracking_id}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status dos Secrets</CardTitle>
              <CardDescription>Chaves e tokens configurados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {configItems.map((item) => (
                <div key={item.key} className="flex justify-between items-center">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.value ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Badge variant="default">Configurado</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <Badge variant="secondary">Não Configurado</Badge>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ações de Segurança</CardTitle>
            <CardDescription>Gerenciamento de chaves e segurança</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Regenerar Chave de Criptografia</h4>
                <p className="text-sm text-muted-foreground">
                  Solicita a regeneração da chave de criptografia. Esta ação deve ser feita através do painel do Supabase.
                </p>
              </div>
              <Button onClick={handleRegenerateKey} variant="outline">
                <Key className="mr-2 h-4 w-4" />
                Solicitar
              </Button>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Nota:</strong> Para adicionar ou atualizar secrets, acesse o painel do Supabase em
                Project Settings → Edge Functions → Secrets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}