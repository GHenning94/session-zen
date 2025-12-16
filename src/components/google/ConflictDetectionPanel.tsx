import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Shield,
} from 'lucide-react'
import { SyncConflict, ConflictResolution } from '@/types/googleCalendar'
import { ConflictResolutionCard } from './ConflictResolutionCard'

interface ConflictDetectionPanelProps {
  conflicts: SyncConflict[]
  conflictStats: {
    total: number
    high: number
    medium: number
    low: number
  }
  isDetecting: boolean
  isResolving: string | null
  onDetect: () => void
  onResolve: (
    conflictId: string,
    resolution: ConflictResolution,
    mergedData?: {
      date?: string
      time?: string
      description?: string
      location?: string
    }
  ) => Promise<boolean>
  onResolveAll: (resolution: 'keep_platform' | 'keep_google') => Promise<number>
}

export const ConflictDetectionPanel = ({
  conflicts,
  conflictStats,
  isDetecting,
  isResolving,
  onDetect,
  onResolve,
  onResolveAll,
}: ConflictDetectionPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Detecção de Conflitos
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onDetect}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Verificar Conflitos
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Estatísticas */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            Total: {conflictStats.total}
          </Badge>
          {conflictStats.high > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Alta: {conflictStats.high}
            </Badge>
          )}
          {conflictStats.medium > 0 && (
            <Badge className="bg-warning text-warning-foreground gap-1">
              Média: {conflictStats.medium}
            </Badge>
          )}
          {conflictStats.low > 0 && (
            <Badge variant="secondary" className="gap-1">
              Baixa: {conflictStats.low}
            </Badge>
          )}
        </div>

        {/* Estado vazio */}
        {conflicts.length === 0 && !isDetecting && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Nenhum conflito detectado</p>
            <p className="text-sm mt-1">
              Suas sessões espelhadas estão sincronizadas.
            </p>
          </div>
        )}

        {/* Lista de conflitos */}
        {conflicts.length > 0 && (
          <>
            {/* Ações em lote */}
            <div className="flex gap-2 border-b pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveAll('keep_platform')}
                disabled={isResolving !== null}
              >
                Resolver Todos (Plataforma)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveAll('keep_google')}
                disabled={isResolving !== null}
              >
                Resolver Todos (Google)
              </Button>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {conflicts
                  .sort((a, b) => {
                    // Ordenar por severidade (high primeiro)
                    const severityOrder = { high: 0, medium: 1, low: 2 }
                    return severityOrder[a.severity] - severityOrder[b.severity]
                  })
                  .map((conflict) => (
                    <ConflictResolutionCard
                      key={conflict.id}
                      conflict={conflict}
                      onResolve={onResolve}
                      isResolving={isResolving === conflict.id}
                    />
                  ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}
