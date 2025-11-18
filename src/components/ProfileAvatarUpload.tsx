import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ImageCropper } from "@/components/ImageCropper";
import { compressImageWithProgress, getOptimalCompressionSettings } from "@/utils/imageCompression";
import { getSignedUrl } from "@/utils/storageUtils";

interface ProfileAvatarUploadProps {
  userName?: string;
  currentAvatarUrl?: string;
  onAvatarChange: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

export const ProfileAvatarUpload = ({ 
  userName = "Usuário", 
  currentAvatarUrl, 
  onAvatarChange,
  size = "lg"
}: ProfileAvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string>("");

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16", 
    lg: "w-24 h-24"
  };

  // Generate signed URL when avatar URL changes
  useEffect(() => {
    const loadSignedUrl = async () => {
      if (currentAvatarUrl) {
        const signedUrl = await getSignedUrl(currentAvatarUrl);
        setDisplayUrl(signedUrl || "");
      } else {
        setDisplayUrl("");
      }
    };
    loadSignedUrl();
  }, [currentAvatarUrl]);

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

  const handleCropComplete = async (uploadedPath: string) => {
    // ImageCropper returns the storage path, not a URL
    onAvatarChange(uploadedPath);
    setShowCropper(false);
    
    toast({
      title: "Sucesso",
      description: "Foto de perfil atualizada com sucesso.",
    });
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;
    
    try {
      // Delete from storage
      const pathToDelete = currentAvatarUrl.replace('user-uploads/', '');
      const { error } = await supabase.storage
        .from('user-uploads')
        .remove([pathToDelete]);

      if (error) throw error;

      onAvatarChange("");
      
      toast({
        title: "Sucesso",
        description: "Foto de perfil removida com sucesso.",
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className={`relative group cursor-pointer`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={displayUrl} alt={userName} />
          <AvatarFallback className="bg-gradient-card text-primary font-medium">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Hover overlay with camera icon */}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>

        {/* Remove button - only show when there's an avatar */}
        {currentAvatarUrl && !isUploading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveAvatar();
            }}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {showCropper && (
        <ImageCropper
          isOpen={showCropper}
          onClose={() => {
            setShowCropper(false);
            URL.revokeObjectURL(selectedImage);
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          circularCrop={true}
        />
      )}

      {compressionProgress > 0 && compressionProgress < 100 && (
        <div className="text-sm text-muted-foreground">
          Comprimindo: {compressionProgress}%
        </div>
      )}
    </div>
  );
};
