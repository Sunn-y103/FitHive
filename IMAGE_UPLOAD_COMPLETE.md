# ✅ Image Upload Feature - Complete

## Overview

Your Community screen now supports **image attachments** for posts! Users can:
- ✅ Select images from their photo library
- ✅ Upload images to Supabase Storage
- ✅ See image previews before posting
- ✅ Create text-only posts (still works)
- ✅ View images in the feed

---

## What Was Added

### 1. ✅ Dependencies Installed

```bash
npm install expo-image-picker
```

### 2. ✅ Code Changes (`CommunityScreen.tsx`)

#### New State
- `selectedImage` - Stores the local URI of selected image
- `uploadingImage` - Shows loading state during upload

#### New Functions
- **`handlePickImage()`** - Opens device photo picker
- **`uploadImageToStorage()`** - Uploads image to Supabase Storage
- **`createPost()`** - Creates post with optional image URL

#### Updated UI
- **"Add Image" button** - Now functional with icon change
- **Image preview** - Shows selected image with remove button
- **Loading states** - Activity indicators during upload
- **Submit button** - Disabled during upload

#### Image Flow
```
User taps "Add Image" 
  → Request permissions
  → Open photo library
  → User selects image
  → Show preview
  → User taps "Post"
  → Upload to Storage
  → Get public URL
  → Save post with URL
  → Display in feed
```

### 3. ✅ SQL Setup (`SETUP_POST_IMAGES_STORAGE.sql`)

Creates:
- **Storage bucket**: `post-images` (public)
- **Security policies**:
  - Anyone can view images
  - Only authenticated users can upload
  - Users can only upload to their own folder (`user_id/filename.jpg`)
  - Users can delete their own images

---

## Setup Instructions

### Step 1: Create Storage Bucket

**Important:** You must run this SQL in Supabase first!

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to**: SQL Editor
3. **Copy & paste**: `supabase/SETUP_POST_IMAGES_STORAGE.sql`
4. **Click "Run"** ✅

### Step 2: Verify Storage Bucket

1. **Go to**: Storage (in Supabase dashboard)
2. **You should see**: A bucket named `post-images`
3. **Settings**: Should show "Public bucket" enabled

### Step 3: Test the Feature

1. **Restart your app:**
   ```bash
   # In Expo terminal, press 'r'
   ```

2. **Test image upload:**
   - Go to Community screen
   - Tap "New Post" button
   - Tap "Add Image"
   - Grant photo library permission (first time only)
   - Select an image
   - See image preview
   - Write some text
   - Tap "Post"
   - Wait for upload (shows loading indicator)
   - See your post with image in the feed!

3. **Test text-only post:**
   - Create a post without adding an image
   - Should work exactly as before

---

## Features & Details

### ✅ Image Selection
- Opens native photo picker
- Allows editing/cropping
- Compressed to 80% quality (faster upload)
- Supports JPG, PNG, and other image formats

### ✅ Upload Process
- Unique filename: `{user_id}/{timestamp}.{extension}`
- Stored in user's own folder
- Public URL generated automatically
- Shows loading indicator during upload

### ✅ Error Handling
- Permission denied → Shows alert
- Upload failed → Offers to post without image
- Network error → Shows error message
- All errors logged to console

### ✅ Security
- Users can only upload to their own folder
- Users can only delete their own images
- Public read access (anyone can view)
- All enforced via RLS policies

### ✅ UI/UX
- Image preview with remove button
- Loading indicators during upload
- Button changes to "Change Image" when selected
- Submit button disabled during upload
- Smooth, intuitive flow

---

## Database Schema

### Posts Table Columns Used
```sql
posts
  ├── id (uuid)
  ├── user_id (uuid)
  ├── text (text)
  ├── author_name (text) ✅ Added previously
  ├── media_url (text) ✅ Used for image URLs
  ├── created_at (timestamp)
  ├── like_count (integer)
  └── comment_count (integer)
```

### Storage Structure
```
post-images/
  └── {user_id}/
      ├── 1702345678901.jpg
      ├── 1702345789012.png
      └── ...
```

---

## Troubleshooting

### ❌ "Upload Failed" Error

**Possible causes:**
1. Storage bucket not created
   - **Fix**: Run `SETUP_POST_IMAGES_STORAGE.sql`
2. Network issues
   - **Fix**: Check internet connection
3. Invalid Supabase URL/key
   - **Fix**: Check `lib/supabase.ts` configuration

### ❌ "Permission Required" Alert

**Cause:** Photo library access denied

**Fix:**
- iOS: Settings → FitHive → Photos → Allow Access
- Android: Settings → Apps → FitHive → Permissions → Storage

### ❌ Images Not Showing in Feed

**Possible causes:**
1. Upload succeeded but URL not saved
   - **Check console logs**: Look for "✅ Post created successfully"
2. Posts table doesn't have `media_url` column
   - **Check Supabase**: Table Editor → posts → columns
3. Old posts without images
   - **Normal**: Only new posts with images will show them

### ❌ Storage Policy Errors

**Symptoms:** Upload fails with "policy violation" error

**Fix:**
1. Check Supabase Dashboard → Storage → Policies
2. Make sure all 4 policies exist
3. Re-run `SETUP_POST_IMAGES_STORAGE.sql`

---

## Testing Checklist

- [ ] Storage bucket created in Supabase
- [ ] App restarts without errors
- [ ] Can tap "Add Image" button
- [ ] Photo picker opens
- [ ] Can select an image
- [ ] Image preview shows correctly
- [ ] Can remove selected image
- [ ] Can change selected image
- [ ] Upload shows loading indicator
- [ ] Post appears in feed with image
- [ ] Can create text-only post (without image)
- [ ] Image displays correctly in feed
- [ ] Other users can see the image (if testing with multiple accounts)

---

## Next Steps (Optional Enhancements)

### 🚀 Future Improvements

1. **Multiple Images**
   - Allow selecting multiple images per post
   - Show image carousel in feed

2. **Image Compression**
   - Further optimize image size
   - Use WebP format for better compression

3. **Image Editing**
   - Add filters, stickers, text overlays
   - Advanced cropping tools

4. **Progress Indicator**
   - Show upload progress percentage
   - Cancel upload option

5. **Image Caching**
   - Cache images locally for faster loading
   - Use `expo-image` for better performance

6. **Delete Post Images**
   - When deleting a post, also delete the image from Storage
   - Saves storage space and costs

---

## Summary

✅ **Image picker** - Integrated with expo-image-picker  
✅ **Storage upload** - Uploads to Supabase Storage securely  
✅ **Public URLs** - Generates and saves public image URLs  
✅ **Feed display** - Images show in PostCard automatically  
✅ **Error handling** - Graceful fallbacks and user feedback  
✅ **Security** - RLS policies protect user uploads  
✅ **UI unchanged** - Existing design preserved  

**Your users can now share visual content in the Community feed!** 📸🎉

---

## Quick Start Command

```bash
# 1. Run SQL in Supabase Dashboard (copy from SETUP_POST_IMAGES_STORAGE.sql)

# 2. Restart app
Press 'r' in Expo terminal

# 3. Test it!
# Go to Community → New Post → Add Image → Select → Post
```

---

**Need help?** Check console logs for detailed error messages. All operations are logged with emoji prefixes:
- 📷 Image selection
- 📤 Upload started
- ✅ Success
- ❌ Error

