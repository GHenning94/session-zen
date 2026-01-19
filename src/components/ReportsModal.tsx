import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, FileText, Users, DollarSign, Download, Loader2, Crown, Lock } from 'lucide-react'
import { useReports } from '@/hooks/useReports'
import { useSmartData } from '@/hooks/useSmartData'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from './UpgradeModal'
import { Badge } from '@/components/ui/badge'
import { NewFeatureBadge } from './NewFeatureBadge'
import { cn } from '@/lib/utils'

interface ReportsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ReportsModal = ({ open, onOpenChange }: ReportsModalProps) => {
  const { generateReport, generateCompleteReport, isGenerating } = useReports()
  const { data: clients } = useSmartData({ type: 'clients' })
  const { hasAccessToFeature, currentPlan } = useSubscription()
  
  const [selectedReport, setSelectedReport] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    clientId: '',
    status: ''
  })

  const isPro = currentPlan === 'pro'
  const isPremium = currentPlan === 'premium'
  const hasAdvancedReports = hasAccessToFeature('advanced_reports')
  const hasFilters = hasAccessToFeature('report_filters')

  const reportTypes = [
    {
      id: 'complete',
      title: 'Relatório Completo',
      description: 'Todos os dados: clientes, sessões e financeiro',
      icon: FileText,
      requiresPremium: false
    },
    {
      id: 'clients',
      title: 'Relatório de Clientes',
      description: 'Lista completa de clientes e informações',
      icon: Users,
      requiresPremium: true
    },
    {
      id: 'sessions',
      title: 'Relatório de Sessões',
      description: 'Histórico de sessões por período',
      icon: Calendar,
      requiresPremium: true
    },
    {
      id: 'financial',
      title: 'Relatório Financeiro',
      description: 'Resumo financeiro e pagamentos',
      icon: DollarSign,
      requiresPremium: true
    }
  ]

  const formats = [
    { id: 'pdf', name: 'PDF', description: 'Arquivo PDF para visualização e impressão' },
    { id: 'excel', name: 'Excel', description: 'Planilha Excel para análise de dados' }
  ]

  const handleReportClick = (reportId: string, requiresPremium: boolean) => {
    if (requiresPremium && !hasAdvancedReports) {
      setShowUpgradeModal(true)
      return
    }
    setSelectedReport(reportId)
  }

  const handleGenerate = () => {
    if (!selectedReport) return
    
    // Para relatório completo, não precisamos de formato pois gera os dois
    if (selectedReport !== 'complete' && !selectedFormat) return

    if (selectedReport === 'complete') {
      // Para relatório completo, gerar tanto PDF quanto Excel
      // Se não tem acesso aos filtros, não passa filtros
      generateCompleteReport(hasFilters ? filters : {})
    } else {
      generateReport(selectedReport, selectedFormat as 'pdf' | 'excel', hasFilters ? filters : {})
    }
    
    onOpenChange(false)
    
    // Reset form
    setSelectedReport('')
    setSelectedFormat('')
    setFilters({
      startDate: '',
      endDate: '',
      clientId: '',
      status: ''
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exportar Relatórios</DialogTitle>
            <DialogDescription>
              Selecione o tipo de relatório e configure os filtros desejados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Tipo de Relatório */}
            <div>
              <Label className="text-base font-medium">Selecione o tipo de relatório</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {reportTypes.map((report) => {
                  const Icon = report.icon
                  const isLocked = report.requiresPremium && !hasAdvancedReports
                  const isSelected = selectedReport === report.id
                  
                  return (
                    <div 
                      key={report.id}
                      className={cn(
                        "relative cursor-pointer transition-all border rounded-lg p-4",
                        isSelected && !isLocked
                          ? 'ring-2 ring-primary border-primary' 
                          : 'border-border hover:border-primary/50',
                        isLocked && 'opacity-60 cursor-pointer'
                      )}
                      onClick={() => handleReportClick(report.id, report.requiresPremium)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-5 w-5", isLocked ? "text-muted-foreground" : "text-primary")} />
                        <div className="flex items-center gap-2 flex-1">
                          <span className={cn("text-sm font-medium", isLocked && "text-muted-foreground")}>
                            {report.title}
                          </span>
                          {isLocked && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
                              <Crown className="h-3 w-3" />
                              Premium
                            </Badge>
                          )}
                          {!isLocked && report.requiresPremium && isPremium && (
                            <NewFeatureBadge featureKey="advanced_reports" />
                          )}
                        </div>
                      </div>
                      <div className={cn("text-xs mt-2", isLocked ? "text-muted-foreground/70" : "text-muted-foreground")}>
                        {report.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Filtros - sempre mostrar quando um relatório é selecionado */}
            {selectedReport && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Filtros (opcional)</Label>
                  {!hasFilters && (
                    <Badge 
                      variant="secondary" 
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1 cursor-pointer"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      <Crown className="h-3 w-3" />
                      Premium
                    </Badge>
                  )}
                  {hasFilters && isPremium && (
                    <NewFeatureBadge featureKey="report_filters" />
                  )}
                </div>
                
                <div 
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-2 gap-4 relative",
                    !hasFilters && "opacity-50 pointer-events-none"
                  )}
                >
                  {!hasFilters && (
                    <div 
                      className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      <div className="sr-only">Clique para fazer upgrade</div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="startDate" className="text-sm">Data Inicial</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      disabled={!hasFilters}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate" className="text-sm">Data Final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      disabled={!hasFilters}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Cliente</Label>
                    <Select 
                      value={filters.clientId || "all"} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, clientId: value === "all" ? "" : value }))}
                      disabled={!hasFilters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os clientes</SelectItem>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Status</Label>
                    <Select 
                      value={filters.status || "all"} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}
                      disabled={!hasFilters}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="agendada">Agendada</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Formato - só mostra se não for relatório completo */}
            {selectedReport && selectedReport !== 'complete' && (
              <div>
                <Label className="text-base font-medium">Selecione o formato</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {formats.map((format) => (
                    <div 
                      key={format.id}
                      className={`cursor-pointer transition-all border rounded-lg p-4 ${
                        selectedFormat === format.id 
                          ? 'ring-2 ring-primary border-primary' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedFormat(format.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Download className="h-5 w-5 text-primary" />
                        <div className="text-sm font-medium">{format.name}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {format.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aviso para relatório completo */}
            {selectedReport === 'complete' && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-primary">
                  <strong>Relatório Completo:</strong> Será gerado automaticamente em formato PDF e Excel com todos os dados disponíveis.
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="button"
                onClick={handleGenerate}
                disabled={!selectedReport || (selectedReport !== 'complete' && !selectedFormat) || isGenerating}
              >
                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedReport === 'complete' ? 'Gerar Relatório Completo (PDF + Excel)' : 'Gerar Relatório'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature="Relatórios Avançados"
      />
    </>
  )
}