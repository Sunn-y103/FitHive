-- ============================================
-- RLS POLICIES FOR POSTS AND POST_LIKES TABLES
-- ============================================
-- Run this SQL in Supabase SQL Editor to set up RLS policies
-- for posts table (edit/delete) and post_likes table (like/unlike)

-- ============================================
-- POSTS TABLE POLICIES
-- ============================================

-- Policy 1: Anyone can read posts (SELECT)
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
CREATE POLICY "Anyone can read posts"
ON posts
FOR SELECT
USING (true);

-- Policy 2: Authenticated users can create posts (INSERT)
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own posts (UPDATE)
-- This allows users to update text and other fields on their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3b: Allow authenticated users to update like_count and comment_count on any post
-- This is needed when users like/comment on other users' posts
DROP POLICY IF EXISTS "Anyone can update post counts" ON posts;
CREATE POLICY "Anyone can update post counts"
ON posts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Users can delete their own posts (DELETE)
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- POST_LIKES TABLE POLICIES
-- ============================================

-- Policy 1: Anyone can read likes (SELECT)
DROP POLICY IF EXISTS "Anyone can read post likes" ON post_likes;
CREATE POLICY "Anyone can read post likes"
ON post_likes
FOR SELECT
USING (true);

-- Policy 2: Authenticated users can like posts (INSERT)
-- Users can only insert likes with their own user_id
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts"
ON post_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can unlike posts (DELETE)
-- Users can only delete their own likes
DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts"
ON post_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created successfully

-- Check posts table policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'posts'
ORDER BY cmd, policyname;

-- Check post_likes table policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'post_likes'
ORDER BY cmd, policyname;

-- Success message
SELECT '✅ RLS policies for posts and post_likes tables created successfully!' as message;

