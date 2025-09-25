import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { compressImageWithProgress, getOptimalCompressionSettings } from "@/utils/imageCompression"

interface ImageUploadProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const ImageUpload = ({ label, value, onChange, placeholder }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true)
    try {
      // Compress image automatically
      const compressionSettings = getOptimalCompressionSettings(file)
      const compressedBlob = await compressImageWithProgress(
        file, 
        compressionSettings,
        (progress) => setCompressionProgress(progress)
      )

      // Create unique filename with .webp extension
      const fileName = `${user.id}/${Date.now()}.webp`

      // Upload compressed image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, compressedBlob, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage error:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName)

      onChange(publicUrl)

      toast({
        title: "Sucesso",
        description: "Imagem carregada com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setCompressionProgress(0)
    }
  }

  const removeImage = () => {
    onChange('')
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm text-muted-foreground">URL da imagem</Label>
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "https://exemplo.com/imagem.jpg"}
          />
        </div>
        
        <div>
          <Label className="text-sm text-muted-foreground">Ou fazer upload</Label>
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id={`file-upload-${label}`}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById(`file-upload-${label}`)?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading 
                ? `Otimizando... ${compressionProgress}%` 
                : 'Upload'
              }
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
        </div>
      </div>

      {value && (
        <div className="mt-2">
          <Label className="text-sm text-muted-foreground">Preview</Label>
          <div className="w-full h-32 bg-muted rounded border overflow-hidden">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}