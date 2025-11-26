import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Users, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useSecureClientData } from '@/hooks/useSecureClientData'
import { SecurityAuditPanel } from '@/components/SecurityAuditPanel'
import { formatDateBR, formatTimeBR } from '@/utils/formatters'
import { toast } from 'sonner'

interface SecurityStatusDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export function SecurityStatusDashboard({ isOpen, onClose }: SecurityStatusDashboardProps) {
  const { getSecurityStats, loading } = useSecureClientData()
  const [securityStats, setSecurityStats] = useState<any>(null)
  const [showAuditPanel, setShowAuditPanel] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadSecurityStats()
    }
  }, [isOpen])

  const loadSecurityStats = async () => {
    try {
      const stats = await getSecurityStats()
      setSecurityStats(stats)
    } catch (error) {
      console.error('Error loading security stats:', error)
      toast.error('Erro ao carregar estatísticas de segurança')
    }
  }

  if (!isOpen) return null

  const getSecurityLevel = () => {
    if (!securityStats) return { level: 'unknown', color: 'muted', icon: Shield }
    
    const unauthorizedAttempts = securityStats.unauthorized_attempts || 0
    
    if (unauthorizedAttempts === 0) {
      return { 
        level: 'Seguro', 
        color: 'success', 
        icon: ShieldCheck,
        description: 'Nenhuma tentativa não autorizada detectada'
      }
    } else if (unauthorizedAttempts < 5) {
      return { 
        level: 'Atenção', 
        color: 'warning', 
        icon: ShieldAlert,
        description: `${unauthorizedAttempts} tentativa(s) não autorizada(s) detectada(s)`
      }
    } else {
      return { 
        level: 'Alerta', 
        color: 'destructive', 
        icon: AlertTriangle,
        description: `${unauthorizedAttempts} tentativas não autorizadas - Revisar imediatamente`
      }
    }
  }

  const securityLevel = getSecurityLevel()
  const SecurityIcon = securityLevel.icon

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <CardTitle className="text-xl">Dashboard de Segurança Médica</CardTitle>
                <CardDescription>
                  Monitoramento em tempo real da segurança dos dados dos pacientes
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAuditPanel(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Log Completo
              </Button>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-auto max-h-[70vh] space-y-6">
          {loading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-4 w-56 mx-auto" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ) : !securityStats ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Erro ao carregar estatísticas de segurança</p>
            </div>
          ) : (
            <>
              {/* Security Level Status */}
              <Alert className={`border-${securityLevel.color}/20 bg-${securityLevel.color}/5`}>
                <SecurityIcon className={`h-4 w-4 text-${securityLevel.color}`} />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>Status de Segurança: {securityLevel.level}</strong>
                      <p className="text-sm text-muted-foreground mt-1">
                        {securityLevel.description}
                      </p>
                    </div>
                    <Badge variant={securityLevel.color === 'success' ? 'default' : 'destructive'}>
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDateBR(securityStats.last_checked)} às {formatTimeBR(securityStats.last_checked)}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Security Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {securityStats.total_clients}
                        </p>
                        <p className="text-sm text-muted-foreground">Total de Clientes</p>
                      </div>
                      <Users className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-warning">
                          {securityStats.clients_with_medical_data}
                        </p>
                        <p className="text-sm text-muted-foreground">Com Dados Médicos</p>
                      </div>
                      <Database className="w-8 h-8 text-warning/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-success">
                          {securityStats.recent_access_count}
                        </p>
                        <p className="text-sm text-muted-foreground">Acessos (24h)</p>
                      </div>
                      <Eye className="w-8 h-8 text-success/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-2xl font-bold ${
                          securityStats.unauthorized_attempts > 0 ? 'text-destructive' : 'text-success'
                        }`}>
                          {securityStats.unauthorized_attempts}
                        </p>
                        <p className="text-sm text-muted-foreground">Tentativas Não Autorizadas</p>
                      </div>
                      {securityStats.unauthorized_attempts > 0 ? (
                        <AlertTriangle className="w-8 h-8 text-destructive/60" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-success/60" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Security Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-success" />
                    Recursos de Segurança Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Auditoria Completa de Acesso</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Validação de Entrada Avançada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Controle de Acesso Multi-Camada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Mascaramento de Dados Sensíveis</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Sanitização Automática</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Detecção de Acesso Não Autorizado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Conformidade LGPD/HIPAA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm">Exportação Segura de Dados</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Information */}
              <Card className="border-success/20 bg-success/5">
                <CardHeader>
                  <CardTitle className="text-success flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Conformidade Regulatória
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>LGPD (Lei Geral de Proteção de Dados):</strong> Todos os acessos a dados pessoais 
                      são registrados e podem ser auditados conforme exigido pela lei.
                    </p>
                    <p>
                      <strong>HIPAA (Health Insurance Portability and Accountability Act):</strong> 
                      Implementação de controles de segurança apropriados para proteção de informações médicas.
                    </p>
                    <p>
                      <strong>Auditoria:</strong> Log imutável de todas as operações com dados médicos 
                      mantido para fins de conformidade e investigação.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                <Button 
                  onClick={() => setShowAuditPanel(true)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Log de Auditoria Completo
                </Button>
                <Button 
                  variant="outline"
                  onClick={loadSecurityStats}
                  disabled={loading}
                >
                  Atualizar Estatísticas
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Audit Panel */}
      <SecurityAuditPanel
        isOpen={showAuditPanel}
        onClose={() => setShowAuditPanel(false)}
      />
    </div>
  )
}

export default SecurityStatusDashboard