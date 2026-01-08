import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Gift, Loader2, RefreshCcw, Users, DollarSign, TrendingUp, Percent, Clock, UserMinus, UserCheck, CreditCard, AlertCircle } from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Partner {
  user_id: string
  nome: string
  is_referral_partner: boolean
  referral_code: string | null
  left_referral_program_at: string | null
  stripe_connect_account_id: string | null
  stripe_connect_onboarded: boolean
  created_at: string
  status: 'active' | 'cooldown' | 'inactive'
  cooldown_status: 'none' | 'active' | 'expired'
  cooldown_end_date: string | null
  days_remaining: number | null
  total_referrals: number
  active_referrals: number
  total_commission_earned: number
}

interface Referral {
  id: string
  referrer_user_id: string
  referred_user_id: string
  referrer_name: string
  referred_name: string
  subscription_plan: string
  commission_amount: number
  status: string
  created_at: string
}

interface Payout {
  id: string
  user_id: string
  partner_name: string
  amount: number
  status: string
  created_at: string
  paid_at: string | null
}

const AdminReferrals = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await adminApiCall('admin-get-referral-stats')
      if (error) throw error
      setStats(data.stats || {})
      setReferrals(data.referrals || [])
      setPartners(data.partners || [])
      setPayouts(data.payouts || [])
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const formatDateTime = (date: string) => {
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
      case 'cooldown':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Em Cooldown</Badge>
      case 'inactive':
        return <Badge className="bg-muted text-muted-foreground">Inativo</Badge>
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pendente</Badge>
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Pago</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Gift className="h-8 w-8 text-orange-500" />
              Programa de Indicação
            </h1>
            <p className="text-muted-foreground">Métricas completas e gestão do programa de afiliados</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Parceiros Ativos" 
            value={stats.activeReferrers || 0} 
            icon={UserCheck} 
            borderColor="border-l-green-500" 
          />
          <MetricCard 
            title="Em Cooldown" 
            value={stats.inCooldown || 0} 
            icon={Clock} 
            tooltip="Parceiros que saíram e estão no período de 30 dias"
            borderColor="border-l-amber-500" 
          />
          <MetricCard 
            title="Inativos" 
            value={stats.inactivePartners || 0} 
            icon={UserMinus} 
            tooltip="Parceiros que saíram e já passaram do cooldown"
            borderColor="border-l-muted" 
          />
          <MetricCard 
            title="Total de Parceiros" 
            value={stats.totalPartners || 0} 
            icon={Users} 
            borderColor="border-l-blue-500" 
          />
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Clientes Indicados" 
            value={stats.totalReferred || 0} 
            icon={Users} 
            borderColor="border-l-purple-500" 
          />
          <MetricCard 
            title="Indicações Ativas" 
            value={stats.activeReferrals || 0} 
            icon={TrendingUp} 
            borderColor="border-l-green-500" 
          />
          <MetricCard 
            title="Conversão" 
            value={`${(stats.conversionRate || 0).toFixed(1)}%`} 
            tooltip="Porcentagem de indicados que se tornaram pagantes" 
            icon={Percent} 
            borderColor="border-l-amber-500" 
          />
          <MetricCard 
            title="MRR de Indicações" 
            value={formatCurrency(stats.referralMrr || 0)} 
            tooltip="Receita mensal gerada por indicações" 
            icon={DollarSign} 
            borderColor="border-l-primary" 
          />
        </div>

        {/* Commission Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard 
            title="Comissão Total" 
            value={formatCurrency(stats.totalCommission || 0)} 
            icon={DollarSign} 
            borderColor="border-l-green-500" 
          />
          <MetricCard 
            title="Comissão Paga" 
            value={formatCurrency(stats.paidCommission || 0)} 
            icon={CreditCard} 
            borderColor="border-l-blue-500" 
          />
          <MetricCard 
            title="Comissão Pendente" 
            value={formatCurrency(stats.pendingCommission || 0)} 
            icon={AlertCircle} 
            borderColor="border-l-orange-500" 
          />
          <MetricCard 
            title="Total Pagamentos" 
            value={stats.totalPayouts || 0} 
            icon={CreditCard} 
            tooltip="Número total de pagamentos processados"
            borderColor="border-l-muted" 
          />
        </div>

        {/* Tabs for detailed data */}
        <Tabs defaultValue="partners" className="space-y-4">
          <TabsList>
            <TabsTrigger value="partners">Parceiros ({partners.length})</TabsTrigger>
            <TabsTrigger value="referrals">Indicações ({referrals.length})</TabsTrigger>
            <TabsTrigger value="payouts">Pagamentos ({payouts.length})</TabsTrigger>
          </TabsList>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card>
              <CardHeader>
                <CardTitle>Parceiros do Programa</CardTitle>
                <CardDescription>Todos os usuários que participam ou participaram do programa de indicação</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cooldown</TableHead>
                      <TableHead>Indicações</TableHead>
                      <TableHead>Comissão Total</TableHead>
                      <TableHead>Stripe Connect</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum parceiro encontrado
                        </TableCell>
                      </TableRow>
                    ) : partners.map((partner) => (
                      <TableRow key={partner.user_id}>
                        <TableCell className="font-medium">{partner.nome || 'N/A'}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {partner.referral_code || '-'}
                          </code>
                        </TableCell>
                        <TableCell>{getStatusBadge(partner.status)}</TableCell>
                        <TableCell>
                          {partner.cooldown_status === 'active' ? (
                            <div className="flex flex-col">
                              <span className="text-amber-600 text-sm font-medium">
                                {partner.days_remaining} dias restantes
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Até {partner.cooldown_end_date ? formatDate(partner.cooldown_end_date) : '-'}
                              </span>
                            </div>
                          ) : partner.cooldown_status === 'expired' ? (
                            <span className="text-xs text-muted-foreground">Expirado</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{partner.total_referrals}</span>
                            <span className="text-xs text-muted-foreground">
                              {partner.active_referrals} ativas
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(partner.total_commission_earned)}</TableCell>
                        <TableCell>
                          {partner.stripe_connect_onboarded ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              Configurado
                            </Badge>
                          ) : partner.stripe_connect_account_id ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              Pendente
                            </Badge>
                          ) : (
                            <Badge variant="outline">Não configurado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Indicações</CardTitle>
                <CardDescription>Todas as indicações realizadas no programa</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Indicador</TableHead>
                      <TableHead>Indicado</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma indicação encontrada
                        </TableCell>
                      </TableRow>
                    ) : referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(referral.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{referral.referrer_name}</TableCell>
                        <TableCell>{referral.referred_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{referral.subscription_plan || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency((referral.commission_amount || 0) / 100)}</TableCell>
                        <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pagamentos</CardTitle>
                <CardDescription>Todos os pagamentos de comissões processados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Criação</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum pagamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(payout.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{payout.partner_name}</TableCell>
                        <TableCell>{formatCurrency((payout.amount || 0) / 100)}</TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payout.paid_at ? formatDateTime(payout.paid_at) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

export default AdminReferrals