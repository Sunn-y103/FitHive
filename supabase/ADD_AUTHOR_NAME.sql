-- ============================================
-- ADD AUTHOR_NAME COLUMN TO POSTS TABLE
-- ============================================
-- Simple denormalized approach: store username directly in each post
-- No complex joins needed!

-- Add author_name column
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Optional: Backfill existing posts with email username
-- This updates posts that don't have an author_name yet
UPDATE posts
SET author_name = COALESCE(
  (SELECT SPLIT_PART(email, '@', 1) FROM auth.users WHERE id = posts.user_id),
  'User'
)
WHERE author_name IS NULL;

-- Verify the changes
SELECT id, user_id, author_name, text, created_at 
FROM posts 
ORDER BY created_at DESC 
LIMIT 10;

-- Success message
SELECT '✅ author_name column added! Posts will now show real usernames.' as message;

