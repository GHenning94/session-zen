import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  tooltip?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    type?: 'positive' | 'negative' | 'neutral'
  }
  borderColor?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  tooltip,
  icon: Icon,
  trend,
  borderColor = "border-l-primary",
  className = ""
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    
    const trendType = trend.type || (trend.value > 0 ? 'positive' : trend.value < 0 ? 'negative' : 'neutral')
    
    switch (trendType) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return ''
    
    const trendType = trend.type || (trend.value > 0 ? 'positive' : trend.value < 0 ? 'negative' : 'neutral')
    
    switch (trendType) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className={`border-l-4 ${borderColor} ${className}`}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          <span>{title}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardDescription>
        <CardTitle className="text-2xl md:text-3xl">{value}</CardTitle>
      </CardHeader>
      {(description || trend) && (
        <CardContent className="pt-0">
          {trend && (
            <p className={`text-sm flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </p>
          )}
          {description && !trend && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Status indicator component
interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'critical'
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function StatusIndicator({ status, label, size = 'md' }: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'healthy':
        return '🟢 Saudável'
      case 'warning':
        return '🟡 Atenção'
      case 'critical':
        return '🔴 Risco de churn'
    }
  }

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} ${getStatusColor()} rounded-full animate-pulse`} />
      <span className="text-sm">{label || getStatusLabel()}</span>
    </div>
  )
}

// Legend item for technical terms
interface TermLegendProps {
  term: string
  definition: string
}

export function TermLegend({ term, definition }: TermLegendProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted cursor-help text-primary">
          {term}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs"><strong>{term}:</strong> {definition}</p>
      </TooltipContent>
    </Tooltip>
  )
}
