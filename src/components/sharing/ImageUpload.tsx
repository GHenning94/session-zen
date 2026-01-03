import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { ImageCropper } from "@/components/ImageCropper"
import { getSignedUrl } from "@/utils/storageUtils"

interface ImageUploadProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  aspectRatio?: number
}

export const ImageUpload = ({ label, value, onChange, placeholder, aspectRatio }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Generate signed URL for preview when value changes
  useEffect(() => {
    const loadPreview = async () => {
      if (value && !value.startsWith('http')) {
        const signedUrl = await getSignedUrl(value)
        if (signedUrl) {
          setPreviewUrl(signedUrl)
        }
      } else if (value) {
        setPreviewUrl(value)
      } else {
        setPreviewUrl(null)
      }
    }
    loadPreview()
  }, [value])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens.",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro", 
        description: "Imagem muito grande. Máximo 10MB.",
        variant: "destructive",
      })
      return
    }

    // Create object URL for the cropper
    const imageUrl = URL.createObjectURL(file)
    setSelectedImage(imageUrl)
    setShowCropper(true)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCropComplete = async (croppedImagePath: string) => {
    setShowCropper(false)
    setSelectedImage(null)
    onChange(croppedImagePath)
    
    // Get signed URL for preview
    const signedUrl = await getSignedUrl(croppedImagePath)
    if (signedUrl) {
      setPreviewUrl(signedUrl)
    }
    
    toast({
      title: "Sucesso",
      description: "Imagem carregada com sucesso.",
    })
  }

  const handlePreview = (previewBlobUrl: string) => {
    setPreviewUrl(previewBlobUrl)
  }

  const removeImage = () => {
    onChange('')
    setPreviewUrl(null)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`file-upload-${label}`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Processando...' : 'Fazer Upload'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {previewUrl && (
        <div className="mt-2">
          <Label className="text-sm text-muted-foreground">Preview</Label>
          <div className="w-full h-32 bg-muted rounded border overflow-hidden">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        </div>
      )}

      {showCropper && selectedImage && (
        <ImageCropper
          isOpen={showCropper}
          onClose={() => {
            setShowCropper(false)
            setSelectedImage(null)
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onPreview={handlePreview}
          aspectRatio={aspectRatio}
          circularCrop={false}
        />
      )}
    </div>
  )
}
