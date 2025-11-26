import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Shield, Eye, Edit, Trash, Download, AlertTriangle } from 'lucide-react'
import { getClientAuditLogs, type ClientAuditLog } from '@/utils/secureClientData'
import { formatDateBR, formatTimeBR } from '@/utils/formatters'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface SecurityAuditPanelProps {
  clientId?: string
  isOpen: boolean
  onClose: () => void
}

export function SecurityAuditPanel({ clientId, isOpen, onClose }: SecurityAuditPanelProps) {
  const [auditLogs, setAuditLogs] = useState<ClientAuditLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs()
    }
  }, [isOpen, clientId])

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const logs = await getClientAuditLogs(clientId)
      setAuditLogs(logs)
    } catch (error) {
      console.error('Error loading audit logs:', error)
      toast.error('Erro ao carregar logs de auditoria')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'VIEW': return <Eye className="w-4 h-4 text-primary" />
      case 'UPDATE': return <Edit className="w-4 h-4 text-warning" />
      case 'DELETE': return <Trash className="w-4 h-4 text-destructive" />
      case 'EXPORT': return <Download className="w-4 h-4 text-success" />
      default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getActionVariant = (action: string) => {
    switch (action) {
      case 'VIEW': return 'secondary' as const
      case 'UPDATE': return 'outline' as const
      case 'DELETE': return 'destructive' as const
      case 'EXPORT': return 'default' as const
      default: return 'secondary' as const
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              <CardTitle>Auditoria de Segurança - Dados Médicos</CardTitle>
            </div>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
          <CardDescription>
            Log completo de acesso a dados sensíveis para conformidade com LGPD/HIPAA
            {clientId ? ' - Cliente específico' : ' - Todos os clientes'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-4 w-48 mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum acesso a dados médicos registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-primary">
                      {auditLogs.filter(log => log.action === 'VIEW').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Visualizações</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-warning">
                      {auditLogs.filter(log => log.action === 'UPDATE').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Edições</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-success">
                      {auditLogs.filter(log => log.action === 'EXPORT').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Exportações</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-destructive">
                      {auditLogs.filter(log => log.action === 'DELETE').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Exclusões</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Audit Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Log Detalhado de Auditoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Campo Acessado</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Cliente ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.slice(0, 50).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDateBR(log.access_timestamp)} às {formatTimeBR(log.access_timestamp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <Badge variant={getActionVariant(log.action)}>
                                {log.action}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {log.field_accessed || 'N/A'}
                            </code>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.client_id.substring(0, 8)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {auditLogs.length > 50 && (
                    <div className="mt-4 text-center">
                      <Badge variant="outline">
                        Mostrando 50 de {auditLogs.length} registros
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Security Information */}
              <Card className="border-success/20 bg-success/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-success mt-1" />
                    <div>
                      <h4 className="font-semibold text-success">Conformidade de Segurança</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Todos os acessos a dados médicos sensíveis são registrados automaticamente 
                        para conformidade com LGPD, HIPAA e outras regulamentações de proteção de dados. 
                        Este log é imutável e mantido para auditoria.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SecurityAuditPanel