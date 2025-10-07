import NotificationDropdown from "@/components/NotificationDropdown"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import { SmartSyncIndicator } from "./SmartSyncIndicator"

interface HeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export const Header = ({ title, subtitle, children }: HeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center gap-4 h-10">
        {children}
        <SmartSyncIndicator />
        <NotificationDropdown />
        <ProfileDropdown />
      </div>
    </div>
  )
}