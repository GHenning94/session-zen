import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-success text-white",
        secondary:
          "border-transparent bg-warning text-white",
        destructive:
          "border-transparent bg-destructive text-white",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-success text-white",
        warning:
          "border-transparent bg-warning text-white",
        info:
          "border-transparent bg-primary text-white",
        purple:
          "border-transparent bg-[hsl(var(--purple))] text-[hsl(var(--purple-foreground))]",
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
