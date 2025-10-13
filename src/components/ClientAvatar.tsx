import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"
import { User } from "lucide-react"

interface ClientAvatarProps {
  avatarPath?: string | null
  clientName: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ClientAvatar = ({ 
  avatarPath, 
  clientName, 
  className = "",
  size = 'md'
}: ClientAvatarProps) => {
  const { avatarUrl, isLoading } = useAvatarUrl(avatarPath)
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {isLoading ? (
        <AvatarFallback>
          <div className="animate-pulse bg-muted w-full h-full" />
        </AvatarFallback>
      ) : avatarUrl ? (
        <AvatarImage 
          src={avatarUrl}
          alt={clientName}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : null}
      <AvatarFallback>
        {getInitials(clientName) || <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  )
}
