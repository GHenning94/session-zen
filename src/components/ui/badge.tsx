import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-success text-white hover:bg-success/90",
        secondary:
          "border-transparent bg-success text-white hover:bg-success/90",
        destructive:
          "border-transparent bg-destructive text-white hover:bg-destructive/90",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-success text-white hover:bg-success/90",
        warning:
          "border-transparent bg-warning text-white hover:bg-warning/90",
        info:
          "border-transparent bg-primary text-white hover:bg-primary/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
