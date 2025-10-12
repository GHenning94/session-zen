import { supabase } from "@/integrations/supabase/client";

/**
 * Storage utilities for handling private file access with signed URLs
 * After making the storage bucket private, all file access must use signed URLs
 */

/**
 * Generate a signed URL for a private storage file
 * @param filePath - The full path to the file in storage (e.g., "user-id/filename.jpg")
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns The signed URL or null if generation fails
 */
export const getSignedUrl = async (
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  try {
    if (!filePath) return null;

    // If it's already a full URL, check if it's from our storage
    if (filePath.startsWith('http')) {
      const url = new URL(filePath);
      
      // If it's a Supabase storage URL, extract the path
      if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
        // Extract just the path after /storage/v1/object/public/bucket-name/
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
        if (pathMatch) {
          const [, bucket, path] = pathMatch;
          if (bucket === 'user-uploads') {
            filePath = path;
          } else {
            // Different bucket, return as-is
            return filePath;
          }
        } else {
          // Can't extract path, return as-is
          return filePath;
        }
      } else {
        // External URL, return as-is
        return filePath;
      }
    }

    // Normalize 'user-uploads/' prefix if present
    if (filePath.startsWith('user-uploads/')) {
      filePath = filePath.replace(/^user-uploads\//, '');
    }

    const { data, error } = await supabase.storage
      .from('user-uploads')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

/**
 * Generate multiple signed URLs in batch
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds
 * @returns Array of signed URLs (null for failed generations)
 */
export const getSignedUrls = async (
  filePaths: string[],
  expiresIn: number = 3600
): Promise<(string | null)[]> => {
  try {
    const paths = filePaths.filter(Boolean);
    if (paths.length === 0) return [];

    // Normalize any paths that include the bucket prefix
    const normalizedPaths = paths.map(p => p.replace(/^user-uploads\//, ''));

    const { data, error } = await supabase.storage
      .from('user-uploads')
      .createSignedUrls(normalizedPaths, expiresIn);

    if (error) {
      console.error('Error creating signed URLs:', error);
      return paths.map(() => null);
    }

    return data.map(item => item.signedUrl);
  } catch (error) {
    console.error('Error generating signed URLs:', error);
    return filePaths.map(() => null);
  }
};

/**
 * Upload a file and return its path (not a signed URL)
 * After upload, use getSignedUrl to get an accessible URL
 * @param file - The file to upload
 * @param userId - The user ID for folder organization
 * @param fileName - Optional custom filename
 * @returns The file path in storage
 */
export const uploadFile = async (
  file: Blob,
  userId: string,
  fileName?: string
): Promise<string | null> => {
  try {
    const fileExt = fileName ? fileName.split('.').pop() : 'webp';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return null;
  }
};

/**
 * Delete a file from storage
 * @param filePath - The file path to delete
 * @returns True if successful, false otherwise
 */
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('user-uploads')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
};
