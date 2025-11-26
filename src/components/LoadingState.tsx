import { Skeleton } from "@/components/ui/skeleton"

interface LoadingStateProps {
  className?: string
  text?: string
  variant?: "default" | "card" | "minimal"
}

export const LoadingState = ({ 
  className = "", 
  text,
  variant = "default" 
}: LoadingStateProps) => {
  if (variant === "minimal") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="space-y-4 w-full max-w-md">
        <div className="space-y-2">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          {text && (
            <Skeleton className="h-4 w-32 mx-auto" />
          )}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  )
}
