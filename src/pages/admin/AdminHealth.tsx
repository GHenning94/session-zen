import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Heart, Loader2, RefreshCcw, AlertTriangle, Users, Calendar, CreditCard, TrendingDown, HelpCircle } from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard, StatusIndicator } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const AdminHealth = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [atRiskAccounts, setAtRiskAccounts] = useState<any[]>([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await adminApiCall('admin-get-health-stats')
      if (error) throw error
      setStats(data.stats || {})
      setAtRiskAccounts(data.atRiskAccounts || [])
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high': return <Badge variant="destructive">🔴 Alto Risco</Badge>
      case 'medium': return <Badge className="bg-yellow-500">🟡 Atenção</Badge>
      default: return <Badge className="bg-green-500">🟢 Saudável</Badge>
    }
  }

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" />
              Alertas & Saúde da Plataforma
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Indicadores de risco e prevenção de churn
              <Tooltip><TooltipTrigger><HelpCircle className="h-4 w-4" /></TooltipTrigger>
                <TooltipContent><p className="text-xs"><strong>Churn</strong> = Taxa de cancelamento de clientes</p></TooltipContent>
              </Tooltip>
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm"><RefreshCcw className="h-4 w-4 mr-2" />Atualizar</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Contas em Risco" value={stats.highRiskCount || 0} tooltip="Contas com alta probabilidade de cancelamento" icon={AlertTriangle} borderColor="border-l-red-500" />
          <MetricCard title="Contas em Atenção" value={stats.mediumRiskCount || 0} tooltip="Contas que precisam de acompanhamento" icon={AlertTriangle} borderColor="border-l-yellow-500" />
          <MetricCard title="Sem Login (7+ dias)" value={stats.noLogin7d || 0} icon={Users} borderColor="border-l-orange-500" />
          <MetricCard title="Pagamentos Atrasados" value={stats.overduePayments || 0} icon={CreditCard} borderColor="border-l-red-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="Sem Sessões (30 dias)" value={stats.noSessions30d || 0} tooltip="Usuários sem criar sessões nos últimos 30 dias" icon={Calendar} borderColor="border-l-amber-500" />
          <MetricCard title="Limite de Plano Atingido" value={stats.planLimitReached || 0} tooltip="Usuários que atingiram o limite do plano" icon={TrendingDown} borderColor="border-l-purple-500" />
          <MetricCard title="Alto Potencial LTV" value={stats.highLtvPotential || 0} tooltip="Usuários com alto potencial de valor vitalício" icon={Users} borderColor="border-l-green-500" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Contas em Risco de Churn
            </CardTitle>
            <CardDescription>Contas que precisam de atenção para evitar cancelamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Sessões (30d)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskAccounts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma conta em risco identificada</TableCell></TableRow>
                ) : atRiskAccounts.slice(0, 30).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><div><p className="font-medium">{a.nome}</p><p className="text-xs text-muted-foreground">{a.email}</p></div></TableCell>
                    <TableCell><Badge variant="outline">{a.subscription_plan || 'basico'}</Badge></TableCell>
                    <TableCell>{a.last_login ? new Date(a.last_login).toLocaleDateString('pt-BR') : 'Nunca'}</TableCell>
                    <TableCell>{a.sessions_30d || 0}</TableCell>
                    <TableCell>{a.status || 'Ativo'}</TableCell>
                    <TableCell>{getRiskBadge(a.risk_level)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4" />Critérios de Risco</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div><strong>🔴 Alto Risco:</strong> Sem login há 14+ dias, sem sessões recentes, pagamentos atrasados</div>
              <div><strong>🟡 Atenção:</strong> Sem login há 7+ dias, poucas sessões, limite de plano atingido</div>
              <div><strong>🟢 Saudável:</strong> Login recente, uso ativo da plataforma</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminHealth
