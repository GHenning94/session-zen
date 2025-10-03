import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statBadgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        high: "bg-destructive/10 text-destructive",
        medium: "bg-warning/10 text-warning",
        low: "bg-success/10 text-success",
        default: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface StatBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statBadgeVariants> {}

function StatBadge({ className, variant, ...props }: StatBadgeProps) {
  return (
    <div className={cn(statBadgeVariants({ variant }), className)} {...props} />
  )
}

export { StatBadge, statBadgeVariants }
