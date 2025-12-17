import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrencyBR } from '@/utils/formatters'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface PackageStats {
  totalPackages: number
  activePackages: number
  totalSessions: number
  consumedSessions: number
  remainingSessions: number
  totalRevenue: number
  packagesNearEnd: number
}

interface PackageStatusCardProps {
  stats: PackageStats
}

export const PackageStatusCard = ({ stats }: PackageStatusCardProps) => {
  const navigate = useNavigate()
  const completionRate = stats.totalSessions > 0 
    ? Math.round((stats.consumedSessions / stats.totalSessions) * 100) 
    : 0

  const revenuePerSession = stats.totalSessions > 0 
    ? stats.totalRevenue / stats.totalSessions 
    : 0

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
      onClick={() => navigate('/pacotes')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Pacotes de Sessões</CardTitle>
        <Package className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.activePackages}</span>
            <Badge variant="outline" className="text-xs">
              {stats.totalPackages} total
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Pacotes ativos</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats.consumedSessions} consumidas</span>
            <span>{stats.remainingSessions} restantes</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Receita/Sessão</p>
            <p className="text-sm font-semibold text-primary">
              {formatCurrencyBR(revenuePerSession)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-sm font-semibold">
              {formatCurrencyBR(stats.totalRevenue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}