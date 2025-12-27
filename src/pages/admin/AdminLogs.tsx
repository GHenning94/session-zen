import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApiCall } from "@/utils/adminApi";
import { toast } from "sonner";
import { Shield, AlertTriangle, Activity, Clock, FileDown, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminReportExport } from "@/hooks/useAdminReportExport";

export default function AdminLogs() {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [medicalLogs, setMedicalLogs] = useState<any[]>([]);
  const [adminSessions, setAdminSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { generateLogsReport, isGenerating } = useAdminReportExport();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await adminApiCall('admin-get-logs');

      if (error) throw error;

      setAuditLogs(data.audit_logs || []);
      setMedicalLogs(data.medical_logs || []);
      setAdminSessions(data.admin_sessions || []);
      setStats(data.stats || {});
    } catch (error: any) {
      console.error('Error loading logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    generateLogsReport(
      { auditLogs, medicalLogs, adminSessions },
      stats,
      {
        startDate,
        endDate,
        category: categoryFilter !== "all" ? categoryFilter : undefined
      }
    );
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Logs e Auditoria</h1>
            <p className="text-muted-foreground">Monitore atividades e eventos do sistema</p>
          </div>
          <Button onClick={handleExport} disabled={isGenerating}>
            <FileDown className="h-4 w-4 mr-2" />
            {isGenerating ? "Gerando..." : "Exportar PDF"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Categoria</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="audit">Auditoria</SelectItem>
                    <SelectItem value="medical">Médico</SelectItem>
                    <SelectItem value="sessions">Sessões Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logs de Auditoria</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_audit_logs}</div>
              <p className="text-xs text-muted-foreground">Eventos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acessos Médicos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_medical_logs}</div>
              <p className="text-xs text-muted-foreground">Acessos a dados sensíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões Admin</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_admin_sessions}</div>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tentativas Não Autorizadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.unauthorized_attempts}</div>
              <p className="text-xs text-muted-foreground">Bloqueadas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="audit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit">Logs de Auditoria</TabsTrigger>
            <TabsTrigger value="medical">Acessos Médicos</TabsTrigger>
            <TabsTrigger value="sessions">Sessões Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Auditoria</CardTitle>
                <CardDescription>Histórico de ações no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>ID do Registro</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                        <TableCell className="font-mono text-xs">{log.record_id?.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Acesso a Dados Médicos</CardTitle>
                <CardDescription>Acessos a informações sensíveis</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicalLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.access_timestamp).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.action.includes('UNAUTHORIZED') ? 'destructive' : 'default'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.field_accessed || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                        <TableCell>
                          {log.action.includes('UNAUTHORIZED') ? (
                            <Badge variant="destructive">Bloqueado</Badge>
                          ) : (
                            <Badge variant="default">Permitido</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sessões Administrativas</CardTitle>
                <CardDescription>Sessões de admin ativas e expiradas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criada Em</TableHead>
                      <TableHead>Expira Em</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminSessions.map((session) => {
                      const isActive = !session.revoked && new Date(session.expires_at) > new Date();
                      return (
                        <TableRow key={session.id}>
                          <TableCell>
                            {new Date(session.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {new Date(session.expires_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{session.ip_address}</TableCell>
                          <TableCell className="text-xs max-w-xs truncate">
                            {session.user_agent}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActive ? 'default' : 'secondary'}>
                              {isActive ? 'Ativa' : 'Expirada'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}