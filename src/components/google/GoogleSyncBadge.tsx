import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Cloud, CloudOff, Download, Upload, RefreshCw } from "lucide-react"
import { GoogleSyncType, SYNC_TYPE_LABELS } from "@/types/googleCalendar"

interface GoogleSyncBadgeProps {
  syncType?: GoogleSyncType | string | null
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export const GoogleSyncBadge = ({ syncType, showLabel = true, size = 'sm' }: GoogleSyncBadgeProps) => {
  // Não mostrar badge para sessões locais ou sem tipo de sincronização
  if (!syncType || syncType === 'local') {
    return null
  }

  const syncInfo = SYNC_TYPE_LABELS[syncType as GoogleSyncType]
  if (!syncInfo) return null

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
    switch (syncType) {
      case 'imported':
        return <Download className={iconSize} />
      case 'mirrored':
        return <RefreshCw className={iconSize} />
      case 'sent':
        return <Upload className={iconSize} />
      case 'ignored':
        return <CloudOff className={iconSize} />
      default:
        return <Cloud className={iconSize} />
    }
  }

  const getBadgeVariant = () => {
    switch (syncType) {
      case 'imported':
        return 'info'
      case 'mirrored':
        return 'success'
      case 'sent':
        return 'warning'
      case 'ignored':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getBadgeVariant() as any} 
            className={`gap-1 ${size === 'sm' ? 'text-xs py-0 px-1.5' : ''}`}
          >
            {getIcon()}
            {showLabel && <span>{syncInfo.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{syncInfo.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
