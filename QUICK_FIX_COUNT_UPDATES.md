# 🔧 Quick Fix: Count Updates Not Working

## Problem

When users like or comment on posts, the `like_count` and `comment_count` don't update in Supabase because the RLS UPDATE policy only allows post owners to update their posts.

## Solution

You need to add a separate RLS policy that allows **any authenticated user** to update `like_count` and `comment_count` on any post.

---

## ✅ Step-by-Step Fix

### Step 1: Run RLS Policy SQL

1. **Go to Supabase Dashboard → SQL Editor**
2. **Copy and paste** the entire contents of:
   ```
   supabase/RLS_POLICY_COUNT_UPDATES.sql
   ```
3. **Click "Run"** ✅

This creates a policy that:
- ✅ Allows authenticated users to update `like_count` and `comment_count`
- ✅ Protects all other fields (text, user_id, author_name, etc.)
- ✅ Works alongside your existing UPDATE policy

---

## 🧪 Test After Running SQL

### Test 1: Like a Post
1. Like a post (tap heart icon)
2. Check console: Should see `✅ Like count updated successfully: X`
3. Check Supabase: `posts.like_count` should increment
4. Check UI: Count should update

### Test 2: Add a Comment
1. Add a comment on a post
2. Check console: Should see `✅ Comment count updated successfully: X`
3. Check Supabase: `posts.comment_count` should increment
4. Check UI: Count should update

---

## 🔍 How It Works

### Current Setup:
- **Policy 1:** "Users can update their own posts" - Allows post owners to edit text, etc.
- **Policy 2:** "Anyone can update post counts" - Allows anyone to update like_count/comment_count

### Security:
- ✅ Users can only update counts, not other fields
- ✅ All other fields are protected
- ✅ Only authenticated users can update

---

## ⚠️ If It Still Doesn't Work

### Check 1: Verify Policy Exists
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'posts' 
  AND policyname = 'Anyone can update post counts';
```

Should return 1 row.

### Check 2: Test Manual Update
```sql
-- Try updating like_count manually
UPDATE posts 
SET like_count = like_count + 1 
WHERE id = 'some-post-id';
```

If this fails, there's still an RLS issue.

### Check 3: Check Console Errors
Look for:
- `❌ Error updating like_count: ...`
- `❌ Error updating comment_count: ...`

The error message will tell you what's wrong.

---

## ✅ After Fix

**Expected Behavior:**
- ✅ Like a post → `like_count` increments in database
- ✅ Unlike a post → `like_count` decrements in database
- ✅ Add comment → `comment_count` increments in database
- ✅ UI updates immediately
- ✅ Database stays in sync

**All other functionality remains intact!** 🎉

---

## 📝 Summary

**Issue:** RLS policy blocking count updates  
**Fix:** Add policy to allow count updates  
**File:** `supabase/RLS_POLICY_COUNT_UPDATES.sql`  
**Action:** Run SQL in Supabase Dashboard  

Once you run the SQL, counts will update correctly! 🚀

