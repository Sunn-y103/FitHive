# ✅ Count Update Verification Guide

## Current Implementation

### Like Count Updates
**When user likes a post:**
1. ✅ Insert into `post_likes` table
2. ✅ Fetch current `like_count` from `posts` table
3. ✅ Update `like_count` = current + 1
4. ✅ Update local state immediately
5. ✅ Refresh feed after 300ms to sync with database

**When user unlikes a post:**
1. ✅ Delete from `post_likes` table
2. ✅ Fetch current `like_count` from `posts` table
3. ✅ Update `like_count` = current - 1 (min 0)
4. ✅ Update local state immediately
5. ✅ Refresh feed after 300ms to sync with database

### Comment Count Updates
**When user adds a comment:**
1. ✅ Insert into `comments` table
2. ✅ Fetch current `comment_count` from `posts` table
3. ✅ Update `comment_count` = current + 1
4. ✅ Update local state immediately
5. ✅ Refresh feed after 300ms to sync with database

---

## 🔍 Troubleshooting

### If Counts Still Don't Update

#### Check 1: RLS Policies for UPDATE

**Verify UPDATE policy allows updating like_count and comment_count:**

Run this in Supabase SQL Editor:

```sql
-- Check current UPDATE policy
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'posts'
  AND cmd = 'UPDATE';
```

**Expected:** Should see "Users can update their own posts" policy

**If policy is too restrictive, update it:**

```sql
-- Update the policy to allow updating like_count and comment_count
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Note:** The `WITH CHECK` clause should allow updating any column as long as `user_id` matches. If it's too restrictive, you might need to allow updates to `like_count` and `comment_count` by anyone (for likes/comments from other users).

#### Check 2: Allow Count Updates by Anyone

**Since likes/comments can come from any user, you might need a separate policy:**

```sql
-- Policy to allow updating like_count and comment_count (for any user's posts)
DROP POLICY IF EXISTS "Anyone can update post counts" ON posts;

CREATE POLICY "Anyone can update post counts"
ON posts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  -- Only allow updating like_count and comment_count
  -- All other fields must remain unchanged
  (OLD.text IS NOT DISTINCT FROM NEW.text) AND
  (OLD.user_id IS NOT DISTINCT FROM NEW.user_id) AND
  (OLD.author_name IS NOT DISTINCT FROM NEW.author_name) AND
  (OLD.media_url IS NOT DISTINCT FROM NEW.media_url) AND
  (OLD.media_type IS NOT DISTINCT FROM NEW.media_type)
);
```

**OR simpler approach - allow count updates:**

```sql
-- Allow authenticated users to update like_count and comment_count on any post
CREATE POLICY "Update post counts"
ON posts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  -- Only like_count and comment_count can change
  (OLD.text = NEW.text) AND
  (OLD.user_id = NEW.user_id) AND
  (OLD.author_name = NEW.author_name) AND
  (OLD.media_url = NEW.media_url) AND
  (OLD.media_type = NEW.media_type)
);
```

#### Check 3: Verify Database Updates

**Test manually in SQL Editor:**

```sql
-- Test updating like_count
UPDATE posts 
SET like_count = like_count + 1 
WHERE id = 'your-post-id';

-- Test updating comment_count
UPDATE posts 
SET comment_count = comment_count + 1 
WHERE id = 'your-post-id';
```

If these fail, there's an RLS policy issue.

#### Check 4: Check Console Logs

**Look for these logs in your app console:**
- `✅ Like count updated successfully: X`
- `✅ Comment count updated successfully: X`
- `❌ Error updating like_count: ...`
- `❌ Error updating comment_count: ...`

If you see errors, check the error message for RLS policy violations.

---

## 🔧 Recommended RLS Policy Setup

### Option A: Separate Policy for Count Updates (Recommended)

```sql
-- Keep existing policy for text updates
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- New policy: Allow anyone to update counts
DROP POLICY IF EXISTS "Anyone can update post counts" ON posts;
CREATE POLICY "Anyone can update post counts"
ON posts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  -- Verify only counts are being updated
  (OLD.text = NEW.text) AND
  (OLD.user_id = NEW.user_id) AND
  (OLD.author_name IS NOT DISTINCT FROM NEW.author_name) AND
  (OLD.media_url IS NOT DISTINCT FROM NEW.media_url) AND
  (OLD.media_type IS NOT DISTINCT FROM NEW.media_type) AND
  (OLD.created_at = NEW.created_at)
);
```

### Option B: Modify Existing Policy (Simpler)

```sql
-- Allow users to update their own posts (text, etc.)
-- AND allow anyone to update counts
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (
  -- Allow if user owns the post
  auth.uid() = user_id
  OR
  -- OR if only counts are being updated
  (
    OLD.text = NEW.text AND
    OLD.user_id = NEW.user_id AND
    OLD.author_name IS NOT DISTINCT FROM NEW.author_name
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR
  (
    OLD.text = NEW.text AND
    OLD.user_id = NEW.user_id
  )
);
```

---

## ✅ Verification Steps

1. **Like a post:**
   - Check console: Should see "✅ Like count updated successfully: X"
   - Check Supabase: `posts.like_count` should increment
   - Check UI: Count should update immediately

2. **Add a comment:**
   - Check console: Should see "✅ Comment count updated successfully: X"
   - Check Supabase: `posts.comment_count` should increment
   - Check UI: Count should update immediately

3. **Check RLS policies:**
   - Run verification SQL above
   - Ensure UPDATE policies exist and allow count updates

---

## 🎯 Summary

**Code is correct** - The implementation properly:
- ✅ Updates `like_count` when likes are added/removed
- ✅ Updates `comment_count` when comments are added
- ✅ Refreshes feed to sync with database
- ✅ Updates UI immediately for better UX

**If counts don't update, the issue is likely:**
- ⚠️ RLS policies blocking UPDATE operations
- ⚠️ Need to add/update RLS policies to allow count updates

**Solution:** Run the RLS policy SQL above to allow count updates! 🔧

