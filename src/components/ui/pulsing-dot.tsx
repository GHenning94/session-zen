import { cn } from "@/lib/utils"

interface PulsingDotProps {
  color?: 'warning' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const PulsingDot = ({ color = 'warning', size = 'md', className }: PulsingDotProps) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const colorClasses = {
    warning: 'bg-warning',
    destructive: 'bg-destructive'
  }

  return (
    <div
      className={cn(
        'rounded-full animate-pulse-dot',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  )
}
