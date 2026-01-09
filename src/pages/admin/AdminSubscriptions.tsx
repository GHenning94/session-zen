import { useState, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  CreditCard, Loader2, RefreshCcw, Users, DollarSign, TrendingUp, 
  Calendar, Search, X, Download, Eye, Edit, AlertTriangle,
  CheckCircle, XCircle, Clock, Gift, UserCheck, ShieldAlert
} from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import * as XLSX from "xlsx"
import { ScrollArea } from "@/components/ui/scroll-area"

interface User {
  user_id: string
  nome: string
  email: string
  profissao: string
  subscription_plan: string
  billing_interval: string | null
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  next_billing_date: string | null
  current_amount: number
  cancel_at_period_end: boolean
  cancel_at: string | null
  trial_end: string | null
  is_referred: boolean
  referrer_name: string | null
  referrer_id: string | null
  is_referral_partner: boolean
  referral_code: string | null
  created_at: string
}

interface Stats {
  totalUsers: number
  freeUsers: number
  proUsers: number
  premiumUsers: number
  monthlyUsers: number
  annualUsers: number
  activeSubscriptions: number
  trialSubscriptions: number
  cancelingSubscriptions: number
  cancelledSubscriptions: number
  mrrPro: number
  mrrPremium: number
  totalMrr: number
  activeAffiliates: number
  activeReferred: number
  pendingCommissions: number
  approvedCommissions: number
  paidCommissions: number
  cancelledCommissions: number
  fraudSignalsCount: number
}

const AdminSubscriptions = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [actionType, setActionType] = useState<string>("")
  const [actionReason, setActionReason] = useState("")
  const [newPlan, setNewPlan] = useState("basico")
  const [trialDays, setTrialDays] = useState(14)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Filters
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [intervalFilter, setIntervalFilter] = useState("all")
  const [referredFilter, setReferredFilter] = useState("all")
  const [affiliateFilter, setAffiliateFilter] = useState("all")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await adminApiCall('admin-get-subscriptions-stats', {
        filters: {
          plan: planFilter,
          status: statusFilter,
          interval: intervalFilter,
          isReferred: referredFilter,
          isAffiliate: affiliateFilter,
          search
        }
      })
      if (error) throw error
      setStats(data.stats || null)
      setUsers(data.users || [])
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'premium':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Premium</Badge>
      case 'pro':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Profissional</Badge>
      default:
        return <Badge variant="outline">Free</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativa</Badge>
      case 'trial':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Trial</Badge>
      case 'cancel_at_period_end':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Cancelando</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Cancelada</Badge>
      case 'free':
        return <Badge variant="outline">Free</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAction = (user: User, action: string) => {
    setSelectedUser(user)
    setActionType(action)
    setActionReason("")
    setNewPlan(user.subscription_plan === 'premium' ? 'pro' : 'basico')
    setActionModalOpen(true)
  }

  const handleViewDetails = (user: User) => {
    setSelectedUser(user)
    setDetailsModalOpen(true)
  }

  const executeAction = async () => {
    if (!selectedUser || !actionType) return
    
    try {
      setIsSubmitting(true)
      
      const { data, error } = await adminApiCall('admin-manage-subscription', {
        action: actionType,
        userId: selectedUser.user_id,
        newPlan,
        reason: actionReason,
        trialDays,
        immediate: actionType === 'change_plan_immediate' || actionType === 'cancel_subscription'
      })

      if (error) throw error

      toast.success(data.message || 'Ação executada com sucesso')
      setActionModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar ação')
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportToExcel = () => {
    const data = users.map(u => ({
      'Nome': u.nome,
      'Email': u.email,
      'Plano': u.subscription_plan,
      'Intervalo': u.billing_interval === 'month' ? 'Mensal' : u.billing_interval === 'year' ? 'Anual' : '-',
      'Status': u.subscription_status,
      'Próxima Cobrança': formatDate(u.next_billing_date),
      'Valor': u.current_amount / 100,
      'É Indicado': u.is_referred ? 'Sim' : 'Não',
      'Indicador': u.referrer_name || '-',
      'É Afiliado': u.is_referral_partner ? 'Sim' : 'Não',
      'Cadastro': formatDate(u.created_at)
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Assinaturas')
    XLSX.writeFile(wb, `assinaturas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    toast.success('Relatório exportado!')
  }

  const clearFilters = () => {
    setSearch("")
    setPlanFilter("all")
    setStatusFilter("all")
    setIntervalFilter("all")
    setReferredFilter("all")
    setAffiliateFilter("all")
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (search) {
        const s = search.toLowerCase()
        if (!u.nome?.toLowerCase().includes(s) && !u.email?.toLowerCase().includes(s)) {
          return false
        }
      }
      if (planFilter !== 'all' && u.subscription_plan !== planFilter) return false
      if (statusFilter !== 'all' && u.subscription_status !== statusFilter) return false
      if (intervalFilter !== 'all' && u.billing_interval !== intervalFilter) return false
      if (referredFilter === 'yes' && !u.is_referred) return false
      if (referredFilter === 'no' && u.is_referred) return false
      if (affiliateFilter === 'yes' && !u.is_referral_partner) return false
      if (affiliateFilter === 'no' && u.is_referral_partner) return false
      return true
    })
  }, [users, search, planFilter, statusFilter, intervalFilter, referredFilter, affiliateFilter])

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
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              Planos & Assinaturas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie planos, assinaturas e faça mudanças manuais
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats Cards - Row 1: Usuários */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <MetricCard title="Total Usuários" value={stats?.totalUsers || 0} icon={Users} />
          <MetricCard title="Free" value={stats?.freeUsers || 0} icon={Users} />
          <MetricCard title="Profissional" value={stats?.proUsers || 0} icon={Users} borderColor="border-l-blue-500" />
          <MetricCard title="Premium" value={stats?.premiumUsers || 0} icon={Users} borderColor="border-l-purple-500" />
          <MetricCard title="MRR Total" value={formatCurrency(stats?.totalMrr || 0)} icon={DollarSign} borderColor="border-l-green-500" />
        </div>

        {/* Stats Cards - Row 2: Assinaturas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard title="Mensais" value={stats?.monthlyUsers || 0} icon={Calendar} />
          <MetricCard title="Anuais" value={stats?.annualUsers || 0} icon={Calendar} borderColor="border-l-green-500" />
          <MetricCard title="Ativas" value={stats?.activeSubscriptions || 0} icon={CheckCircle} borderColor="border-l-green-500" />
          <MetricCard title="Trial" value={stats?.trialSubscriptions || 0} icon={Clock} borderColor="border-l-amber-500" />
          <MetricCard title="Cancelando" value={stats?.cancelingSubscriptions || 0} icon={AlertTriangle} borderColor="border-l-orange-500" />
          <MetricCard title="Canceladas" value={stats?.cancelledSubscriptions || 0} icon={XCircle} borderColor="border-l-red-500" />
        </div>

        {/* Stats Cards - Row 3: Indicações & Comissões */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard title="Afiliados Ativos" value={stats?.activeAffiliates || 0} icon={UserCheck} borderColor="border-l-blue-500" />
          <MetricCard title="Indicados Ativos" value={stats?.activeReferred || 0} icon={Gift} borderColor="border-l-purple-500" />
          <MetricCard title="Comissões Pendentes" value={formatCurrency(stats?.pendingCommissions || 0)} icon={Clock} borderColor="border-l-amber-500" />
          <MetricCard title="Comissões Aprovadas" value={formatCurrency(stats?.approvedCommissions || 0)} icon={CheckCircle} borderColor="border-l-blue-500" />
          <MetricCard title="Comissões Pagas" value={formatCurrency(stats?.paidCommissions || 0)} icon={DollarSign} borderColor="border-l-green-500" />
          <MetricCard title="Fraudes Sinalizadas" value={stats?.fraudSignalsCount || 0} icon={ShieldAlert} borderColor="border-l-red-500" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div>
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="basico">Free</SelectItem>
                  <SelectItem value="pro">Profissional</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancel_at_period_end">Cancelando</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
              <Select value={intervalFilter} onValueChange={setIntervalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Intervalo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={referredFilter} onValueChange={setReferredFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Indicados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">É indicado</SelectItem>
                  <SelectItem value="no">Não é indicado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Afiliados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">É afiliado</SelectItem>
                  <SelectItem value="no">Não é afiliado</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              {filteredUsers.length} de {users.length} usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome / Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Próx. Cobrança</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Indicado?</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.nome}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(user.subscription_plan)}</TableCell>
                      <TableCell>
                        {user.billing_interval === 'month' ? 'Mensal' : 
                         user.billing_interval === 'year' ? 'Anual' : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.subscription_status)}</TableCell>
                      <TableCell>{formatDate(user.next_billing_date)}</TableCell>
                      <TableCell>{user.current_amount ? formatCurrency(user.current_amount / 100) : '-'}</TableCell>
                      <TableCell>
                        {user.is_referred ? (
                          <Badge className="bg-green-500/10 text-green-600">Sim</Badge>
                        ) : (
                          <span className="text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                      <TableCell>{user.referrer_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(user)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAction(user, 'change_plan_immediate')}
                            title="Ações de plano"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
              <DialogDescription>
                Informações completas de {selectedUser?.nome}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{selectedUser.nome}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Plano Atual</Label>
                    <div className="mt-1">{getPlanBadge(selectedUser.subscription_plan)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Intervalo</Label>
                    <p className="font-medium">
                      {selectedUser.billing_interval === 'month' ? 'Mensal' : 
                       selectedUser.billing_interval === 'year' ? 'Anual' : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedUser.subscription_status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Atual</Label>
                    <p className="font-medium">
                      {selectedUser.current_amount ? formatCurrency(selectedUser.current_amount / 100) : '-'}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Dados Stripe</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground text-xs">stripe_customer_id</Label>
                      <p className="font-mono text-xs break-all">{selectedUser.stripe_customer_id || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">stripe_subscription_id</Label>
                      <p className="font-mono text-xs break-all">{selectedUser.stripe_subscription_id || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">current_period_start</Label>
                      <p>{formatDate(selectedUser.current_period_start)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">current_period_end</Label>
                      <p>{formatDate(selectedUser.current_period_end)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Próxima Cobrança</Label>
                      <p>{formatDate(selectedUser.next_billing_date)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Trial End</Label>
                      <p>{formatDate(selectedUser.trial_end)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Programa de Indicação</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground text-xs">É indicado?</Label>
                      <p>{selectedUser.is_referred ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Indicador</Label>
                      <p>{selectedUser.referrer_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">É afiliado?</Label>
                      <p>{selectedUser.is_referral_partner ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Código de indicação</Label>
                      <p className="font-mono">{selectedUser.referral_code || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setDetailsModalOpen(false)
                if (selectedUser) handleAction(selectedUser, 'change_plan_immediate')
              }}>
                Gerenciar Plano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Modal */}
        <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ações de Plano - {selectedUser?.nome}</DialogTitle>
              <DialogDescription>
                Plano atual: {selectedUser?.subscription_plan || 'Free'}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="immediate" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="immediate">Imediato</TabsTrigger>
                <TabsTrigger value="scheduled">Fim do Ciclo</TabsTrigger>
                <TabsTrigger value="trial">Trial</TabsTrigger>
              </TabsList>
              
              <TabsContent value="immediate" className="space-y-4 mt-4">
                <div>
                  <Label>Novo Plano</Label>
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico">Free</SelectItem>
                      <SelectItem value="pro">Profissional</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Motivo (obrigatório)</Label>
                  <Textarea 
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Ex: Solicitação do usuário, erro de cobrança, teste interno..."
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-600">⚠️ Atenção</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Cancela a assinatura no Stripe imediatamente</li>
                    <li>• Remove acesso ao plano atual na hora</li>
                    <li>• Cancela cobranças futuras</li>
                    <li>• Cancela comissões pendentes</li>
                  </ul>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => { setActionType('change_plan_immediate'); executeAction() }}
                  disabled={!actionReason || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Alterar Plano Imediatamente
                </Button>
              </TabsContent>
              
              <TabsContent value="scheduled" className="space-y-4 mt-4">
                <div>
                  <Label>Novo Plano (após ciclo atual)</Label>
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico">Free</SelectItem>
                      <SelectItem value="pro">Profissional</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Textarea 
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Motivo da mudança programada..."
                  />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-600">ℹ️ Comportamento</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Mantém plano atual até fim do período</li>
                    <li>• Mudança ocorre em: {formatDate(selectedUser?.current_period_end)}</li>
                    <li>• Comissões seguem regra do novo plano</li>
                  </ul>
                </div>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => { setActionType('change_plan_end_of_cycle'); executeAction() }}
                  disabled={!selectedUser?.stripe_subscription_id || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Agendar Mudança
                </Button>
              </TabsContent>
              
              <TabsContent value="trial" className="space-y-4 mt-4">
                <div>
                  <Label>Plano do Trial</Label>
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">Profissional</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração (dias)</Label>
                  <Input 
                    type="number" 
                    value={trialDays} 
                    onChange={(e) => setTrialDays(parseInt(e.target.value) || 14)}
                    min={1}
                    max={90}
                  />
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Textarea 
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Ex: Teste interno, demonstração para cliente..."
                  />
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
                  <p className="font-medium text-green-600">✅ Trial Gratuito</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Não cria assinatura paga</li>
                    <li>• Não gera comissão de indicação</li>
                    <li>• Ao expirar, retorna para Free</li>
                    <li>• Totalmente auditável</li>
                  </ul>
                </div>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => { setActionType('grant_trial'); executeAction() }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Conceder Trial de {trialDays} dias
                </Button>
              </TabsContent>
            </Tabs>
            
            {selectedUser?.subscription_status === 'active' && (
              <div className="border-t pt-4 mt-4">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => { setActionType('cancel_subscription'); executeAction() }}
                  disabled={isSubmitting}
                >
                  Cancelar Assinatura Imediatamente
                </Button>
              </div>
            )}
            
            {selectedUser?.subscription_status === 'cancel_at_period_end' && (
              <div className="border-t pt-4 mt-4">
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => { setActionType('reactivate_subscription'); executeAction() }}
                  disabled={isSubmitting}
                >
                  Reativar Assinatura
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

export default AdminSubscriptions
