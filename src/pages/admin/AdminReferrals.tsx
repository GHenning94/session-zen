import { useState, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Gift, Loader2, RefreshCcw, Users, DollarSign, TrendingUp, Percent, Clock, UserMinus, UserCheck, CreditCard, AlertCircle, Download, Search, X } from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import * as XLSX from "xlsx"

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
  
  // Filters
  const [partnerSearch, setPartnerSearch] = useState("")
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>("all")
  const [referralSearch, setReferralSearch] = useState("")
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>("all")
  const [payoutSearch, setPayoutSearch] = useState("")
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all")

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

  // Filtered data
  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const matchesSearch = !partnerSearch || 
        p.nome?.toLowerCase().includes(partnerSearch.toLowerCase()) ||
        p.referral_code?.toLowerCase().includes(partnerSearch.toLowerCase())
      const matchesStatus = partnerStatusFilter === "all" || p.status === partnerStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [partners, partnerSearch, partnerStatusFilter])

  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      const matchesSearch = !referralSearch || 
        r.referrer_name?.toLowerCase().includes(referralSearch.toLowerCase()) ||
        r.referred_name?.toLowerCase().includes(referralSearch.toLowerCase())
      const matchesStatus = referralStatusFilter === "all" || r.status === referralStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [referrals, referralSearch, referralStatusFilter])

  const filteredPayouts = useMemo(() => {
    return payouts.filter(p => {
      const matchesSearch = !payoutSearch || 
        p.partner_name?.toLowerCase().includes(payoutSearch.toLowerCase())
      const matchesStatus = payoutStatusFilter === "all" || p.status === payoutStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [payouts, payoutSearch, payoutStatusFilter])

  // Export functions
  const exportToExcel = (data: any[], filename: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    toast.success(`Arquivo ${filename} exportado com sucesso!`)
  }

  const exportPartners = () => {
    const data = filteredPartners.map(p => ({
      'Nome': p.nome || 'N/A',
      'Código': p.referral_code || '-',
      'Status': p.status === 'active' ? 'Ativo' : p.status === 'cooldown' ? 'Em Cooldown' : 'Inativo',
      'Dias Restantes Cooldown': p.days_remaining || '-',
      'Fim do Cooldown': p.cooldown_end_date ? formatDate(p.cooldown_end_date) : '-',
      'Total Indicações': p.total_referrals,
      'Indicações Ativas': p.active_referrals,
      'Comissão Total (R$)': p.total_commission_earned.toFixed(2),
      'Stripe Connect': p.stripe_connect_onboarded ? 'Configurado' : p.stripe_connect_account_id ? 'Pendente' : 'Não configurado'
    }))
    exportToExcel(data, 'parceiros_indicacao', 'Parceiros')
  }

  const exportReferrals = () => {
    const data = filteredReferrals.map(r => ({
      'Data': formatDateTime(r.created_at),
      'Indicador': r.referrer_name,
      'Indicado': r.referred_name,
      'Plano': r.subscription_plan || 'N/A',
      'Comissão (R$)': ((r.commission_amount || 0) / 100).toFixed(2),
      'Status': r.status === 'active' ? 'Ativo' : r.status === 'pending' ? 'Pendente' : r.status
    }))
    exportToExcel(data, 'indicacoes', 'Indicações')
  }

  const exportPayouts = () => {
    const data = filteredPayouts.map(p => ({
      'Data Criação': formatDateTime(p.created_at),
      'Parceiro': p.partner_name,
      'Valor (R$)': ((p.amount || 0) / 100).toFixed(2),
      'Status': p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : p.status,
      'Data Pagamento': p.paid_at ? formatDateTime(p.paid_at) : '-'
    }))
    exportToExcel(data, 'pagamentos_comissao', 'Pagamentos')
  }

  const exportAll = () => {
    const wb = XLSX.utils.book_new()
    
    // Partners sheet
    const partnersData = partners.map(p => ({
      'Nome': p.nome || 'N/A',
      'Código': p.referral_code || '-',
      'Status': p.status === 'active' ? 'Ativo' : p.status === 'cooldown' ? 'Em Cooldown' : 'Inativo',
      'Dias Restantes Cooldown': p.days_remaining || '-',
      'Fim do Cooldown': p.cooldown_end_date ? formatDate(p.cooldown_end_date) : '-',
      'Total Indicações': p.total_referrals,
      'Indicações Ativas': p.active_referrals,
      'Comissão Total (R$)': p.total_commission_earned.toFixed(2),
      'Stripe Connect': p.stripe_connect_onboarded ? 'Configurado' : p.stripe_connect_account_id ? 'Pendente' : 'Não configurado'
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partnersData), 'Parceiros')
    
    // Referrals sheet
    const referralsData = referrals.map(r => ({
      'Data': formatDateTime(r.created_at),
      'Indicador': r.referrer_name,
      'Indicado': r.referred_name,
      'Plano': r.subscription_plan || 'N/A',
      'Comissão (R$)': ((r.commission_amount || 0) / 100).toFixed(2),
      'Status': r.status === 'active' ? 'Ativo' : r.status === 'pending' ? 'Pendente' : r.status
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referralsData), 'Indicações')
    
    // Payouts sheet
    const payoutsData = payouts.map(p => ({
      'Data Criação': formatDateTime(p.created_at),
      'Parceiro': p.partner_name,
      'Valor (R$)': ((p.amount || 0) / 100).toFixed(2),
      'Status': p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : p.status,
      'Data Pagamento': p.paid_at ? formatDateTime(p.paid_at) : '-'
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payoutsData), 'Pagamentos')
    
    // Stats sheet
    const statsData = [{
      'Parceiros Ativos': stats.activeReferrers || 0,
      'Em Cooldown': stats.inCooldown || 0,
      'Inativos': stats.inactivePartners || 0,
      'Total Parceiros': stats.totalPartners || 0,
      'Clientes Indicados': stats.totalReferred || 0,
      'Indicações Ativas': stats.activeReferrals || 0,
      'Taxa de Conversão (%)': (stats.conversionRate || 0).toFixed(1),
      'MRR de Indicações (R$)': (stats.referralMrr || 0).toFixed(2),
      'Comissão Total (R$)': (stats.totalCommission || 0).toFixed(2),
      'Comissão Paga (R$)': (stats.paidCommission || 0).toFixed(2),
      'Comissão Pendente (R$)': (stats.pendingCommission || 0).toFixed(2)
    }]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsData), 'Resumo')
    
    XLSX.writeFile(wb, `programa_indicacao_completo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    toast.success('Relatório completo exportado com sucesso!')
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

  const clearFilters = (tab: 'partners' | 'referrals' | 'payouts') => {
    if (tab === 'partners') {
      setPartnerSearch("")
      setPartnerStatusFilter("all")
    } else if (tab === 'referrals') {
      setReferralSearch("")
      setReferralStatusFilter("all")
    } else {
      setPayoutSearch("")
      setPayoutStatusFilter("all")
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Gift className="h-8 w-8 text-orange-500" />
              Programa de Indicação
            </h1>
            <p className="text-muted-foreground">Métricas completas e gestão do programa de afiliados</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportAll} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar Tudo
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
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
            <TabsTrigger value="partners">Parceiros ({filteredPartners.length})</TabsTrigger>
            <TabsTrigger value="referrals">Indicações ({filteredReferrals.length})</TabsTrigger>
            <TabsTrigger value="payouts">Pagamentos ({filteredPayouts.length})</TabsTrigger>
          </TabsList>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Parceiros do Programa</CardTitle>
                    <CardDescription>Todos os usuários que participam ou participaram do programa de indicação</CardDescription>
                  </div>
                  <Button onClick={exportPartners} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou código..."
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={partnerStatusFilter} onValueChange={setPartnerStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="cooldown">Em Cooldown</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  {(partnerSearch || partnerStatusFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => clearFilters('partners')}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
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
                    {filteredPartners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {partners.length === 0 ? 'Nenhum parceiro encontrado' : 'Nenhum resultado para os filtros aplicados'}
                        </TableCell>
                      </TableRow>
                    ) : filteredPartners.map((partner) => (
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Histórico de Indicações</CardTitle>
                    <CardDescription>Todas as indicações realizadas no programa</CardDescription>
                  </div>
                  <Button onClick={exportReferrals} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por indicador ou indicado..."
                      value={referralSearch}
                      onChange={(e) => setReferralSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={referralStatusFilter} onValueChange={setReferralStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  {(referralSearch || referralStatusFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => clearFilters('referrals')}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
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
                    {filteredReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {referrals.length === 0 ? 'Nenhuma indicação encontrada' : 'Nenhum resultado para os filtros aplicados'}
                        </TableCell>
                      </TableRow>
                    ) : filteredReferrals.map((referral) => (
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Histórico de Pagamentos</CardTitle>
                    <CardDescription>Todos os pagamentos de comissões processados</CardDescription>
                  </div>
                  <Button onClick={exportPayouts} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por parceiro..."
                      value={payoutSearch}
                      onChange={(e) => setPayoutSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  {(payoutSearch || payoutStatusFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => clearFilters('payouts')}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
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
                    {filteredPayouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {payouts.length === 0 ? 'Nenhum pagamento encontrado' : 'Nenhum resultado para os filtros aplicados'}
                        </TableCell>
                      </TableRow>
                    ) : filteredPayouts.map((payout) => (
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