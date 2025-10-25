import { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { compressImageWithProgress, getOptimalCompressionSettings } from '@/utils/imageCompression'
import { useAuth } from '@/hooks/useAuth'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropperProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  onCropComplete: (croppedImageUrl: string) => void
  aspectRatio?: number
  circularCrop?: boolean
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export const ImageCropper = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onCropComplete, 
  aspectRatio = 1,
  circularCrop = true 
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [loading, setLoading] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const { user } = useAuth()

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, aspectRatio))
  }, [aspectRatio])

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No 2d context')
      }

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      const pixelRatio = window.devicePixelRatio

      canvas.width = crop.width * pixelRatio * scaleX
      canvas.height = crop.height * pixelRatio * scaleY

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY,
      )

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }
          resolve(blob)
        }, 'image/jpeg', 0.85)
      })
    },
    []
  )

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma área para recortar.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
      
      // Convert blob to File for compression
      const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' })
      
      // Compress the cropped image
      const compressionSettings = getOptimalCompressionSettings(file)
      const compressedBlob = await compressImageWithProgress(
        file, 
        compressionSettings,
        (progress) => setCompressionProgress(progress)
      )
      
      // Create unique filename with .webp extension - use public path if no user
      const fileName = user 
        ? `${user.id}/cropped-${Date.now()}.webp`
        : `public-uploads/cropped-${Date.now()}.webp`

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

      // Return storage path (private bucket). Consumers must use signed URLs to display.
      const storagePath = `user-uploads/${fileName}`
      onCropComplete(storagePath)
      onClose()
      toast({
        title: "Imagem recortada",
        description: "Sua imagem foi recortada e salva com sucesso.",
      })
    } catch (error) {
      console.error('Error cropping image:', error)
      toast({
        title: "Erro",
        description: "Erro ao recortar a imagem.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setCompressionProgress(0)
    }
  }, [completedCrop, getCroppedImg, onCropComplete, onClose, user])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recortar Imagem</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center p-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            circularCrop={circularCrop}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              alt="Crop me"
              src={imageSrc}
              onLoad={onImageLoad}
              className="max-w-full max-h-[400px] object-contain"
            />
          </ReactCrop>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCropComplete} disabled={loading}>
            {loading 
              ? `Otimizando... ${compressionProgress}%` 
              : 'Recortar'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}