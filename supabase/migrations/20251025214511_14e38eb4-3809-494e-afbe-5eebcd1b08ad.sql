-- Enable authenticated users to view public-uploads folder
-- This allows signed URL generation for avatars uploaded via public registration
CREATE POLICY "authenticated_can_select_public_uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-uploads'
  AND (storage.foldername(name))[1] = 'public-uploads'
);