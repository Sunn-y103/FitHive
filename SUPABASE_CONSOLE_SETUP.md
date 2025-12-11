# Supabase Console Setup for Image Uploads

## ✅ Code Changes Made

The code has been updated to match your Supabase schema:

1. ✅ **`media_url`** - Stores image URL (already correct)
2. ✅ **`media_type`** - Now set to `'image'` when image is uploaded, `null` for text-only posts
3. ✅ **`like_count`** - Explicitly set to `0` on post creation
4. ✅ **`comment_count`** - Explicitly set to `0` on post creation
5. ✅ **`author_name`** - Already being used correctly
6. ✅ **Storage bucket** - Using `community-posts` with `images/` folder path

---

## 🔧 Required Supabase Console Changes

### 1. Storage Bucket: `community-posts`

**Verify the bucket exists and is configured:**

1. Go to **Storage** → **Buckets** in Supabase Dashboard
2. Find the `community-posts` bucket
3. Ensure it's marked as **Public** (should show "PUBLIC" badge)
4. If it doesn't exist, create it:
   - Click **"New bucket"**
   - Name: `community-posts`
   - **Enable "Public bucket"** ✅
   - Click **"Create bucket"**

### 2. Storage Policies for `community-posts` Bucket

**⚠️ IMPORTANT: Use SQL Editor instead of the UI**

The Supabase UI policy editor can cause syntax errors. **Use the SQL Editor instead** for reliable policy creation.

#### Option A: Quick Setup (Recommended)

1. **Go to SQL Editor** in Supabase Dashboard
2. **Copy and paste** the entire contents of `supabase/STORAGE_POLICIES_COMMUNITY_POSTS.sql`
3. **Click "Run"** ✅

This will create all 4 policies at once.

#### Option B: Manual Setup via SQL Editor

If you prefer to run policies one by one, use the SQL Editor (not the UI):

**Policy 1: Public Read Access (SELECT)**
```sql
DROP POLICY IF EXISTS "Public read access for community post images" ON storage.objects;

CREATE POLICY "Public read access for community post images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-posts');
```

**Policy 2: Authenticated Users Can Upload (INSERT)**
```sql
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
```

**Note:** This policy ensures:
- Files must be in the `images/` folder
- Files must be in a subfolder matching the user's ID: `images/{user_id}/filename.jpg`

**Policy 3: Users Can Update Their Own Images (UPDATE)**
```sql
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
```

**Policy 4: Users Can Delete Their Own Images (DELETE)**
```sql
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
```

#### ⚠️ Why Use SQL Editor?

The Storage → Policies UI can cause syntax errors when:
- Policy name already exists
- Trying to update an existing policy
- UI wraps CREATE POLICY in ALTER POLICY incorrectly

**Solution:** Always use SQL Editor for creating/updating storage policies.

### 3. Posts Table: Verify Schema

**Go to Table Editor → `posts` table**

Verify these columns exist and have correct types:

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | ❌ | `gen_random_uuid()` | Primary Key |
| `user_id` | uuid | ❌ | - | Foreign Key to auth.users |
| `text` | text | ✅ | - | Post content |
| `media_url` | text | ✅ | - | Image URL (nullable) |
| `media_type` | text | ✅ | - | 'image' or null |
| `like_count` | int4 | ✅ | `0` | Should default to 0 |
| `comment_count` | int4 | ✅ | `0` | Should default to 0 |
| `created_at` | timestamptz | ✅ | `now()` | Auto timestamp |
| `author_name` | text | ✅ | - | Denormalized author name |

**If `like_count` and `comment_count` don't have defaults:**

Run this SQL in **SQL Editor**:
```sql
ALTER TABLE posts 
  ALTER COLUMN like_count SET DEFAULT 0,
  ALTER COLUMN comment_count SET DEFAULT 0;
```

### 4. Posts Table RLS Policies

**Go to Authentication → Policies → `posts` table**

Ensure you have policies that allow:
- ✅ **SELECT**: Users can read all posts (or their own posts)
- ✅ **INSERT**: Authenticated users can create posts
- ✅ **UPDATE**: Users can update their own posts (if needed)
- ✅ **DELETE**: Users can delete their own posts (if needed)

**Example RLS Policies:**

```sql
-- Allow anyone to read posts
CREATE POLICY "Anyone can read posts"
ON posts
FOR SELECT
USING (true);

-- Allow authenticated users to create posts
CREATE POLICY "Authenticated users can create posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

---

## 📋 Quick Setup Checklist

- [ ] `community-posts` bucket exists and is **Public**
- [ ] Storage policies created for `community-posts` bucket (4 policies)
- [ ] `posts` table has all required columns
- [ ] `like_count` and `comment_count` default to `0`
- [ ] RLS policies on `posts` table allow INSERT/SELECT
- [ ] Test upload: Create a post with an image

---

## 🧪 Testing

After setting up the policies:

1. **Test Image Upload:**
   - Create a new post with an image
   - Check Storage → `community-posts` → `images/` folder
   - Verify file appears: `images/{your_user_id}/{timestamp}.jpg`

2. **Test Text-Only Post:**
   - Create a post without an image
   - Verify `media_url` is `null` and `media_type` is `null`

3. **Verify Feed Display:**
   - Posts with images should show the image
   - Posts without images should display as text-only

---

## ⚠️ Important Notes

1. **File Path Structure:**
   - Code uploads to: `images/{user_id}/{timestamp}.{ext}`
   - Storage policies must match this structure

2. **Bucket Name:**
   - Code uses: `community-posts` (not `post-images`)
   - Make sure bucket name matches exactly

3. **Public Access:**
   - Bucket must be **Public** for images to be viewable
   - Public read policy allows anyone to view images

4. **Security:**
   - Users can only upload to their own folder (`images/{their_user_id}/`)
   - RLS policies enforce this at the database level

---

## 🆘 Troubleshooting

### Upload Fails with "Policy Violation"
- Check Storage → Policies → `community-posts`
- Verify all 4 policies exist and are enabled
- Check policy conditions match the file path structure

### Images Not Showing in Feed
- Check `posts.media_url` column has the URL
- Verify bucket is Public
- Check image URL is accessible in browser

### "Bucket not found" Error
- Verify bucket name is exactly `community-posts`
- Check bucket exists in Storage → Buckets

