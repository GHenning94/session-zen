import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  MapPin,
  ArrowRight,
  Check,
  X,
  Merge,
  Loader2,
} from 'lucide-react'
import { SyncConflict, ConflictResolution, ConflictField } from '@/types/googleCalendar'
import { cn } from '@/lib/utils'

interface ConflictResolutionCardProps {
  conflict: SyncConflict
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
  isResolving: boolean
}

const FIELD_LABELS: Record<ConflictField, { label: string; icon: React.ElementType }> = {
  date: { label: 'Data', icon: Calendar },
  time: { label: 'Horário', icon: Clock },
  description: { label: 'Descrição', icon: FileText },
  location: { label: 'Localização', icon: MapPin },
  attendees: { label: 'Participantes', icon: Calendar },
}

const SEVERITY_CONFIG = {
  high: { label: 'Alta', color: 'bg-destructive text-destructive-foreground' },
  medium: { label: 'Média', color: 'bg-warning text-warning-foreground' },
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
}

export const ConflictResolutionCard = ({
  conflict,
  onResolve,
  isResolving,
}: ConflictResolutionCardProps) => {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null)
  const [showMergeForm, setShowMergeForm] = useState(false)
  const [mergeData, setMergeData] = useState<{
    date: string
    time: string
    description: string
    location: string
  }>({
    date: conflict.sessionData.data,
    time: conflict.sessionData.horario.substring(0, 5),
    description: conflict.sessionData.anotacoes || '',
    location: conflict.sessionData.google_location || '',
  })

  const handleResolve = async (resolution: ConflictResolution) => {
    if (resolution === 'merge') {
      setShowMergeForm(true)
      setSelectedResolution('merge')
      return
    }
    
    setSelectedResolution(resolution)
    await onResolve(conflict.id, resolution)
  }

  const handleMergeSubmit = async () => {
    await onResolve(conflict.id, 'merge', mergeData)
    setShowMergeForm(false)
  }

  const severityConfig = SEVERITY_CONFIG[conflict.severity]
  const clientName = conflict.sessionData.clients?.nome || 'Cliente'

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Conflito: {clientName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(conflict.sessionData.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Badge className={severityConfig.color}>
            Prioridade {severityConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Diferenças detectadas */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Diferenças detectadas:</p>
          {conflict.differences.map((diff, index) => {
            const fieldConfig = FIELD_LABELS[diff.field]
            const Icon = fieldConfig.icon
            
            return (
              <div 
                key={index}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {fieldConfig.label}
                </div>
                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center text-sm">
                  <div className="bg-primary/10 rounded p-2">
                    <span className="text-xs text-muted-foreground block mb-1">Plataforma</span>
                    <span className="font-mono text-xs break-all">
                      {diff.platformValue || '(vazio)'}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="bg-blue-500/10 rounded p-2">
                    <span className="text-xs text-muted-foreground block mb-1">Google</span>
                    <span className="font-mono text-xs break-all">
                      {diff.googleValue || '(vazio)'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Formulário de merge */}
        {showMergeForm ? (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Escolha os valores finais:</p>
            
            {conflict.differences.map((diff) => {
              const fieldConfig = FIELD_LABELS[diff.field]
              
              return (
                <div key={diff.field} className="space-y-2">
                  <Label>{fieldConfig.label}</Label>
                  <RadioGroup
                    value={
                      mergeData[diff.field as keyof typeof mergeData] === diff.platformValue 
                        ? 'platform' 
                        : mergeData[diff.field as keyof typeof mergeData] === diff.googleValue
                          ? 'google'
                          : 'custom'
                    }
                    onValueChange={(value) => {
                      if (value === 'platform') {
                        setMergeData(prev => ({ ...prev, [diff.field]: diff.platformValue }))
                      } else if (value === 'google') {
                        setMergeData(prev => ({ ...prev, [diff.field]: diff.googleValue }))
                      }
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="platform" id={`${diff.field}-platform`} />
                      <Label htmlFor={`${diff.field}-platform`} className="text-xs">
                        Plataforma
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="google" id={`${diff.field}-google`} />
                      <Label htmlFor={`${diff.field}-google`} className="text-xs">
                        Google
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id={`${diff.field}-custom`} />
                      <Label htmlFor={`${diff.field}-custom`} className="text-xs">
                        Personalizado
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {diff.field === 'description' ? (
                    <Textarea
                      value={mergeData.description}
                      onChange={(e) => setMergeData(prev => ({ ...prev, description: e.target.value }))}
                      className="text-sm"
                      rows={2}
                    />
                  ) : (
                    <Input
                      type={diff.field === 'date' ? 'date' : diff.field === 'time' ? 'time' : 'text'}
                      value={mergeData[diff.field as keyof typeof mergeData]}
                      onChange={(e) => setMergeData(prev => ({ 
                        ...prev, 
                        [diff.field]: e.target.value 
                      }))}
                      className="text-sm"
                    />
                  )}
                </div>
              )
            })}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMergeForm(false)}
              >
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleMergeSubmit}
                disabled={isResolving}
              >
                {isResolving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Aplicar Merge
              </Button>
            </div>
          </div>
        ) : (
          /* Botões de resolução */
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve('keep_platform')}
              disabled={isResolving}
              className={cn(
                selectedResolution === 'keep_platform' && 'ring-2 ring-primary'
              )}
            >
              {isResolving && selectedResolution === 'keep_platform' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Manter Plataforma
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve('keep_google')}
              disabled={isResolving}
              className={cn(
                selectedResolution === 'keep_google' && 'ring-2 ring-primary'
              )}
            >
              {isResolving && selectedResolution === 'keep_google' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Manter Google
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve('merge')}
              disabled={isResolving}
            >
              <Merge className="h-4 w-4 mr-2" />
              Merge Manual
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResolve('dismiss')}
              disabled={isResolving}
            >
              <X className="h-4 w-4 mr-2" />
              Ignorar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
