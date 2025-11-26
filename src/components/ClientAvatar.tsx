import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAvatarCache } from "@/contexts/AvatarCacheContext"
import { User } from "lucide-react"
import { useEffect, useState } from "react"

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
  const { getCachedAvatar } = useAvatarCache()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    const loadAvatar = async () => {
      setIsLoading(true)
      const url = await getCachedAvatar(avatarPath, size)
      if (isMounted) {
        setAvatarUrl(url)
        setIsLoading(false)
      }
    }
    
    loadAvatar()
    
    return () => {
      isMounted = false
    }
  }, [avatarPath, size, getCachedAvatar])
  
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
