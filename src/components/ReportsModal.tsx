import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, FileText, Users, DollarSign, Download, Loader2 } from 'lucide-react'
import { useReports } from '@/hooks/useReports'
import { useSmartData } from '@/hooks/useSmartData'

interface ReportsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

console.log('🎯 ReportsModal carregado')

export const ReportsModal = ({ open, onOpenChange }: ReportsModalProps) => {
  const { generateReport, generateCompleteReport, isGenerating } = useReports()
  const { data: clients } = useSmartData({ type: 'clients' })
  
  const [selectedReport, setSelectedReport] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    clientId: '',
    status: ''
  })

  const reportTypes = [
    {
      id: 'complete',
      title: 'Relatório Completo',
      description: 'Todos os dados: clientes, sessões e financeiro',
      icon: FileText
    },
    {
      id: 'clients',
      title: 'Relatório de Clientes',
      description: 'Lista completa de clientes e informações',
      icon: Users
    },
    {
      id: 'sessions',
      title: 'Relatório de Sessões',
      description: 'Histórico de sessões por período',
      icon: Calendar
    },
    {
      id: 'financial',
      title: 'Relatório Financeiro',
      description: 'Resumo financeiro e pagamentos',
      icon: DollarSign
    }
  ]

  const formats = [
    { id: 'pdf', name: 'PDF', description: 'Arquivo PDF para visualização e impressão' },
    { id: 'excel', name: 'Excel', description: 'Planilha Excel para análise de dados' }
  ]

  const handleGenerate = () => {
    console.log('🎯 handleGenerate chamado', { selectedReport, selectedFormat })
    if (!selectedReport) return
    
    // Para relatório completo, não precisamos de formato pois gera os dois
    if (selectedReport !== 'complete' && !selectedFormat) return

    if (selectedReport === 'complete') {
      // Para relatório completo, gerar tanto PDF quanto Excel
      generateCompleteReport(filters)
    } else {
      generateReport(selectedReport, selectedFormat as 'pdf' | 'excel', filters)
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
                return (
                  <div 
                    key={report.id}
                    className={`cursor-pointer transition-all border rounded-lg p-4 ${
                      selectedReport === report.id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="text-sm font-medium">{report.title}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
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
              <Label className="text-base font-medium">Filtros (opcional)</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm">Data Inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate" className="text-sm">Data Final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                
                {selectedReport && (
                  <>
                    <div>
                      <Label className="text-sm">Cliente</Label>
                      <Select value={filters.clientId || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, clientId: value === "all" ? "" : value }))}>
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
                      <Select value={filters.status || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}>
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
                  </>
                )}
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
  )
}