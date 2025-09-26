import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Eye, Download, Calendar, Lock, AlertTriangle } from 'lucide-react'
import { useSecureClientData } from '@/hooks/useSecureClientData'
import { SecurityAuditPanel } from '@/components/SecurityAuditPanel'
import { formatDateBR } from '@/utils/formatters'
import { toast } from 'sonner'

interface MedicalDataViewerProps {
  clientId: string
  clientName: string
  isOpen: boolean
  onClose: () => void
}

export function MedicalDataViewer({ clientId, clientName, isOpen, onClose }: MedicalDataViewerProps) {
  const { getClientMedicalData, exportClientData, loading, error } = useSecureClientData()
  const [medicalData, setMedicalData] = useState<any>(null)
  const [showAudit, setShowAudit] = useState(false)

  useEffect(() => {
    if (isOpen && clientId) {
      loadMedicalData()
    }
  }, [isOpen, clientId])

  const loadMedicalData = async () => {
    try {
      const data = await getClientMedicalData(clientId)
      setMedicalData(data)
    } catch (error) {
      console.error('Error loading medical data:', error)
    }
  }

  const handleExport = async () => {
    try {
      const exportData = await exportClientData(clientId)
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cliente_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Dados exportados com segurança')
    } catch (error) {
      console.error('Error exporting data:', error)
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
              <CardTitle>Visualizador de Dados Médicos Protegidos</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAudit(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Auditoria
              </Button>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
          <CardDescription>
            Cliente: <strong>{clientName}</strong>
            {medicalData?.last_accessed && (
              <span className="ml-4 text-xs">
                Último acesso: {formatDateBR(medicalData.last_accessed)}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="overflow-auto max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Carregando dados protegidos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">Erro de Segurança</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : !medicalData ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum dado médico encontrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Security Notice */}
              <Card className="border-success/20 bg-success/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-medium text-success">Dados Médicos Protegidos</p>
                      <p className="text-xs text-muted-foreground">
                        Este acesso está sendo registrado para conformidade com LGPD/HIPAA
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDateBR(new Date())}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Data Tabs */}
              <Tabs defaultValue="dados_clinicos" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados_clinicos">Dados Clínicos</TabsTrigger>
                  <TabsTrigger value="historico">Histórico Médico</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dados_clinicos" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dados Clínicos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {medicalData.dados_clinicos ? (
                        <div className="bg-muted/50 p-4 rounded-lg border">
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {medicalData.dados_clinicos}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">
                          Nenhum dado clínico registrado
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="historico" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Histórico Médico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {medicalData.historico ? (
                        <div className="bg-muted/50 p-4 rounded-lg border">
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {medicalData.historico}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">
                          Nenhum histórico médico registrado
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Export Section */}
              <Card className="border-warning/20 bg-warning/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="w-5 h-5 text-warning" />
                    Exportação de Dados (LGPD)
                  </CardTitle>
                  <CardDescription>
                    Exporte todos os dados do cliente de forma segura e em conformidade com a LGPD
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExport} disabled={loading} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Dados Completos
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    A exportação será registrada no log de auditoria para conformidade
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Audit Panel */}
      <SecurityAuditPanel
        clientId={clientId}
        isOpen={showAudit}
        onClose={() => setShowAudit(false)}
      />
    </div>
  )
}

export default MedicalDataViewer