import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${size === 'sm' ? 'text-xs py-0 px-1.5' : ''}`}
          >
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
