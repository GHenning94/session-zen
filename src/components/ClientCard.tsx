import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Mail, Phone, Pill, Baby } from "lucide-react"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"

interface ClientCardProps {
  client: any
  onClick: () => void
  onWhatsAppClick: (phone: string) => void
}

export const ClientCard = ({ client, onClick, onWhatsAppClick }: ClientCardProps) => {
  const { avatarUrl, isLoading, hasError } = useAvatarUrl(client.avatar_url)
  const [imageError, setImageError] = useState(false)
  
  // Log avatar information for debugging
  if (client.avatar_url) {
    console.log('[ClientCard] Client avatar info:', {
      clientId: client.id,
      clientName: client.nome,
      avatarPath: client.avatar_url,
      resolvedUrl: avatarUrl,
      isLoading,
      hasError
    })
  }

  const showFallbackIcon = !avatarUrl || hasError || imageError

  return (
    <div
      className="border border-border rounded-lg p-3 md:p-4 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start md:items-center justify-between gap-3">
        <div className="flex items-start md:items-center space-x-3 md:space-x-4 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {isLoading ? (
                <div className="w-5 h-5 md:w-6 md:h-6 animate-pulse bg-muted-foreground/20 rounded-full" />
              ) : showFallbackIcon ? (
                <User className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              ) : (
                <img 
                  src={avatarUrl} 
                  alt={client.nome} 
                  className="w-full h-full rounded-full object-cover"
                  onLoad={() => {
                    console.log('[ClientCard] ✅ Image loaded successfully:', avatarUrl.substring(0, 100))
                  }}
                  onError={() => {
                    console.error('[ClientCard] ❌ Image failed to load:', avatarUrl)
                    setImageError(true)
                  }}
                />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1 md:mb-2">
              <h3 className="text-base md:text-lg font-semibold truncate max-w-[150px] md:max-w-none">{client.nome}</h3>
              <Badge 
                variant={client.ativo !== false ? "default" : "secondary"}
                className={`shrink-0 ${client.ativo === false ? "bg-yellow-500 text-white hover:bg-yellow-500/80" : ""}`}
              >
                {client.ativo !== false ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="text-xs md:text-sm text-muted-foreground space-y-1">
              <div className="flex flex-wrap items-center gap-1 md:gap-2">
                <Mail className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                <span className="truncate">{client.email || "Email não informado"}</span>
                {(client.medicamentos && client.medicamentos.length > 0) && (
                  <Pill className="w-3 h-3 md:w-4 md:h-4 text-red-500 shrink-0" />
                )}
                {client.eh_crianca_adolescente && (
                  <Baby className="w-3 h-3 md:w-4 md:h-4 text-blue-500 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Phone className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                <span>{client.telefone}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* WhatsApp button */}
        <div className="flex items-center justify-center shrink-0">
          {client.telefone && (
            <Button
              variant="ghost"
              size="sm"
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-success hover:bg-success/90 text-success-foreground p-0"
              onClick={(e) => {
                e.stopPropagation()
                const phone = client.telefone.replace(/\D/g, '')
                onWhatsAppClick(phone)
              }}
              title="Enviar mensagem no WhatsApp"
            >
              <svg 
                viewBox="0 0 24 24" 
                className="w-4 h-4 md:w-5 md:h-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
