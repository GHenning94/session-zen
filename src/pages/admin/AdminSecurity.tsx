import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Shield, CheckCircle2, XCircle, AlertTriangle, Download, RefreshCw, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const AdminSecurity = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningAudit, setIsRunningAudit] = useState(false)
  const [report, setReport] = useState<any>(null)

  const fetchSecurityReport = async () => {
    setIsRunningAudit(true)
    try {
      const sessionToken = localStorage.getItem('admin_session_token')
      
      const { data, error } = await supabase.functions.invoke('admin-security-audit', {
        body: { sessionToken },
      })

      if (error || !data.success) {
        throw new Error(data?.error || 'Erro ao buscar relatório')
      }

      setReport(data.report)
    } catch (error: any) {
      console.error('[Admin Security] Error:', error)
      toast.error(error.message || 'Erro ao carregar relatório de segurança')
    } finally {
      setIsLoading(false)
      setIsRunningAudit(false)
    }
  }

  useEffect(() => {
    fetchSecurityReport()
  }, [])

  const downloadReport = () => {
    if (!report) return
    
    const dataStr = JSON.stringify(report, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `security-report-${new Date().toISOString()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    
    toast.success('Relatório baixado com sucesso!')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Criptografia e Segurança
            </h1>
            <p className="text-muted-foreground mt-1">
              Auditoria completa AES-256-GCM e verificação de segurança
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchSecurityReport}
              disabled={isRunningAudit}
              className="gap-2"
            >
              {isRunningAudit ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Executar Testes
                </>
              )}
            </Button>
            <Button
              onClick={downloadReport}
              disabled={!report}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </Button>
          </div>
        </div>

        {/* Status da Criptografia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {report?.encryption.test_passed ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              Status da Criptografia
            </CardTitle>
            <CardDescription>Algoritmo: {report?.encryption.algorithm}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chave Configurada</p>
                <Badge variant={report?.encryption.key_configured ? 'default' : 'destructive'}>
                  {report?.encryption.key_configured ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chave Válida</p>
                <Badge variant={report?.encryption.key_valid ? 'default' : 'destructive'}>
                  {report?.encryption.key_valid ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Teste de Criptografia</p>
                <Badge variant={report?.encryption.test_passed ? 'default' : 'destructive'}>
                  {report?.encryption.test_passed ? 'Passou' : 'Falhou'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Algoritmo</p>
                <Badge variant="outline">AES-256-GCM</Badge>
              </div>
            </div>

            {report?.encryption.test_error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Erro no teste: {report.encryption.test_error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Dados Sensíveis */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Sensíveis Protegidos</CardTitle>
            <CardDescription>Campos médicos criptografados no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold text-primary">
                  {report?.sensitive_data.total_clients}
                </p>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
              </div>
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold text-blue-600">
                  {report?.sensitive_data.with_dados_clinicos}
                </p>
                <p className="text-sm text-muted-foreground">Com Dados Clínicos</p>
              </div>
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold text-purple-600">
                  {report?.sensitive_data.with_historico}
                </p>
                <p className="text-sm text-muted-foreground">Com Histórico</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs de Auditoria */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Auditoria</CardTitle>
            <CardDescription>Monitoramento de acesso a dados sensíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold">{report?.audit.total_logs}</p>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
              </div>
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold text-green-600">
                  {report?.audit.last_24h}
                </p>
                <p className="text-sm text-muted-foreground">Últimas 24h</p>
              </div>
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold text-red-600">
                  {report?.audit.unauthorized_attempts}
                </p>
                <p className="text-sm text-muted-foreground">Tentativas Não Autorizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recomendações */}
        {report?.recommendations && report.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recomendações de Segurança</CardTitle>
              <CardDescription>Ações sugeridas para melhorar a segurança</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.recommendations.map((rec: any, index: number) => (
                <Alert key={index} variant={rec.severity === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="ml-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(rec.severity)}>
                        {rec.severity.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">{rec.message}</span>
                    </div>
                    <AlertDescription className="text-sm">
                      Ação: {rec.action}
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Timestamp */}
        <div className="text-center text-sm text-muted-foreground">
          Última verificação: {report?.timestamp ? new Date(report.timestamp).toLocaleString('pt-BR') : 'N/A'}
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminSecurity