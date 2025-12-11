-- ============================================
-- RLS POLICIES FOR COMMENTS TABLE
-- ============================================
-- Run this SQL in Supabase SQL Editor to set up RLS policies
-- for comments table (read, create, update, delete)

-- ============================================
-- COMMENTS TABLE POLICIES
-- ============================================

-- Policy 1: Anyone can read comments (SELECT)
DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
CREATE POLICY "Anyone can read comments"
ON comments
FOR SELECT
USING (true);

-- Policy 2: Authenticated users can create comments (INSERT)
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
CREATE POLICY "Authenticated users can create comments"
ON comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own comments (UPDATE)
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
CREATE POLICY "Users can update their own comments"
ON comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own comments (DELETE)
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
CREATE POLICY "Users can delete their own comments"
ON comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created successfully

SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'comments'
ORDER BY cmd, policyname;

-- Success message
SELECT '✅ RLS policies for comments table created successfully!' as message;

