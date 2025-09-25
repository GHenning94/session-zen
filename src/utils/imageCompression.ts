/**
 * Image compression utility for automatic optimization
 * Converts images to WebP format with max 72 DPI and maintains quality
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  maxDPI?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.9,
  maxDPI: 72,
  format: 'webp'
};

/**
 * Compress and optimize image file
 */
export const compressImage = async (
  file: File, 
  options: CompressionOptions = {}
): Promise<Blob> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        // Resize if image is too large
        if (width > opts.maxWidth! || height > opts.maxHeight!) {
          const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
          width *= ratio;
          height *= ratio;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        ctx!.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Falha ao comprimir imagem'));
            }
          },
          `image/${opts.format}`,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress image from blob/file with loading state
 */
export const compressImageWithProgress = async (
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  // Simulate progress for better UX
  if (onProgress) {
    onProgress(10);
  }
  
  const compressedBlob = await compressImage(file, options);
  
  if (onProgress) {
    onProgress(100);
  }
  
  return compressedBlob;
};

/**
 * Get optimal compression settings based on file size and type
 */
export const getOptimalCompressionSettings = (file: File): CompressionOptions => {
  const sizeInMB = file.size / (1024 * 1024);
  
  if (sizeInMB > 10) {
    return {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      format: 'webp'
    };
  } else if (sizeInMB > 5) {
    return {
      maxWidth: 1440,
      maxHeight: 1440,
      quality: 0.85,
      format: 'webp'
    };
  } else {
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.9,
      format: 'webp'
    };
  }
};