import { useState, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Gift, Loader2, RefreshCcw, Users, DollarSign, TrendingUp, Percent, Clock, UserMinus, UserCheck, CreditCard, AlertCircle, Download, Search, X, FileText, Filter, Eye, AlertTriangle, ShieldAlert, CheckCircle, XCircle, Ban, Info } from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import * as XLSX from "xlsx"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

interface Partner {
  user_id: string
  nome: string
  is_referral_partner: boolean
  referral_code: string | null
  left_referral_program_at: string | null
  created_at: string
  status: 'active' | 'cooldown' | 'inactive'
  cooldown_status: 'none' | 'active' | 'expired'
  cooldown_end_date: string | null
  days_remaining: number | null
  total_referrals: number
  active_referrals: number
  total_commission_earned: number
  total_paid: number
  total_pending: number
  last_payout_at: string | null
  has_bank_details: boolean
  banco?: string
  agencia?: string
  conta?: string
  chave_pix?: string
}

interface Referral {
  id: string
  referrer_user_id: string
  referred_user_id: string
  referrer_name: string
  referred_name: string
  subscription_plan: string
  referred_current_plan: string
  commission_amount: number
  commission_rate: number
  status: string
  created_at: string
  first_payment_date: string | null
}

interface Payout {
  id: string
  referrer_user_id: string
  referred_user_id: string | null
  referrer_name: string
  referred_name: string
  amount: number
  amount_paid: number | null
  net_amount: number | null
  gateway_fee: number | null
  commission_rate: number | null
  status: string
  payment_type: string | null
  billing_interval: string | null
  referred_plan: string | null
  gateway_invoice_id: string | null
  gateway_event_id: string | null
  gateway_subscription_id: string | null
  approval_deadline: string | null
  failure_reason: string | null
  created_at: string
  paid_at: string | null
  approved_at: string | null
  period_start: string | null
  period_end: string | null
}

interface FraudSignal {
  id: string
  referrer_user_id: string
  referred_user_id: string
  referrer_name: string
  referred_name: string
  signal_type: string
  signal_value: string | null
  detected_at: string
  reviewed: boolean
  reviewed_at: string | null
  reviewed_by: string | null
  action_taken: string | null
  notes: string | null
}

interface AuditLog {
  id: string
  action: string
  referrer_user_id: string | null
  referred_user_id: string | null
  referrer_name: string | null
  referred_name: string | null
  gateway: string | null
  gross_amount: number | null
  gateway_fee: number | null
  net_amount: number | null
  commission_amount: number | null
  commission_rate: number | null
  discount_applied: boolean | null
  discount_amount: number | null
  previous_plan: string | null
  new_plan: string | null
  billing_interval: string | null
  proration_credit: number | null
  proration_charge: number | null
  status: string | null
  failure_reason: string | null
  ineligibility_reason: string | null
  created_at: string
}

interface LogStats {
  totalLogs: number
  byAction: Record<string, number>
  byGateway: Record<string, number>
  byStatus: Record<string, number>
  totalGrossAmount: number
  totalNetAmount: number
  totalCommissions: number
  totalGatewayFees: number
}

const AdminReferrals = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [fraudSignals, setFraudSignals] = useState<FraudSignal[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [logStats, setLogStats] = useState<LogStats | null>(null)
  const [logsLoading, setLogsLoading] = useState(false)
  
  // Selected items for detail modals
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  
  // Filters
  const [partnerSearch, setPartnerSearch] = useState("")
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>("all")
  const [referralSearch, setReferralSearch] = useState("")
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>("all")
  const [payoutSearch, setPayoutSearch] = useState("")
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all")
  const [fraudSearch, setFraudSearch] = useState("")
  const [fraudReviewedFilter, setFraudReviewedFilter] = useState<string>("all")
  // Log filters
  const [logActionFilter, setLogActionFilter] = useState<string>("all")
  const [logGatewayFilter, setLogGatewayFilter] = useState<string>("all")
  const [logStatusFilter, setLogStatusFilter] = useState<string>("all")
  const [logSearch, setLogSearch] = useState("")

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
      setFraudSignals(data.fraudSignals || [])
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const filters: Record<string, string> = {}
      if (logActionFilter !== 'all') filters.action = logActionFilter
      if (logGatewayFilter !== 'all') filters.gateway = logGatewayFilter
      if (logStatusFilter !== 'all') filters.status = logStatusFilter
      
      const { data, error } = await adminApiCall('admin-get-referral-logs', { filters })
      if (error) throw error
      setAuditLogs(data.logs || [])
      setLogStats(data.stats || null)
    } catch (error) {
      toast.error('Erro ao carregar logs')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    if (value === 'logs' && auditLogs.length === 0) {
      fetchLogs()
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
        p.referrer_name?.toLowerCase().includes(payoutSearch.toLowerCase()) ||
        p.referred_name?.toLowerCase().includes(payoutSearch.toLowerCase())
      const matchesStatus = payoutStatusFilter === "all" || p.status === payoutStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [payouts, payoutSearch, payoutStatusFilter])

  const filteredFraudSignals = useMemo(() => {
    return fraudSignals.filter(f => {
      const matchesSearch = !fraudSearch || 
        f.referrer_name?.toLowerCase().includes(fraudSearch.toLowerCase()) ||
        f.referred_name?.toLowerCase().includes(fraudSearch.toLowerCase()) ||
        f.signal_type?.toLowerCase().includes(fraudSearch.toLowerCase())
      const matchesReviewed = fraudReviewedFilter === "all" || 
        (fraudReviewedFilter === "reviewed" && f.reviewed) ||
        (fraudReviewedFilter === "pending" && !f.reviewed)
      return matchesSearch && matchesReviewed
    })
  }, [fraudSignals, fraudSearch, fraudReviewedFilter])

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = !logSearch || 
        log.referrer_name?.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.referred_name?.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.action?.toLowerCase().includes(logSearch.toLowerCase())
      return matchesSearch
    })
  }, [auditLogs, logSearch])

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
      'Comissão Paga (R$)': p.total_paid.toFixed(2),
      'Comissão Pendente (R$)': p.total_pending.toFixed(2),
      'Dados Bancários': p.has_bank_details ? 'Sim' : 'Não',
      'Último Pagamento': p.last_payout_at ? formatDate(p.last_payout_at) : '-'
    }))
    exportToExcel(data, 'parceiros_indicacao', 'Parceiros')
  }

  const exportReferrals = () => {
    const data = filteredReferrals.map(r => ({
      'Data': formatDateTime(r.created_at),
      'Indicador': r.referrer_name,
      'Indicado': r.referred_name,
      'Plano Indicado': r.subscription_plan || 'N/A',
      'Plano Atual': r.referred_current_plan || 'N/A',
      'Comissão (R$)': ((r.commission_amount || 0) / 100).toFixed(2),
      'Taxa Comissão (%)': r.commission_rate ? (r.commission_rate * 100).toFixed(0) : '-',
      'Primeiro Pagamento': r.first_payment_date ? formatDate(r.first_payment_date) : '-',
      'Status': r.status === 'active' ? 'Ativo' : r.status === 'pending' ? 'Pendente' : r.status
    }))
    exportToExcel(data, 'indicacoes', 'Indicações')
  }

  const exportPayouts = () => {
    const data = filteredPayouts.map(p => ({
      'ID': p.id,
      'Data Criação': formatDateTime(p.created_at),
      'Afiliado': p.referrer_name,
      'Indicado': p.referred_name,
      'Plano': p.referred_plan || '-',
      'Ciclo': p.billing_interval || '-',
      'Tipo': p.payment_type || '-',
      'Valor Bruto (R$)': ((p.amount || 0) / 100).toFixed(2),
      'Taxa Gateway (R$)': ((p.gateway_fee || 0) / 100).toFixed(2),
      'Valor Líquido (R$)': ((p.net_amount || p.amount || 0) / 100).toFixed(2),
      'Taxa Comissão (%)': p.commission_rate ? (p.commission_rate * 100).toFixed(0) : '-',
      'Status': p.status,
      'Aprovado em': p.approved_at ? formatDateTime(p.approved_at) : '-',
      'Deadline Aprovação': p.approval_deadline ? formatDate(p.approval_deadline) : '-',
      'Pago em': p.paid_at ? formatDateTime(p.paid_at) : '-',
      'Motivo Cancelamento': p.failure_reason || '-',
      'Gateway Invoice ID': p.gateway_invoice_id || '-',
      'Gateway Event ID': p.gateway_event_id || '-'
    }))
    exportToExcel(data, 'pagamentos_comissao', 'Pagamentos')
  }

  const exportFraudSignals = () => {
    const data = filteredFraudSignals.map(f => ({
      'Data Detecção': formatDateTime(f.detected_at),
      'Tipo': getFraudTypeLabel(f.signal_type),
      'Indicador': f.referrer_name,
      'Indicado': f.referred_name,
      'Valor Sinal': f.signal_value || '-',
      'Revisado': f.reviewed ? 'Sim' : 'Não',
      'Revisado em': f.reviewed_at ? formatDateTime(f.reviewed_at) : '-',
      'Ação Tomada': f.action_taken || '-',
      'Notas': f.notes || '-'
    }))
    exportToExcel(data, 'sinais_fraude', 'Fraudes')
  }

  const exportAll = () => {
    const wb = XLSX.utils.book_new()
    
    // Partners sheet
    const partnersData = partners.map(p => ({
      'Nome': p.nome || 'N/A',
      'Código': p.referral_code || '-',
      'Status': p.status === 'active' ? 'Ativo' : p.status === 'cooldown' ? 'Em Cooldown' : 'Inativo',
      'Total Indicações': p.total_referrals,
      'Comissão Total (R$)': p.total_commission_earned.toFixed(2),
      'Comissão Paga (R$)': p.total_paid.toFixed(2)
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partnersData), 'Parceiros')
    
    // Referrals sheet
    const referralsData = referrals.map(r => ({
      'Data': formatDateTime(r.created_at),
      'Indicador': r.referrer_name,
      'Indicado': r.referred_name,
      'Plano': r.subscription_plan || 'N/A',
      'Comissão (R$)': ((r.commission_amount || 0) / 100).toFixed(2),
      'Status': r.status
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referralsData), 'Indicações')
    
    // Payouts sheet
    const payoutsData = payouts.map(p => ({
      'Data Criação': formatDateTime(p.created_at),
      'Afiliado': p.referrer_name,
      'Indicado': p.referred_name,
      'Valor (R$)': ((p.amount || 0) / 100).toFixed(2),
      'Status': p.status,
      'Data Pagamento': p.paid_at ? formatDateTime(p.paid_at) : '-'
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payoutsData), 'Pagamentos')
    
    // Fraud signals sheet
    const fraudData = fraudSignals.map(f => ({
      'Data': formatDateTime(f.detected_at),
      'Tipo': f.signal_type,
      'Indicador': f.referrer_name,
      'Indicado': f.referred_name,
      'Revisado': f.reviewed ? 'Sim' : 'Não'
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fraudData), 'Fraudes')
    
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
      'Comissão Pendente (R$)': (stats.pendingCommission || 0).toFixed(2),
      'Comissão Aprovada (R$)': (stats.approvedCommission || 0).toFixed(2),
      'Comissão Paga (R$)': (stats.paidCommission || 0).toFixed(2),
      'Comissão Cancelada (R$)': (stats.cancelledCommission || 0).toFixed(2),
      'Sinais de Fraude': stats.fraudSignalCount || 0
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
      case 'approved':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Aprovado</Badge>
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Pago</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getFraudTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'same_cpf': 'CPF Igual',
      'same_card': 'Cartão Igual',
      'same_phone': 'Telefone Igual',
      'same_ip': 'IP Igual',
      'same_device': 'Dispositivo Igual',
      'shared_customer_id': 'Customer ID Igual',
      'combined_warnings': 'Múltiplos Sinais'
    }
    return typeMap[type] || type
  }

  const getFraudSeverityBadge = (type: string) => {
    const criticalTypes = ['same_cpf', 'same_card', 'shared_customer_id', 'combined_warnings']
    const isCritical = criticalTypes.includes(type)
    
    return isCritical ? (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Crítico
      </Badge>
    ) : (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
        <Info className="h-3 w-3 mr-1" />
        Aviso
      </Badge>
    )
  }

  const clearFilters = (tab: 'partners' | 'referrals' | 'payouts' | 'fraud' | 'logs') => {
    if (tab === 'partners') {
      setPartnerSearch("")
      setPartnerStatusFilter("all")
    } else if (tab === 'referrals') {
      setReferralSearch("")
      setReferralStatusFilter("all")
    } else if (tab === 'fraud') {
      setFraudSearch("")
      setFraudReviewedFilter("all")
    } else if (tab === 'logs') {
      setLogSearch("")
      setLogActionFilter("all")
      setLogGatewayFilter("all")
      setLogStatusFilter("all")
      fetchLogs()
    } else {
      setPayoutSearch("")
      setPayoutStatusFilter("all")
    }
  }

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; className: string }> = {
      'signup': { label: 'Cadastro', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      'payment': { label: 'Pagamento', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'upgrade': { label: 'Upgrade', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      'downgrade': { label: 'Downgrade', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      'commission_created': { label: 'Comissão Criada', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      'commission_approved': { label: 'Comissão Aprovada', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'commission_cancelled': { label: 'Comissão Cancelada', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      'payout': { label: 'Pagamento', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'refund': { label: 'Estorno', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      'chargeback': { label: 'Chargeback', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    }
    const config = actionMap[action] || { label: action, className: 'bg-muted text-muted-foreground' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getGatewayBadge = (gateway: string | null) => {
    if (!gateway) return <span className="text-muted-foreground">-</span>
    const gatewayMap: Record<string, { label: string; className: string }> = {
      'stripe': { label: 'Stripe', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      'asaas': { label: 'Asaas', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    }
    const config = gatewayMap[gateway] || { label: gateway, className: 'bg-muted text-muted-foreground' }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const exportLogs = () => {
    const data = filteredLogs.map(log => ({
      'Data': formatDateTime(log.created_at),
      'Ação': log.action,
      'Gateway': log.gateway || '-',
      'Indicador': log.referrer_name || '-',
      'Indicado': log.referred_name || '-',
      'Valor Bruto': log.gross_amount ? (log.gross_amount / 100).toFixed(2) : '-',
      'Taxa Gateway': log.gateway_fee ? (log.gateway_fee / 100).toFixed(2) : '-',
      'Valor Líquido': log.net_amount ? (log.net_amount / 100).toFixed(2) : '-',
      'Comissão': log.commission_amount ? (log.commission_amount / 100).toFixed(2) : '-',
      'Taxa Comissão (%)': log.commission_rate ? (log.commission_rate * 100).toFixed(0) : '-',
      'Status': log.status || '-',
      'Motivo Falha': log.failure_reason || '-'
    }))
    exportToExcel(data, 'logs_indicacao', 'Logs')
  }

  // Get partner's referrals for detail view
  const getPartnerReferrals = (partnerId: string) => {
    return referrals.filter(r => r.referrer_user_id === partnerId)
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

        {/* Main Stats - Partners */}
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
            title="Indicados Ativos" 
            value={stats.activeReferrals || 0} 
            icon={TrendingUp} 
            borderColor="border-l-blue-500" 
          />
          <MetricCard 
            title="Conversão" 
            value={`${(stats.conversionRate || 0).toFixed(1)}%`} 
            tooltip="Porcentagem de indicados que se tornaram pagantes" 
            icon={Percent} 
            borderColor="border-l-purple-500" 
          />
        </div>

        {/* Commission Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard 
            title="Comissão Pendente" 
            value={formatCurrency(stats.pendingCommission || 0)} 
            icon={Clock} 
            borderColor="border-l-amber-500" 
          />
          <MetricCard 
            title="Comissão Aprovada" 
            value={formatCurrency(stats.approvedCommission || 0)} 
            icon={CheckCircle} 
            borderColor="border-l-blue-500" 
          />
          <MetricCard 
            title="Comissão Paga" 
            value={formatCurrency(stats.paidCommission || 0)} 
            icon={CreditCard} 
            borderColor="border-l-green-500" 
          />
          <MetricCard 
            title="Comissão Cancelada" 
            value={formatCurrency(stats.cancelledCommission || 0)} 
            icon={XCircle} 
            borderColor="border-l-red-500" 
          />
          <MetricCard 
            title="Sinais de Fraude" 
            value={stats.fraudSignalCount || 0} 
            icon={ShieldAlert} 
            tooltip={`${stats.unreviewedFraudSignals || 0} não revisados`}
            borderColor="border-l-red-500" 
          />
        </div>

        {/* Tabs for detailed data */}
        <Tabs defaultValue="partners" className="space-y-4" onValueChange={handleTabChange}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="partners">Afiliados ({filteredPartners.length})</TabsTrigger>
            <TabsTrigger value="referrals">Indicações ({filteredReferrals.length})</TabsTrigger>
            <TabsTrigger value="payouts">Comissões ({filteredPayouts.length})</TabsTrigger>
            <TabsTrigger value="fraud" className="flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" />
              Antifraude ({filteredFraudSignals.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Logs ({filteredLogs.length})
            </TabsTrigger>
          </TabsList>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Afiliados do Programa</CardTitle>
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
                      <TableHead>Indicações</TableHead>
                      <TableHead>Comissão Total</TableHead>
                      <TableHead>Pago / Pendente</TableHead>
                      <TableHead>Dados Bancários</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {partners.length === 0 ? 'Nenhum afiliado encontrado' : 'Nenhum resultado para os filtros aplicados'}
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
                          <div className="flex flex-col">
                            <span className="font-medium">{partner.total_referrals}</span>
                            <span className="text-xs text-muted-foreground">
                              {partner.active_referrals} ativas
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(partner.total_commission_earned)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="text-green-600">{formatCurrency(partner.total_paid)}</span>
                            <span className="text-amber-600">{formatCurrency(partner.total_pending)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {partner.has_bank_details ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Configurado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Não configurado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPartner(partner)}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
                      <TableHead>Plano Atual</TableHead>
                      <TableHead>Gera Comissão?</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {referrals.length === 0 ? 'Nenhuma indicação encontrada' : 'Nenhum resultado para os filtros aplicados'}
                        </TableCell>
                      </TableRow>
                    ) : filteredReferrals.map((referral) => {
                      const generatesCommission = referral.status === 'active' && 
                        ['pro', 'premium'].includes(referral.referred_current_plan)
                      return (
                        <TableRow key={referral.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(referral.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">{referral.referrer_name}</TableCell>
                          <TableCell>{referral.referred_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{referral.subscription_plan || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{referral.referred_current_plan || 'free'}</Badge>
                          </TableCell>
                          <TableCell>
                            {generatesCommission ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sim
                              </Badge>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-muted-foreground">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Não
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {referral.status !== 'active' 
                                      ? 'Indicação não está ativa' 
                                      : 'Usuário não possui plano pago'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(referral.status)}</TableCell>
                        </TableRow>
                      )
                    })}
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
                    <CardTitle>Comissões (Payouts)</CardTitle>
                    <CardDescription>Todos os pagamentos de comissões com snapshot imutável</CardDescription>
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
                      placeholder="Buscar por afiliado ou indicado..."
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
                      <SelectItem value="approved">Aprovado</SelectItem>
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
                      <TableHead>Data</TableHead>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Indicado</TableHead>
                      <TableHead>Plano / Ciclo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Taxa (%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {payouts.length === 0 ? 'Nenhum payout encontrado' : 'Nenhum resultado para os filtros aplicados'}
                        </TableCell>
                      </TableRow>
                    ) : filteredPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(payout.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{payout.referrer_name}</TableCell>
                        <TableCell>{payout.referred_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge variant="outline" className="w-fit">{payout.referred_plan || '-'}</Badge>
                            <span className="text-xs text-muted-foreground">{payout.billing_interval || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{formatCurrency((payout.amount || 0) / 100)}</span>
                            {payout.gateway_fee && (
                              <span className="text-xs text-muted-foreground">
                                -{formatCurrency(payout.gateway_fee / 100)} taxa
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payout.commission_rate ? `${(payout.commission_rate * 100).toFixed(0)}%` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell className="text-sm">
                          {payout.approval_deadline ? formatDate(payout.approval_deadline) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPayout(payout)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fraud Signals Tab */}
          <TabsContent value="fraud">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-500" />
                      Sinais de Fraude
                    </CardTitle>
                    <CardDescription>Detecção automática de padrões suspeitos no programa de indicação</CardDescription>
                  </div>
                  <Button onClick={exportFraudSignals} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
                
                {/* Fraud Rules Info */}
                <div className="p-4 rounded-lg bg-muted/50 border mt-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Regras de Bloqueio de Comissão
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">🔴 Bloqueio Imediato (Crítico):</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>CPF do indicado = CPF do indicador</li>
                        <li>Cartão/fingerprint igual</li>
                        <li>Stripe customer_id igual</li>
                        <li>2+ sinais de aviso simultâneos</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">🟡 Sinais de Aviso (não bloqueiam sozinhos):</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Telefone igual</li>
                        <li>IP igual (mesmo recorrente)</li>
                        <li>Dispositivo igual</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou tipo..."
                      value={fraudSearch}
                      onChange={(e) => setFraudSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={fraudReviewedFilter} onValueChange={setFraudReviewedFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Status Revisão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="reviewed">Revisados</SelectItem>
                    </SelectContent>
                  </Select>
                  {(fraudSearch || fraudReviewedFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => clearFilters('fraud')}>
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
                      <TableHead>Data Detecção</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Indicador</TableHead>
                      <TableHead>Indicado</TableHead>
                      <TableHead>Valor Detectado</TableHead>
                      <TableHead>Revisado</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFraudSignals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {fraudSignals.length === 0 ? 'Nenhum sinal de fraude detectado' : 'Nenhum resultado para os filtros aplicados'}
                        </TableCell>
                      </TableRow>
                    ) : filteredFraudSignals.map((signal) => (
                      <TableRow key={signal.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(signal.detected_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getFraudTypeLabel(signal.signal_type)}</Badge>
                        </TableCell>
                        <TableCell>{getFraudSeverityBadge(signal.signal_type)}</TableCell>
                        <TableCell className="font-medium">{signal.referrer_name}</TableCell>
                        <TableCell>{signal.referred_name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {signal.signal_value || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          {signal.reviewed ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {signal.action_taken ? (
                            <Badge variant="outline">{signal.action_taken}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Logs de Indicação
                    </CardTitle>
                    <CardDescription>Registro detalhado de todas as transações do programa</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={fetchLogs} variant="outline" size="sm" disabled={logsLoading}>
                      {logsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      <span className="ml-2 hidden sm:inline">Atualizar</span>
                    </Button>
                    <Button onClick={exportLogs} variant="outline" size="sm" disabled={filteredLogs.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
                
                {/* Log Stats Summary */}
                {logStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Total Logs</p>
                      <p className="text-lg font-bold">{logStats.totalLogs}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-muted-foreground">Valor Bruto Total</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(logStats.totalGrossAmount / 100)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-muted-foreground">Comissões Totais</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(logStats.totalCommissions / 100)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-xs text-muted-foreground">Taxas Gateway</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(logStats.totalGatewayFees / 100)}</p>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou ação..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={logActionFilter} onValueChange={(v) => { setLogActionFilter(v); fetchLogs() }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Ação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as ações</SelectItem>
                      <SelectItem value="signup">Cadastro</SelectItem>
                      <SelectItem value="payment">Pagamento</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                      <SelectItem value="downgrade">Downgrade</SelectItem>
                      <SelectItem value="commission_created">Comissão Criada</SelectItem>
                      <SelectItem value="commission_approved">Comissão Aprovada</SelectItem>
                      <SelectItem value="commission_cancelled">Comissão Cancelada</SelectItem>
                      <SelectItem value="refund">Estorno</SelectItem>
                      <SelectItem value="chargeback">Chargeback</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={logGatewayFilter} onValueChange={(v) => { setLogGatewayFilter(v); fetchLogs() }}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="asaas">Asaas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={logStatusFilter} onValueChange={(v) => { setLogStatusFilter(v); fetchLogs() }}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                  {(logSearch || logActionFilter !== "all" || logGatewayFilter !== "all" || logStatusFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => clearFilters('logs')}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Data</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Gateway</TableHead>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Indicado</TableHead>
                          <TableHead className="text-right">Valor Bruto</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              {auditLogs.length === 0 ? 'Nenhum log encontrado' : 'Nenhum resultado para os filtros aplicados'}
                            </TableCell>
                          </TableRow>
                        ) : filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.created_at)}
                            </TableCell>
                            <TableCell>{getActionBadge(log.action)}</TableCell>
                            <TableCell>{getGatewayBadge(log.gateway)}</TableCell>
                            <TableCell className="font-medium">{log.referrer_name || '-'}</TableCell>
                            <TableCell>{log.referred_name || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {log.gross_amount ? formatCurrency(log.gross_amount / 100) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {log.commission_amount ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-green-600 font-medium">
                                        {formatCurrency(log.commission_amount / 100)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Taxa: {log.commission_rate ? `${(log.commission_rate * 100).toFixed(0)}%` : '-'}</p>
                                      {log.gateway_fee && <p>Taxa gateway: {formatCurrency(log.gateway_fee / 100)}</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status || 'pending')}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Filter className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1 text-xs">
                                      {log.previous_plan && <p><strong>Plano anterior:</strong> {log.previous_plan}</p>}
                                      {log.new_plan && <p><strong>Novo plano:</strong> {log.new_plan}</p>}
                                      {log.billing_interval && <p><strong>Ciclo:</strong> {log.billing_interval}</p>}
                                      {log.discount_applied && <p><strong>Desconto:</strong> {formatCurrency((log.discount_amount || 0) / 100)}</p>}
                                      {log.proration_credit && <p><strong>Crédito prorrata:</strong> {formatCurrency(log.proration_credit / 100)}</p>}
                                      {log.proration_charge && <p><strong>Cobrança prorrata:</strong> {formatCurrency(log.proration_charge / 100)}</p>}
                                      {log.failure_reason && <p className="text-red-500"><strong>Falha:</strong> {log.failure_reason}</p>}
                                      {log.ineligibility_reason && <p className="text-orange-500"><strong>Inelegível:</strong> {log.ineligibility_reason}</p>}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Partner Detail Modal */}
      <Dialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-orange-500" />
              Detalhes do Afiliado
            </DialogTitle>
            <DialogDescription>
              Informações completas do parceiro no programa de indicação
            </DialogDescription>
          </DialogHeader>
          
          {selectedPartner && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedPartner.nome || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código de Indicação</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedPartner.referral_code || '-'}</code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPartner.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrada</p>
                  <p className="text-sm">{formatDate(selectedPartner.created_at)}</p>
                </div>
              </div>

              <Separator />

              {/* Commission Rates */}
              <div>
                <h4 className="font-medium mb-3">Taxas de Comissão</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-muted-foreground">Profissional Mensal</p>
                    <p className="font-medium">30% (1ª) → 15% (recorrente)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-muted-foreground">Profissional Anual</p>
                    <p className="font-medium">20%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-muted-foreground">Premium Mensal</p>
                    <p className="font-medium">30% (1ª) → 15% (recorrente)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-muted-foreground">Premium Anual</p>
                    <p className="font-medium">20%</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div>
                <h4 className="font-medium mb-3">Estatísticas</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border text-center">
                    <p className="text-2xl font-bold">{selectedPartner.total_referrals}</p>
                    <p className="text-xs text-muted-foreground">Total Indicações</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedPartner.active_referrals}</p>
                    <p className="text-xs text-muted-foreground">Ativas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedPartner.total_commission_earned)}</p>
                    <p className="text-xs text-muted-foreground">Comissão Total</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Linked Referrals */}
              <div>
                <h4 className="font-medium mb-3">Indicados Vinculados</h4>
                <div className="max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Gera Comissão?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPartnerReferrals(selectedPartner.user_id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            Nenhum indicado
                          </TableCell>
                        </TableRow>
                      ) : getPartnerReferrals(selectedPartner.user_id).map(ref => {
                        const generatesCommission = ref.status === 'active' && ['pro', 'premium'].includes(ref.referred_current_plan)
                        return (
                          <TableRow key={ref.id}>
                            <TableCell>{ref.referred_name}</TableCell>
                            <TableCell><Badge variant="outline">{ref.referred_current_plan}</Badge></TableCell>
                            <TableCell>{getStatusBadge(ref.status)}</TableCell>
                            <TableCell>
                              {generatesCommission ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Bank Details */}
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Dados Bancários</h4>
                {selectedPartner.has_bank_details ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedPartner.banco && (
                      <div>
                        <p className="text-muted-foreground">Banco</p>
                        <p>{selectedPartner.banco}</p>
                      </div>
                    )}
                    {selectedPartner.agencia && (
                      <div>
                        <p className="text-muted-foreground">Agência</p>
                        <p>{selectedPartner.agencia}</p>
                      </div>
                    )}
                    {selectedPartner.conta && (
                      <div>
                        <p className="text-muted-foreground">Conta</p>
                        <p>{selectedPartner.conta}</p>
                      </div>
                    )}
                    {selectedPartner.chave_pix && (
                      <div>
                        <p className="text-muted-foreground">Chave PIX</p>
                        <p className="truncate">{selectedPartner.chave_pix}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Dados bancários não configurados</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payout Detail Modal */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              Detalhes do Payout
            </DialogTitle>
            <DialogDescription>
              Snapshot imutável da comissão no momento do cálculo
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayout && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPayout.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor da Comissão</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency((selectedPayout.amount || 0) / 100)}</p>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payout ID</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{selectedPayout.id}</code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Criação</p>
                  <p className="text-sm">{formatDateTime(selectedPayout.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Afiliado</p>
                  <p className="font-medium">{selectedPayout.referrer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Indicado</p>
                  <p className="font-medium">{selectedPayout.referred_name}</p>
                </div>
              </div>

              <Separator />

              {/* Snapshot Details */}
              <div>
                <h4 className="font-medium mb-3">Snapshot da Transação</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Plano</p>
                    <Badge variant="outline">{selectedPayout.referred_plan || '-'}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ciclo</p>
                    <p>{selectedPayout.billing_interval || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tipo de Pagamento</p>
                    <p>{selectedPayout.payment_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxa de Comissão</p>
                    <p>{selectedPayout.commission_rate ? `${(selectedPayout.commission_rate * 100).toFixed(0)}%` : '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Details */}
              <div>
                <h4 className="font-medium mb-3">Detalhes Financeiros</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border text-center">
                    <p className="text-lg font-bold">{formatCurrency((selectedPayout.amount || 0) / 100)}</p>
                    <p className="text-xs text-muted-foreground">Valor Bruto</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-lg font-bold text-red-600">-{formatCurrency((selectedPayout.gateway_fee || 0) / 100)}</p>
                    <p className="text-xs text-muted-foreground">Taxa Gateway</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-lg font-bold text-green-600">{formatCurrency((selectedPayout.net_amount || selectedPayout.amount || 0) / 100)}</p>
                    <p className="text-xs text-muted-foreground">Valor Líquido</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div>
                <h4 className="font-medium mb-3">Datas</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Deadline Aprovação</p>
                    <p>{selectedPayout.approval_deadline ? formatDate(selectedPayout.approval_deadline) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aprovado em</p>
                    <p>{selectedPayout.approved_at ? formatDateTime(selectedPayout.approved_at) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pago em</p>
                    <p>{selectedPayout.paid_at ? formatDateTime(selectedPayout.paid_at) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Período</p>
                    <p>
                      {selectedPayout.period_start && selectedPayout.period_end 
                        ? `${formatDate(selectedPayout.period_start)} - ${formatDate(selectedPayout.period_end)}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Gateway IDs */}
              <Separator />
              <div>
                <h4 className="font-medium mb-3">IDs do Gateway</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice ID:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{selectedPayout.gateway_invoice_id || '-'}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event ID:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{selectedPayout.gateway_event_id || '-'}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscription ID:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{selectedPayout.gateway_subscription_id || '-'}</code>
                  </div>
                </div>
              </div>

              {/* Failure Reason */}
              {selectedPayout.failure_reason && (
                <>
                  <Separator />
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Motivo do Cancelamento
                    </h4>
                    <p className="text-sm">{selectedPayout.failure_reason}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default AdminReferrals
