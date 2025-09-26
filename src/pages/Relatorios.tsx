import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, Calendar, DollarSign, Download, BarChart3 } from 'lucide-react'
import { ReportsModal } from '@/components/ReportsModal'
import { useSmartData } from '@/hooks/useSmartData'

export default function Relatorios() {
  const [showReportsModal, setShowReportsModal] = useState(false)
  const { data: clients } = useSmartData({ type: 'clients' })
  const { data: sessions } = useSmartData({ type: 'sessions' })

  const realizadas = sessions.filter(s => s.status === 'realizada')
  const totalArrecadado = realizadas.reduce((sum, s) => sum + (Number(s.valor) || 0), 0)
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const sessionsThisMonth = sessions.filter(s => {
    const sessionDate = new Date(s.data)
    return sessionDate.getMonth() === thisMonth && sessionDate.getFullYear() === thisYear
  })

  const reportOptions = [
    {
      id: 'complete',
      title: 'Relatório Completo',
      description: 'Todos os dados: clientes, sessões e informações financeiras',
      icon: FileText,
      color: 'bg-primary'
    },
    {
      id: 'clients',
      title: 'Relatório de Clientes',
      description: 'Lista completa de clientes com informações detalhadas',
      icon: Users,
      color: 'hsl(var(--success))'
    },
    {
      id: 'sessions',
      title: 'Relatório de Sessões',
      description: 'Histórico detalhado de todas as sessões realizadas',
      icon: Calendar,
      color: 'bg-secondary'
    },
    {
      id: 'financial',
      title: 'Relatório Financeiro',
      description: 'Resumo financeiro, pagamentos e estatísticas',
      icon: DollarSign,
      color: 'bg-warning'
    }
  ]

  const stats = [
    {
      title: 'Total de Clientes',
      value: clients.length,
      icon: Users,
      color: 'text-success'
    },
    {
      title: 'Sessões Este Mês',
      value: sessionsThisMonth.length,
      icon: Calendar,
      color: 'hsl(var(--success))'
    },
    {
      title: 'Sessões Realizadas',
      value: realizadas.length,
      icon: BarChart3,
      color: 'text-success'
    },
    {
      title: 'Total Arrecadado',
      value: `R$ ${totalArrecadado.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-success'
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Exporte relatórios detalhados em PDF ou Excel
          </p>
        </div>

        {/* Estatísticas Resumidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4" style={{ color: stat.color.startsWith('hsl') ? stat.color : undefined }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Botão Principal de Relatórios */}
        <div className="text-center">
          <Card className="max-w-md mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 justify-center">
                <FileText className="h-6 w-6 text-primary" />
                Gerar Relatórios
              </CardTitle>
              <CardDescription>
                Exporte relatórios personalizados em PDF ou Excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowReportsModal(true)}
                className="w-full bg-gradient-primary hover:opacity-90"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Abrir Gerador de Relatórios
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Como Usar os Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Formato PDF</h4>
                <p className="text-sm text-muted-foreground">
                  Ideal para visualização, impressão e compartilhamento. 
                  Contém formatação profissional e é facilmente legível.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Formato Excel</h4>
                <p className="text-sm text-muted-foreground">
                  Perfeito para análise de dados, criação de gráficos e 
                  manipulação das informações em planilhas.
                </p>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <h4 className="font-medium mb-2">Filtros Disponíveis</h4>
              <p className="text-sm text-muted-foreground">
                Use os filtros para personalizar seus relatórios por período, 
                cliente específico ou status das sessões.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReportsModal 
        open={showReportsModal} 
        onOpenChange={setShowReportsModal}
      />
    </Layout>
  )
}