# 🔧 RLS Policy Setup Guide - Posts & Likes

## Issues Identified

### ❌ Issue 1: Likes Not Saving
**Problem:** When users like posts, the likes don't reflect in Supabase because:
- Like button only updates local state
- No insert into `post_likes` table
- No update to `like_count` in `posts` table
- Missing RLS policies for `post_likes` table

### ❌ Issue 2: Edit/Delete Not Working
**Problem:** Edit and Delete menu items don't work because:
- Only console.log statements (no actual functionality)
- Missing RLS policies for UPDATE and DELETE on `posts` table

---

## ✅ Solutions Implemented

### 1. Code Changes (CommunityScreen.tsx)

#### ✅ Like Functionality
- Added `handleLike()` function that:
  - Inserts/deletes from `post_likes` table
  - Updates `like_count` in `posts` table
  - Updates local state for immediate UI feedback
  - Fetches user's liked posts on load

#### ✅ Delete Functionality
- Added `handleDeletePost()` function that:
  - Shows confirmation dialog
  - Deletes post from `posts` table
  - Refreshes feed after deletion

#### ✅ Edit Functionality
- Added `handleEditPost()` and `handleSaveEdit()` functions that:
  - Opens modal with existing post content
  - Updates post text in database
  - Refreshes feed after update

---

## 🔐 Required RLS Policies

### Step 1: Run RLS Policies SQL

**Go to Supabase Dashboard → SQL Editor**

**Copy and paste the entire contents of:**
```
supabase/RLS_POLICIES_POSTS_AND_LIKES.sql
```

**Click "Run"** ✅

This will create all necessary policies for:
- `posts` table (SELECT, INSERT, UPDATE, DELETE)
- `post_likes` table (SELECT, INSERT, DELETE)

---

## 📋 Policy Details

### Posts Table Policies

| Policy | Operation | Expression | Purpose |
|--------|-----------|------------|---------|
| Anyone can read posts | SELECT | `USING (true)` | Public read access |
| Authenticated users can create posts | INSERT | `WITH CHECK (auth.uid() = user_id)` | Users can only create posts with their own user_id |
| Users can update their own posts | UPDATE | `USING (auth.uid() = user_id)` | Users can only edit their own posts |
| Users can delete their own posts | DELETE | `USING (auth.uid() = user_id)` | Users can only delete their own posts |

### Post_Likes Table Policies

| Policy | Operation | Expression | Purpose |
|--------|-----------|------------|---------|
| Anyone can read post likes | SELECT | `USING (true)` | Public read access |
| Users can like posts | INSERT | `WITH CHECK (auth.uid() = user_id)` | Users can only like with their own user_id |
| Users can unlike posts | DELETE | `USING (auth.uid() = user_id)` | Users can only delete their own likes |

---

## 🧪 Testing After Setup

### Test Like Functionality

1. **Like a post:**
   - Tap the heart icon on any post
   - Check Supabase: `post_likes` table should have new row
   - Check `posts.like_count` should increment
   - Refresh app - like should persist

2. **Unlike a post:**
   - Tap heart icon again (should be filled)
   - Check Supabase: Row should be deleted from `post_likes`
   - Check `posts.like_count` should decrement

### Test Delete Functionality

1. **Delete your own post:**
   - Tap menu (three dots) on your post
   - Tap "Delete Post"
   - Confirm deletion
   - Post should disappear from feed
   - Check Supabase: Post should be deleted from `posts` table

2. **Try to delete someone else's post:**
   - Should not see menu option (only on your own posts)

### Test Edit Functionality

1. **Edit your own post:**
   - Tap menu (three dots) on your post
   - Tap "Edit Post"
   - Modal opens with existing text
   - Modify text
   - Tap "Save"
   - Post should update in feed
   - Check Supabase: `posts.text` should be updated

2. **Try to edit someone else's post:**
   - Should not see menu option (only on your own posts)

---

## 🐛 Debugging RLS Policy Issues

### If Likes Don't Save

**Check 1: Verify RLS is enabled**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('posts', 'post_likes');
```
Both should show `rowsecurity = true`

**Check 2: Verify policies exist**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'post_likes';
```
Should see:
- "Anyone can read post likes" (SELECT)
- "Users can like posts" (INSERT)
- "Users can unlike posts" (DELETE)

**Check 3: Test policy manually**
```sql
-- Test INSERT (should work if authenticated)
INSERT INTO post_likes (post_id, user_id)
VALUES ('some-post-id', auth.uid());
```

**Check 4: Check console errors**
- Open browser/app console
- Look for RLS policy violation errors
- Error will say "new row violates row-level security policy"

### If Edit/Delete Don't Work

**Check 1: Verify UPDATE policy exists**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'posts' 
  AND cmd = 'UPDATE';
```
Should see: "Users can update their own posts"

**Check 2: Verify DELETE policy exists**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'posts' 
  AND cmd = 'DELETE';
```
Should see: "Users can delete their own posts"

**Check 3: Test manually**
```sql
-- Test UPDATE (should work if you own the post)
UPDATE posts 
SET text = 'Updated text' 
WHERE id = 'your-post-id' AND user_id = auth.uid();

-- Test DELETE (should work if you own the post)
DELETE FROM posts 
WHERE id = 'your-post-id' AND user_id = auth.uid();
```

---

## ⚠️ Common Issues

### Issue: "new row violates row-level security policy"

**Cause:** INSERT policy `WITH CHECK` condition fails

**Fix:** 
- Verify `auth.uid() = user_id` in your INSERT
- Check that you're setting `user_id` correctly in code
- Ensure policy expression matches your data

### Issue: "permission denied for table posts"

**Cause:** RLS is enabled but no policies exist

**Fix:**
- Run the RLS policies SQL file
- Verify policies were created successfully

### Issue: "update or delete on table violates row-level security policy"

**Cause:** UPDATE/DELETE policy `USING` condition fails

**Fix:**
- Verify you're the owner: `user_id = auth.uid()`
- Check that `posts.user_id` matches your `auth.uid()`
- Ensure policy expression is correct

---

## ✅ Verification Checklist

After running the SQL:

- [ ] `posts` table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] `post_likes` table has 3 policies (SELECT, INSERT, DELETE)
- [ ] RLS is enabled on both tables
- [ ] Can like posts (check `post_likes` table)
- [ ] Can unlike posts (row deleted from `post_likes`)
- [ ] Can edit own posts (text updates in `posts` table)
- [ ] Can delete own posts (row deleted from `posts` table)
- [ ] Cannot edit/delete other users' posts (menu not shown)

---

## 📝 Quick Reference

**RLS Policies SQL File:**
```
supabase/RLS_POLICIES_POSTS_AND_LIKES.sql
```

**Run in:** Supabase Dashboard → SQL Editor

**What it creates:**
- 4 policies for `posts` table
- 3 policies for `post_likes` table

**Total:** 7 RLS policies

---

## 🎉 After Setup

Once RLS policies are in place:
- ✅ Likes will save to Supabase
- ✅ Like counts will update correctly
- ✅ Users can edit their own posts
- ✅ Users can delete their own posts
- ✅ All operations are secure (users can only modify their own data)

Your community features are now fully functional! 🚀

