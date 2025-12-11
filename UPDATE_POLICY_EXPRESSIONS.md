# UPDATE Policy Expressions for community-posts Bucket

## UPDATE Policy Configuration

For the UPDATE policy, you need **TWO expressions**:
1. **USING expression** - Checks existing files
2. **WITH CHECK expression** - Validates the update

---

## ✅ Correct Expressions

### Policy Name
```
Users can update their own post images
```

### Target Roles
```
authenticated
```

### USING Expression
```
(bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
```

### WITH CHECK Expression
```
(bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
```

---

## 📝 Step-by-Step Setup in Supabase UI

1. **Go to:** Storage → Policies → `community-posts` bucket
2. **Click:** "New Policy" or edit existing UPDATE policy
3. **Policy name:** `Users can update their own post images`
4. **Target roles:** Select `authenticated`
5. **USING expression:** 
   ```
   (bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
   ```
6. **WITH CHECK expression:**
   ```
   (bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
   ```
7. **Click:** Review → Save

---

## 🔍 What These Expressions Do

**USING expression:**
- Checks if the file being updated exists in `community-posts` bucket
- Verifies file is in `images/` folder (first folder)
- Ensures file is in user's own folder (second folder = user_id)

**WITH CHECK expression:**
- Validates the update will keep file in `community-posts` bucket
- Ensures file stays in `images/` folder
- Confirms file remains in user's own folder

**Result:** Users can only update files in their own `images/{user_id}/` folder.

---

## 💻 Alternative: SQL Editor

If the UI gives errors, use SQL Editor:

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

---

## ✅ Complete Policy Summary

| Policy | Operation | USING | WITH CHECK | Target |
|--------|-----------|-------|------------|--------|
| Public read | SELECT | `bucket_id = 'community-posts'` | - | public |
| Authenticated upload | INSERT | - | `bucket_id = 'community-posts' AND folder[1] = 'images' AND folder[2] = auth.uid()` | authenticated |
| **Update own files** | **UPDATE** | **`bucket_id = 'community-posts' AND folder[1] = 'images' AND folder[2] = auth.uid()`** | **`bucket_id = 'community-posts' AND folder[1] = 'images' AND folder[2] = auth.uid()`** | **authenticated** |
| Delete own files | DELETE | `bucket_id = 'community-posts' AND folder[1] = 'images' AND folder[2] = auth.uid()` | - | authenticated |

---

## 🎯 Quick Copy-Paste Expressions

**USING:**
```
(bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
```

**WITH CHECK:**
```
(bucket_id = 'community-posts'::text) AND (storage.foldername(name))[1] = 'images' AND (storage.foldername(name))[2] = auth.uid()::text
```

Both expressions are the same for UPDATE policy - they ensure users can only update files in their own folder.

