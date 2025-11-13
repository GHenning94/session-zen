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
  onPreview?: (previewUrl: string) => void
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
  onPreview,
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

  // Utility function to convert data URL to Blob (Safari fallback)
  const dataURLToBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  const limitCanvasSize = (width: number, height: number, maxSize: number = 1024) => {
    if (width <= maxSize && height <= maxSize) {
      return { width, height }
    }
    
    const ratio = Math.min(maxSize / width, maxSize / height)
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    }
  }

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No 2d context')
      }

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Calculate desired dimensions
      let desiredWidth = crop.width * scaleX
      let desiredHeight = crop.height * scaleY
      
      // Limit canvas size to prevent memory issues
      const limited = limitCanvasSize(desiredWidth, desiredHeight, 1024)
      canvas.width = limited.width
      canvas.height = limited.height

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        desiredWidth,
        desiredHeight,
        0,
        0,
        canvas.width,
        canvas.height
      )

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.warn('[ImageCropper] toBlob returned null, using fallback')
              try {
                const dataURL = canvas.toDataURL('image/jpeg', 0.95)
                const fallbackBlob = dataURLToBlob(dataURL)
                resolve(fallbackBlob)
              } catch (fallbackError) {
                console.error('[ImageCropper] Fallback failed:', fallbackError)
                reject(new Error('Falha ao criar imagem'))
              }
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          0.95
        )
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

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer upload de imagens.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      console.log('[ImageCropper] Starting crop process...')
      
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)
      console.log('[ImageCropper] Crop successful, size:', croppedBlob.size)
      
      // Generate local preview immediately
      const localPreviewUrl = URL.createObjectURL(croppedBlob)
      console.log('[ImageCropper] Local preview generated')
      
      if (onPreview) {
        onPreview(localPreviewUrl)
      }

      // Try to compress, but use original if compression fails
      let finalBlob = croppedBlob
      let fileExtension = 'jpg'
      
      try {
        console.log('[ImageCropper] Compressing image...')
        const compressed = await compressImageWithProgress(
          new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' }),
          {
            maxWidth: 800,
            maxHeight: 800,
            quality: 0.85,
            format: 'webp',
          },
          (progress) => setCompressionProgress(progress)
        )
        finalBlob = compressed
        fileExtension = 'webp'
        console.log('[ImageCropper] Compression successful, final size:', finalBlob.size)
      } catch (compressError) {
        console.warn('[ImageCropper] Compression failed, using original crop:', compressError)
        finalBlob = croppedBlob
        fileExtension = 'jpg'
      }

      // Upload to Supabase Storage with user folder
      console.log('[ImageCropper] Uploading to storage...')
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(7)
      const fileName = `${timestamp}_${randomStr}.${fileExtension}`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, finalBlob, {
          contentType: finalBlob.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('[ImageCropper] Upload error:', uploadError)
        throw uploadError
      }

      console.log('[ImageCropper] Upload successful:', uploadData)

      // Return storage path
      onCropComplete(uploadData.path)
      onClose()
      toast({
        title: "Imagem recortada",
        description: "Sua imagem foi recortada e salva com sucesso.",
      })
    } catch (error) {
      console.error('[ImageCropper] Error in crop process:', error)
      toast({
        title: "Erro",
        description: "Erro ao recortar a imagem. Tente novamente.",
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