# 🔧 Storage Policy Corrections

## Current Policy Analysis

### ✅ Policy 1: SELECT (Public Read)
**Status:** ✅ **CORRECT**

Your policy:
```
Policy name: "Public read for community posts"
USING: (bucket_id = 'community-posts'::text)
Target roles: public (default)
```

This is correct! It allows anyone to read/view images from the bucket.

---

### ❌ Policy 2: INSERT (Authenticated Upload)
**Status:** ❌ **NEEDS FIXING - Security Issue**

**Your current policy:**
```
Policy name: "Authenticated upload to community posts"
WITH CHECK: (bucket_id = 'community-posts'::text)
Target roles: authenticated
```

**Problem:** This allows authenticated users to upload files **anywhere** in the bucket, not just to their own folder. This is a security risk!

**Your code uploads to:** `images/{user_id}/{timestamp}.{ext}`

**Required fix:** The policy must check:
1. File is in `images/` folder (first folder)
2. File is in user's own folder (second folder = user_id)

---

### ❌ Policy 3: DELETE (Owner Delete)
**Status:** ❌ **INCORRECT - Won't Work**

**Your current policy:**
```
Policy name: "Owner can delete own files in community posts"
USING: ((bucket_id = 'community-posts'::text) AND (auth.uid() = owner))
Target roles: authenticated
```

**Problem:** Supabase Storage doesn't have an `owner` field! This policy will never match and users won't be able to delete their files.

**Required fix:** Check the folder path structure instead of `owner` field.

---

## ✅ Corrected Policies

### Fix Policy 2: INSERT

**Go to Storage → Policies → Edit "Authenticated upload to community posts"**

**Update the WITH CHECK expression to:**
```sql
((bucket_id = 'community-posts'::text) AND ((storage.foldername(name))[1] = 'images'::text) AND ((storage.foldername(name))[2] = auth.uid()::text))
```

**Or in the UI format:**
```
(bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
```

**What this does:**
- ✅ Checks bucket is `community-posts`
- ✅ Checks first folder is `images`
- ✅ Checks second folder matches the user's ID
- ✅ Users can only upload to `images/{their_user_id}/` path

---

### Fix Policy 3: DELETE

**Go to Storage → Policies → Edit "Owner can delete own files in community posts"**

**Update the USING expression to:**
```sql
((bucket_id = 'community-posts'::text) AND ((storage.foldername(name))[1] = 'images'::text) AND ((storage.foldername(name))[2] = auth.uid()::text))
```

**Or in the UI format:**
```
(bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
```

**What this does:**
- ✅ Checks bucket is `community-posts`
- ✅ Checks first folder is `images`
- ✅ Checks second folder matches the user's ID
- ✅ Users can only delete files from their own folder

---

## 📋 Step-by-Step Fix Instructions

### Step 1: Fix INSERT Policy

1. Go to **Storage → Policies → `community-posts` bucket**
2. Find policy: **"Authenticated upload to community posts"**
3. Click **Edit** (pencil icon)
4. In **WITH CHECK expression**, replace with:
   ```
   (bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
   ```
5. Click **Review** → **Save**

### Step 2: Fix DELETE Policy

1. Go to **Storage → Policies → `community-posts` bucket**
2. Find policy: **"Owner can delete own files in community posts"**
3. Click **Edit** (pencil icon)
4. In **USING expression**, replace with:
   ```
   (bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
   ```
5. Click **Review** → **Save**

### Step 3: Verify All Policies

After fixing, you should have:

| Policy | Operation | Expression | Status |
|--------|-----------|------------|--------|
| Public read for community posts | SELECT | `bucket_id = 'community-posts'` | ✅ Correct |
| Authenticated upload to community posts | INSERT | `bucket_id = 'community-posts' AND folder[1] = 'images' AND folder[2] = auth.uid()` | ✅ Fixed |
| Owner can delete own files in community posts | DELETE | `bucket_id = 'community-posts' AND folder[1] = 'images' AND folder[2] = auth.uid()` | ✅ Fixed |

---

## 🔍 Understanding the Folder Path Check

Your code uploads files to: `images/{user_id}/{timestamp}.jpg`

The `storage.foldername(name)` function extracts folder names:
- `(storage.foldername(name))[1]` = first folder = `'images'`
- `(storage.foldername(name))[2]` = second folder = `{user_id}`
- `(storage.foldername(name))[3]` = filename = `{timestamp}.jpg`

So the check `(storage.foldername(name))[2] = auth.uid()::text` ensures:
- ✅ User can only upload/delete in their own folder
- ✅ Files are organized in `images/{user_id}/` structure
- ✅ Security: Users can't access other users' folders

---

## ⚠️ Alternative: Use SQL Editor (Recommended)

If the UI gives you errors, use SQL Editor instead:

```sql
-- Fix INSERT policy
DROP POLICY IF EXISTS "Authenticated upload to community posts" ON storage.objects;

CREATE POLICY "Authenticated upload to community posts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-posts' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Fix DELETE policy
DROP POLICY IF EXISTS "Owner can delete own files in community posts" ON storage.objects;

CREATE POLICY "Owner can delete own files in community posts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-posts' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

---

## ✅ After Fixing

1. **Test upload:** Try uploading an image from your app
2. **Test delete:** Try deleting an image (if you implement delete functionality)
3. **Verify security:** Try accessing another user's folder (should fail)

Your policies will now be secure and match your code's file structure! 🎉

