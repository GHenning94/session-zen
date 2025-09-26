import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout } from "@/components/Layout"
import { Calendar, HardDrive, Cloud, Trello, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import GoogleCalendarIntegration from "@/components/google/GoogleCalendarIntegration"
import { Badge } from "@/components/ui/badge"

type AllSettings = Record<string, any>;

const Integracoes = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [settings, setSettings] = useState<AllSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("google-calendar")

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Carregar dados básicos do perfil (sem informações financeiras sensíveis)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, nome, profissao, especialidade, bio, crp, telefone, avatar_url, public_avatar_url, plano, subscription_plan, created_at, updated_at')
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

  const handleSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const configFields = ['google_calendar_connected', 'google_calendar_token'];
      const profileFields = ['nome', 'profissao', 'telefone', 'crp', 'especialidade', 'bio', 'avatar_url', 'public_avatar_url'];
      
      const profileData: Record<string, any> = {};
      const configData: Record<string, any> = {};
      
      for (const key in settings) {
        if (profileFields.includes(key)) profileData[key] = settings[key];
        if (configFields.includes(key)) configData[key] = settings[key];
      }
      
      if (Object.keys(profileData).length > 0) {
        const { error: profileError } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
        if (profileError) throw profileError;
      }
      
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

  if (isLoading) return <Layout><p className="p-4">Carregando integrações...</p></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">Conecte sua conta com serviços externos para aumentar sua produtividade</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="google-calendar">Google Agenda</TabsTrigger>
            <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
            <TabsTrigger value="onedrive">OneDrive</TabsTrigger>
            <TabsTrigger value="trello">Trello</TabsTrigger>
          </TabsList>
          
          <TabsContent value="google-calendar" className="space-y-6">
            <GoogleCalendarIntegration />
          </TabsContent>
          
          <TabsContent value="google-drive" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="text-primary" />
                  Google Drive
                  <Badge variant="secondary" className="ml-2">Em breve</Badge>
                </CardTitle>
                <CardDescription>
                  Sincronize e armazene documentos automaticamente no Google Drive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <HardDrive className="w-12 h-12 text-muted-foreground mx-auto" />
                    <h3 className="text-lg font-medium text-muted-foreground">Integração em Desenvolvimento</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Em breve você poderá conectar sua conta do Google Drive para backup automático de prontuários, 
                      relatórios e documentos importantes.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Recursos planejados:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Backup automático de prontuários</li>
                    <li>Sincronização de relatórios</li>
                    <li>Compartilhamento seguro de documentos</li>
                    <li>Histórico de versões</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="onedrive" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="text-blue-500" />
                  Microsoft OneDrive
                  <Badge variant="secondary" className="ml-2">Em breve</Badge>
                </CardTitle>
                <CardDescription>
                  Integre com OneDrive para armazenamento em nuvem da Microsoft
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <Cloud className="w-12 h-12 text-muted-foreground mx-auto" />
                    <h3 className="text-lg font-medium text-muted-foreground">Integração em Desenvolvimento</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Conecte sua conta do OneDrive para ter seus dados sempre sincronizados e seguros 
                      no ecossistema Microsoft.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Recursos planejados:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Sincronização automática de arquivos</li>
                    <li>Integração com Office 365</li>
                    <li>Colaboração em documentos</li>
                    <li>Controle de acesso avançado</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trello" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trello className="text-primary" />
                  Trello
                  <Badge variant="secondary" className="ml-2">Em breve</Badge>
                </CardTitle>
                <CardDescription>
                  Organize suas tarefas e projetos com integração ao Trello
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <Trello className="w-12 h-12 text-muted-foreground mx-auto" />
                    <h3 className="text-lg font-medium text-muted-foreground">Integração em Desenvolvimento</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Conecte ao Trello para gerenciar suas tarefas clínicas, acompanhar o progresso dos pacientes 
                      e organizar sua prática profissional.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Recursos planejados:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Criação automática de cards para sessões</li>
                    <li>Acompanhamento de tratamentos</li>
                    <li>Lembretes e checklist personalizados</li>
                    <li>Relatórios de progresso visual</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default Integracoes