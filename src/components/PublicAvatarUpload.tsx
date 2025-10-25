import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageCropper } from '@/components/ImageCropper'
import { Camera, X, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getSignedUrl } from '@/utils/storageUtils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface PublicAvatarUploadProps {
  clientName?: string
  currentAvatarUrl?: string
  onAvatarChange: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
}

export const PublicAvatarUpload = ({ 
  clientName = 'Cliente', 
  currentAvatarUrl, 
  onAvatarChange,
  size = 'md'
}: PublicAvatarUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20', 
    lg: 'w-24 h-24'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate signed URL if we have an avatar path from storage
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!currentAvatarUrl || currentAvatarUrl.startsWith('blob:') || currentAvatarUrl.startsWith('http')) {
        setPreviewUrl(currentAvatarUrl || '')
        return
      }

      try {
        console.log('[PublicAvatarUpload] Generating signed URL for:', currentAvatarUrl)
        const signedUrl = await getSignedUrl(currentAvatarUrl, 3600 * 24) // 24h expiry
        
        if (signedUrl) {
          // Add timestamp to force refresh
          const urlWithTimestamp = `${signedUrl}&t=${Date.now()}`
          setPreviewUrl(urlWithTimestamp)
          console.log('[PublicAvatarUpload] Signed URL generated successfully')
        }
      } catch (error) {
        console.error('[PublicAvatarUpload] Error generating signed URL:', error)
      }
    }

    generateSignedUrl()
  }, [currentAvatarUrl])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      })
      return
    }

    console.log('[PublicAvatarUpload] File selected:', file.name, file.size)

    // DO NOT set preview here - wait for crop confirmation
    // Create reader for cropper
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }
  
  const handlePreview = (localPreviewUrl: string) => {
    // Revoke old blob URL to prevent memory leak
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    
    // Set local preview immediately after crop
    setPreviewUrl(localPreviewUrl)
    console.log('[PublicAvatarUpload] Local preview updated after crop')
  }

  const handleCropComplete = async (croppedImageUrl: string) => {
    setUploading(true)
    try {
      console.log('[PublicAvatarUpload] Crop completed, storage path:', croppedImageUrl)
      
      // Revoke old blob URL to prevent memory leak
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      
      // Update avatar URL with the storage path
      onAvatarChange(croppedImageUrl)
      
      // Generate signed URL for preview
      const signedUrl = await getSignedUrl(croppedImageUrl, 3600 * 24)
      if (signedUrl) {
        setPreviewUrl(`${signedUrl}&t=${Date.now()}`)
        console.log('[PublicAvatarUpload] Preview updated with signed URL')
      }
      
      toast({
        title: 'Avatar atualizado',
        description: 'Sua foto foi atualizada com sucesso.',
      })
    } catch (error) {
      console.error('[PublicAvatarUpload] Error updating avatar:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar avatar.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className="relative group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={previewUrl} alt={clientName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-lg font-semibold">
            {getInitials(clientName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
        
        {currentAvatarUrl && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onAvatarChange('')
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <ImageCropper
        isOpen={showCropper}
        onClose={() => {
          setShowCropper(false)
          setSelectedImage('')
        }}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
        onPreview={handlePreview}
        aspectRatio={1}
        circularCrop={true}
      />
    </div>
  )
}
