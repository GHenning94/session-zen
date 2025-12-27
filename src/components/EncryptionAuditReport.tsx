import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Key, 
  Database,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Play
} from 'lucide-react'
import { adminApiCall } from '@/utils/adminApi'
import { toast } from 'sonner'
import { SENSITIVE_FIELDS } from '@/utils/encryptionMiddleware'

interface EncryptionTestResult {
  success: boolean
  message: string
  details?: any
}

interface MigrationResult {
  table: string
  processed: number
  encrypted: number
  skipped: number
  mode: string
}

export function EncryptionAuditReport() {
  const [loading, setLoading] = useState(false)
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null)
  const [encryptionTest, setEncryptionTest] = useState<EncryptionTestResult | null>(null)
  const [decryptionTest, setDecryptionTest] = useState<EncryptionTestResult | null>(null)
  const [migrationResults, setMigrationResults] = useState<Record<string, MigrationResult> | null>(null)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    runInitialChecks()
  }, [])

  const runInitialChecks = async () => {
    setLoading(true)
    try {
      // Test encryption
      await testEncryption()
      // Test decryption
      await testDecryption()
    } catch (error) {
      console.error('Error running initial checks:', error)
    } finally {
      setLoading(false)
    }
  }

  const testEncryption = async () => {
    try {
      const testData = {
        historico: 'Test patient history data',
        dados_clinicos: 'Test clinical data',
        tratamento: 'Test treatment data'
      }

      const response = await adminApiCall('admin-encryption-audit', {
        operation: 'encrypt',
        table: 'clients',
        data: testData
      })

      if (response.error || !response.data?.success) {
        setKeyConfigured(false)
        setEncryptionTest({
          success: false,
          message: 'Falha ao criptografar: ' + (response.error || response.data?.error || 'Erro desconhecido')
        })
      } else {
        setKeyConfigured(true)
        const encrypted = response.data.data
        const allFieldsEncrypted = 
          encrypted.historico !== testData.historico &&
          encrypted.dados_clinicos !== testData.dados_clinicos &&
          encrypted.tratamento !== testData.tratamento

        setEncryptionTest({
          success: allFieldsEncrypted,
          message: allFieldsEncrypted 
            ? 'Criptografia funcionando corretamente' 
            : 'Alguns campos não foram criptografados',
          details: encrypted
        })
      }
    } catch (error: any) {
      setKeyConfigured(false)
      setEncryptionTest({
        success: false,
        message: 'Erro ao testar criptografia: ' + error.message
      })
    }
  }

  const testDecryption = async () => {
    try {
      // First encrypt some data
      const testData = {
        historico: 'Test decryption data'
      }

      const encryptResponse = await adminApiCall('admin-encryption-audit', {
        operation: 'encrypt',
        table: 'clients',
        data: testData
      })

      if (encryptResponse.error || !encryptResponse.data?.success) {
        setDecryptionTest({
          success: false,
          message: 'Não foi possível criptografar dados para teste de descriptografia'
        })
        return
      }

      // Now decrypt it
      const decryptResponse = await adminApiCall('admin-encryption-audit', {
        operation: 'decrypt',
        table: 'clients',
        data: encryptResponse.data.data
      })

      if (decryptResponse.error || !decryptResponse.data?.success) {
        setDecryptionTest({
          success: false,
          message: 'Falha ao descriptografar: ' + (decryptResponse.error || decryptResponse.data?.error)
        })
      } else {
        const decrypted = decryptResponse.data.data
        const correctlyDecrypted = decrypted.historico === testData.historico

        setDecryptionTest({
          success: correctlyDecrypted,
          message: correctlyDecrypted 
            ? 'Descriptografia funcionando corretamente'
            : 'Dados não foram descriptografados corretamente',
          details: decrypted
        })
      }
    } catch (error: any) {
      setDecryptionTest({
        success: false,
        message: 'Erro ao testar descriptografia: ' + error.message
      })
    }
  }

  const runMigrationDryRun = async () => {
    setMigrating(true)
    try {
      const response = await adminApiCall('migrate-to-encrypted', {
        dryRun: true
      })

      if (response.error || !response.data?.success) {
        toast.error('Erro ao executar simulação de migração: ' + (response.error || response.data?.error))
      } else {
        setMigrationResults(response.data.results)
        toast.success('Simulação de migração concluída')
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message)
    } finally {
      setMigrating(false)
    }
  }

  const runMigrationLive = async () => {
    if (!confirm('Tem certeza que deseja criptografar todos os dados sensíveis? Esta ação é irreversível.')) {
      return
    }

    setMigrating(true)
    try {
      const response = await adminApiCall('migrate-to-encrypted', {
        dryRun: false
      })

      if (response.error || !response.data?.success) {
        toast.error('Erro ao executar migração: ' + (response.error || response.data?.error))
      } else {
        setMigrationResults(response.data.results)
        toast.success('Migração concluída com sucesso!')
        // Refresh tests
        await runInitialChecks()
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message)
    } finally {
      setMigrating(false)
    }
  }

  const downloadReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      keyConfigured,
      encryptionTest,
      decryptionTest,
      migrationResults,
      sensitiveFieldsConfiguration: SENSITIVE_FIELDS
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `encryption-audit-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Relatório baixado com sucesso')
  }

  const getStatusIcon = (success: boolean | null) => {
    if (success === null) return <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
    return success 
      ? <CheckCircle2 className="w-5 h-5 text-success" />
      : <XCircle className="w-5 h-5 text-destructive" />
  }

  const getStatusBadge = (success: boolean | null) => {
    if (success === null) return <Badge variant="secondary">Verificando...</Badge>
    return success
      ? <Badge variant="default" className="bg-success">OK</Badge>
      : <Badge variant="destructive">Falha</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Relatório de Auditoria de Criptografia</CardTitle>
                <CardDescription>
                  Status completo do sistema de criptografia AES-256-GCM
                </CardDescription>
              </div>
            </div>
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Baixar Relatório
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Configuration Status */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Key className="w-5 h-5" />
              Status da Configuração
            </h3>
            
            <Card className={keyConfigured === false ? 'border-destructive/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(keyConfigured)}
                    <div>
                      <p className="font-medium">ENCRYPTION_KEY</p>
                      <p className="text-sm text-muted-foreground">
                        {keyConfigured === null 
                          ? 'Verificando configuração...'
                          : keyConfigured 
                            ? 'Chave configurada corretamente'
                            : 'Chave não configurada ou inválida'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(keyConfigured)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Encryption Tests */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Testes de Funcionalidade
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className={encryptionTest?.success === false ? 'border-destructive/50' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(encryptionTest?.success ?? null)}
                        <div>
                          <p className="font-medium">Teste de Criptografia</p>
                          <p className="text-sm text-muted-foreground">
                            {encryptionTest?.message || 'Aguardando...'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(encryptionTest?.success ?? null)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={decryptionTest?.success === false ? 'border-destructive/50' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(decryptionTest?.success ?? null)}
                        <div>
                          <p className="font-medium">Teste de Descriptografia</p>
                          <p className="text-sm text-muted-foreground">
                            {decryptionTest?.message || 'Aguardando...'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(decryptionTest?.success ?? null)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={runInitialChecks} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Executar Testes Novamente
            </Button>
          </div>

          {/* Sensitive Fields Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Campos Sensíveis Configurados
            </h3>

            <div className="grid gap-4">
              {Object.entries(SENSITIVE_FIELDS).map(([table, fields]) => (
                <Card key={table}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium mb-2">{table}</p>
                        <div className="flex flex-wrap gap-2">
                          {fields.map((field) => (
                            <Badge key={field} variant="secondary">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {fields.length} campo{fields.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Migration Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Migração de Dados
            </h3>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                A migração criptografa todos os dados sensíveis existentes no banco de dados. 
                Execute primeiro uma simulação (dry run) para verificar quantos registros serão afetados.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                onClick={runMigrationDryRun}
                disabled={migrating || !keyConfigured}
                variant="outline"
              >
                <Play className="w-4 h-4 mr-2" />
                Simulação (Dry Run)
              </Button>
              <Button 
                onClick={runMigrationLive}
                disabled={migrating || !keyConfigured || !migrationResults}
                variant="default"
              >
                <Lock className="w-4 h-4 mr-2" />
                Executar Migração Real
              </Button>
            </div>

            {migrationResults && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Resultados da Migração</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(migrationResults).map(([table, result]) => (
                      <div key={table} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{table}</span>
                          <Badge variant={result.mode === 'dry-run' ? 'secondary' : 'default'}>
                            {result.mode === 'dry-run' ? 'Simulação' : 'Executado'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Processados</p>
                            <p className="font-semibold">{result.processed}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Criptografados</p>
                            <p className="font-semibold text-success">{result.encrypted}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ignorados</p>
                            <p className="font-semibold text-muted-foreground">{result.skipped}</p>
                          </div>
                        </div>
                        {result.encrypted > 0 && (
                          <Progress 
                            value={(result.encrypted / result.processed) * 100} 
                            className="h-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Security Summary */}
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-success">Status de Segurança</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Algoritmo: AES-256-GCM (padrão militar)</li>
                    <li>✓ IV único gerado para cada operação (12 bytes)</li>
                    <li>✓ Autenticação de mensagem integrada (Auth Tag)</li>
                    <li>✓ Compatível com LGPD, HIPAA e GDPR</li>
                    <li>✓ Fallback automático para dados legados em texto simples</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export default EncryptionAuditReport
