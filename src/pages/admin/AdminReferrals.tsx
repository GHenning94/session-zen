import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Gift, Loader2, RefreshCcw, Users, DollarSign, TrendingUp, Percent, HelpCircle } from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const AdminReferrals = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [referrals, setReferrals] = useState<any[]>([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await adminApiCall('admin-get-referral-stats')
      if (error) throw error
      setStats(data.stats || {})
      setReferrals(data.referrals || [])
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Gift className="h-8 w-8 text-orange-500" />
              Programa de Indicação
            </h1>
            <p className="text-muted-foreground">Métricas e gestão do programa de afiliados</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm"><RefreshCcw className="h-4 w-4 mr-2" />Atualizar</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Indicadores Ativos" value={stats.activeReferrers || 0} icon={Users} borderColor="border-l-blue-500" />
          <MetricCard title="Clientes Indicados" value={stats.totalReferred || 0} icon={Users} borderColor="border-l-green-500" />
          <MetricCard title="Conversão" value={`${(stats.conversionRate || 0).toFixed(1)}%`} tooltip="Porcentagem de indicados que se tornaram pagantes" icon={Percent} borderColor="border-l-amber-500" />
          <MetricCard title="MRR de Indicações" value={formatCurrency(stats.referralMrr || 0)} tooltip="Receita mensal gerada por indicações" icon={DollarSign} borderColor="border-l-purple-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="Comissão Total" value={formatCurrency(stats.totalCommission || 0)} icon={DollarSign} borderColor="border-l-green-500" />
          <MetricCard title="Comissão Paga" value={formatCurrency(stats.paidCommission || 0)} icon={DollarSign} borderColor="border-l-blue-500" />
          <MetricCard title="Comissão Pendente" value={formatCurrency(stats.pendingCommission || 0)} icon={DollarSign} borderColor="border-l-orange-500" />
        </div>

        <Card>
          <CardHeader><CardTitle>Histórico de Indicações</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Indicado</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma indicação</TableCell></TableRow>
                ) : referrals.slice(0, 30).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.referrer_name || 'N/A'}</TableCell>
                    <TableCell>{r.referred_name || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{r.subscription_plan || 'N/A'}</Badge></TableCell>
                    <TableCell>{formatCurrency(r.commission_amount || 0)}</TableCell>
                    <TableCell><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminReferrals
