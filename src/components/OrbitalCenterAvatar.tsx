import { useState, useRef, useEffect } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ImageCropper } from "@/components/ImageCropper";
import { getSignedUrl } from "@/utils/storageUtils";

interface OrbitalCenterAvatarProps {
  currentAvatarUrl?: string;
  onAvatarChange: (url: string) => void;
}

export const OrbitalCenterAvatar = ({ 
  currentAvatarUrl, 
  onAvatarChange
}: OrbitalCenterAvatarProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string>("");

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
    onAvatarChange(uploadedPath);
    setShowCropper(false);
    
    toast({
      title: "Sucesso",
      description: "Logo atualizado com sucesso.",
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
        description: "Logo removido com sucesso.",
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o logo.",
        variant: "destructive",
      });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <>
      <div 
        className="absolute w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center z-10 group cursor-pointer"
        onClick={handleClick}
      >
        <div className="absolute w-28 h-28 rounded-full border-2 border-primary/30 animate-ping opacity-70"></div>
        <div
          className="absolute w-32 h-32 rounded-full border-2 border-primary/20 animate-ping opacity-50"
          style={{ animationDelay: "0.5s" }}
        ></div>
        
        <div className="w-16 h-16 rounded-full bg-background backdrop-blur-md flex items-center justify-center relative overflow-hidden">
          {displayUrl ? (
            <img 
              src={displayUrl} 
              alt="Logo" 
              className="w-full h-full object-cover rounded-full"
            />
          ) : null}
          
          {/* Hover overlay with camera icon */}
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        </div>
        
        {/* Visible camera icon indicator - always visible */}
        <div 
          className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg border-2 border-background"
          onClick={handleClick}
        >
          <Camera className="w-3 h-3" />
        </div>

        {/* Remove button - only show when there's an avatar */}
        {currentAvatarUrl && !isUploading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveAvatar();
            }}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 shadow-lg"
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
    </>
  );
};
