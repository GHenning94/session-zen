import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ImageCropper } from "@/components/ImageCropper";
import { compressImageWithProgress, getOptimalCompressionSettings } from "@/utils/imageCompression";

interface ClientAvatarUploadProps {
  clientName?: string;
  currentAvatarUrl?: string;
  onAvatarChange: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

export const ClientAvatarUpload = ({ 
  clientName = "Cliente", 
  currentAvatarUrl, 
  onAvatarChange,
  size = "md" 
}: ClientAvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16", 
    lg: "w-24 h-24"
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro", 
        description: "Imagem muito grande. Máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview URL for cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropper(true);
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      setIsUploading(true);
      setShowCropper(false);
      
      // Convert the cropped image URL to a blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      
      // Create file from blob for compression
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      
      // Compress the image
      const compressionSettings = getOptimalCompressionSettings(file);
      const compressedBlob = await compressImageWithProgress(
        file, 
        compressionSettings,
        (progress) => setCompressionProgress(progress)
      );
      
      // Create unique filename
      const fileName = `clients/${user?.id}/${Date.now()}.webp`;

      // Upload compressed image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, compressedBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      onAvatarChange(publicUrl);

      toast({
        title: "Sucesso",
        description: "Foto do cliente atualizada com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da foto.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setCompressionProgress(0);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={currentAvatarUrl} alt={clientName} />
          <AvatarFallback className="bg-gradient-card text-primary font-medium">
            {getInitials(clientName)}
          </AvatarFallback>
        </Avatar>
        
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full p-0 bg-background border-2 border-background shadow-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Camera className="w-3 h-3" />
          )}
        </Button>
      </div>

      {isUploading && compressionProgress > 0 && (
        <div className="text-xs text-muted-foreground">
          Otimizando imagem... {compressionProgress}%
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload className="w-3 h-3 mr-1" />
        {currentAvatarUrl ? "Alterar foto" : "Adicionar foto"}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <ImageCropper
        isOpen={showCropper}
        onClose={() => {
          setShowCropper(false);
          setSelectedImage("");
        }}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={true}
      />
    </div>
  );
};