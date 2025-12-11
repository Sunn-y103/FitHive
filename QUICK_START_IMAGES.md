# 🚀 Quick Start - Image Upload Feature

## ⚡ 3-Step Setup (5 minutes)

### Step 1: Setup Supabase Storage (REQUIRED)

1. Open https://supabase.com/dashboard
2. Select your FitHive project
3. Go to **SQL Editor**
4. Copy & paste this file: `supabase/SETUP_POST_IMAGES_STORAGE.sql`
5. Click **"Run"**
6. Wait for success message ✅

### Step 2: Verify Storage Bucket

1. Go to **Storage** tab in Supabase
2. You should see: `post-images` bucket
3. Click it to verify it's public

### Step 3: Test in Your App

```bash
# In Expo terminal
Press 'r' to reload
```

Then:
1. Open Community screen
2. Tap **"New Post"**
3. Tap **"Add Image"**
4. Select a photo
5. Write text
6. Tap **"Post"**
7. See your image in the feed! 📸

---

## 📋 What If It Doesn't Work?

### Error: "Upload Failed"
→ Did you run the SQL? Go back to Step 1

### Error: "Permission Required"
→ Allow photo access in device settings

### No image in feed
→ Check console for errors (look for ❌ emoji)

---

## ✅ Quick Test Checklist

- [ ] SQL ran successfully in Supabase
- [ ] `post-images` bucket exists in Storage
- [ ] App reloaded (press 'r')
- [ ] "Add Image" button opens photo picker
- [ ] Image preview shows after selection
- [ ] Post uploads successfully
- [ ] Image appears in feed

---

## 🎯 Features You Get

✅ Image picker with cropping  
✅ Secure upload to Supabase Storage  
✅ Image preview before posting  
✅ Loading indicators  
✅ Error handling  
✅ Text-only posts still work  
✅ RLS security policies  

---

## 📚 Full Documentation

See `IMAGE_UPLOAD_COMPLETE.md` for:
- Detailed explanations
- Troubleshooting guide
- Testing checklist
- Future enhancements
- Technical details

---

## 🆘 Still Having Issues?

Check console logs for:
- `📷 Image selected:` - Picker worked
- `📤 Uploading image to Supabase Storage...` - Upload started
- `✅ Image uploaded:` - Upload succeeded
- `✅ Post created successfully:` - Post saved
- `❌ Error:` - Something failed (read the message)

All operations are logged! Check your Expo console.

---

**That's it!** Your Community screen now supports image uploads. 🎉

