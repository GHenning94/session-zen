import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Admin</h1>
          <p className="text-muted-foreground">Personalize as preferências do painel administrativo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Escolha o tema de cores do painel administrativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              <Label>Tema de Cores</Label>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Claro
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Escuro
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Sistema
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Configure as notificações do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas importantes por email
                </p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="security-alerts">Alertas de Segurança</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações sobre eventos de segurança
                </p>
              </div>
              <Switch id="security-alerts" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payment-alerts">Alertas de Pagamento</Label>
                <p className="text-sm text-muted-foreground">
                  Notificações sobre pagamentos atrasados
                </p>
              </div>
              <Switch id="payment-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências do Painel</CardTitle>
            <CardDescription>Ajuste o comportamento do painel administrativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-refresh">Atualização Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Atualizar dados automaticamente a cada 5 minutos
                </p>
              </div>
              <Switch id="auto-refresh" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-view">Visualização Compacta</Label>
                <p className="text-sm text-muted-foreground">
                  Mostrar mais informações em menos espaço
                </p>
              </div>
              <Switch id="compact-view" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-tooltips">Mostrar Dicas</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir tooltips informativos nas ações
                </p>
              </div>
              <Switch id="show-tooltips" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Configurações de segurança do painel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-timeout">Timeout de Sessão</Label>
                <p className="text-sm text-muted-foreground">
                  Fazer logout automático após inatividade
                </p>
              </div>
              <Switch id="session-timeout" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="audit-log">Log de Auditoria Detalhado</Label>
                <p className="text-sm text-muted-foreground">
                  Registrar todas as ações no painel
                </p>
              </div>
              <Switch id="audit-log" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
