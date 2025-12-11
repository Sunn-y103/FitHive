-- ============================================
-- STORAGE POLICIES FOR community-posts BUCKET
-- ============================================
-- Run this SQL in Supabase SQL Editor to set up RLS policies
-- for the community-posts storage bucket

-- ============================================
-- POLICY 1: Public Read Access (SELECT)
-- ============================================
-- Allows anyone to view/download images from the bucket

DROP POLICY IF EXISTS "Public read access for community post images" ON storage.objects;

CREATE POLICY "Public read access for community post images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-posts');

-- ============================================
-- POLICY 2: Authenticated Users Can Upload (INSERT)
-- ============================================
-- Allows authenticated users to upload images to their own folder
-- Path structure: images/{user_id}/filename.jpg

DROP POLICY IF EXISTS "Users can upload their own post images" ON storage.objects;

CREATE POLICY "Users can upload their own post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-posts' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- POLICY 3: Users Can Update Their Own Images (UPDATE)
-- ============================================
-- Allows users to update images in their own folder

DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;

CREATE POLICY "Users can update their own post images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'community-posts' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'community-posts' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- POLICY 4: Users Can Delete Their Own Images (DELETE)
-- ============================================
-- Allows users to delete images from their own folder

DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;

CREATE POLICY "Users can delete their own post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-posts' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created successfully

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%community post%' OR policyname LIKE '%post images%'
ORDER BY policyname;

-- Success message
SELECT '✅ Storage policies for community-posts bucket created successfully!' as message;

