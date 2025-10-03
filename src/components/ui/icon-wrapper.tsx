import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const iconWrapperVariants = cva(
  "rounded-2xl flex items-center justify-center shadow-soft",
  {
    variants: {
      variant: {
        primary: "bg-gradient-primary text-white",
        purple: "bg-gradient-purple text-white",
        cyan: "bg-gradient-cyan text-white",
        emerald: "bg-gradient-emerald text-white",
        success: "bg-gradient-success text-white",
        default: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "h-10 w-10",
        md: "h-12 w-12",
        lg: "h-16 w-16",
        xl: "h-20 w-20",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface IconWrapperProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconWrapperVariants> {}

function IconWrapper({ className, variant, size, ...props }: IconWrapperProps) {
  return (
    <div className={cn(iconWrapperVariants({ variant, size }), className)} {...props} />
  )
}

export { IconWrapper, iconWrapperVariants }
