-- ============================================
-- SETUP SUPABASE STORAGE FOR POST IMAGES
-- ============================================
-- This creates a public storage bucket for user post images
-- with proper security policies.

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================

-- Create the 'post-images' bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Policy 1: Anyone can view/download images (bucket is public)
DROP POLICY IF EXISTS "Public read access for post images" ON storage.objects;
CREATE POLICY "Public read access for post images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'post-images');

-- Policy 2: Authenticated users can upload images to their own folder
DROP POLICY IF EXISTS "Users can upload their own post images" ON storage.objects;
CREATE POLICY "Users can upload their own post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update their own images
DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
CREATE POLICY "Users can update their own post images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'post-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own images
DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
CREATE POLICY "Users can delete their own post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check bucket created
SELECT 
  id, 
  name, 
  public,
  created_at
FROM storage.buckets
WHERE id = 'post-images';

-- Check policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%post images%'
ORDER BY policyname;

-- Success message
SELECT '✅ Storage bucket "post-images" created successfully!' as message;
SELECT '📁 Users can now upload images to their posts!' as info;

