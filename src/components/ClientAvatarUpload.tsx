import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Loader2, X } from "lucide-react";
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
  readOnly?: boolean;
}

export const ClientAvatarUpload = ({ 
  clientName = "Cliente", 
  currentAvatarUrl, 
  onAvatarChange,
  size = "md",
  readOnly = false
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

  const handleCropComplete = (croppedImageUrl: string) => {
    // ImageCropper already handles compression and upload
    // Just update the avatar URL
    onAvatarChange(croppedImageUrl);
    setShowCropper(false);
    
    toast({
      title: "Sucesso",
      description: "Foto do cliente atualizada com sucesso.",
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className={`relative group ${readOnly ? '' : 'cursor-pointer'}`}
        onClick={readOnly ? undefined : () => fileInputRef.current?.click()}
      >
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={currentAvatarUrl} alt={clientName} />
          <AvatarFallback className="bg-gradient-card text-primary font-medium">
            {getInitials(clientName)}
          </AvatarFallback>
        </Avatar>
        
        {!readOnly && (
          <>
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploading ? (
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
                  e.stopPropagation();
                  onAvatarChange('');
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </>
        )}
      </div>

      {isUploading && compressionProgress > 0 && (
        <div className="text-xs text-muted-foreground">
          Otimizando imagem... {compressionProgress}%
        </div>
      )}

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