# Profile Update Explained - Complete Beginner's Guide

## 📚 Table of Contents
1. [Understanding the Problem](#understanding-the-problem)
2. [How Profile Updates Work](#how-profile-updates-work)
3. [The Correct Code Pattern](#the-correct-code-pattern)
4. [Step-by-Step Explanation](#step-by-step-explanation)
5. [Testing Your Updates](#testing-your-updates)
6. [Example Response Logs](#example-response-logs)

---

## 🎯 Understanding the Problem

### Why Your Fields Stay NULL

When you sign up, Supabase automatically creates a profile row with:
- `id` (your user ID)
- `username` (from your email)
- `full_name` (from signup form)

But custom fields like `height`, `weight`, `gender`, `water` are **NOT** set during signup - they start as `NULL`.

**This is normal!** You need to update them separately after signup.

---

## 🔄 How Profile Updates Work

### The Flow:

```
1. User opens Profile screen
   ↓
2. User edits height, weight, gender, water
   ↓
3. User clicks "Save"
   ↓
4. App calls upsertUserProfile()
   ↓
5. Function gets current user ID
   ↓
6. Sends update to Supabase with id: user.id
   ↓
7. Supabase updates the row (or creates if missing)
   ↓
8. Returns updated profile data
```

### Why `id: user.id` is Critical

Think of `id` as the **address** of your profile row:
- Without `id`: Supabase doesn't know which row to update → **FAILS**
- With `id`: Supabase knows exactly which row → **SUCCEEDS**

---

## ✅ The Correct Code Pattern

Here's the exact code you need (already in your `services/profileService.ts`):

```typescript
// Step 1: Get the authenticated user
const { data, error: authError } = await supabase.auth.getUser();
const user = data?.user;

if (authError || !user) {
  return { error: new Error('Not authenticated') };
}

// Step 2: Update profile with id included
const { data: updatedProfile, error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,        // ⚠️ REQUIRED - This is the key!
    height: height || null,
    weight: weight || null,
    gender: gender || null,
    water: water || null,
    updated_at: new Date().toISOString(),
  })
  .select();  // Returns the updated row so we can verify

if (error) {
  console.error('Update failed:', error);
  return { error };
}

return { error: null, data: updatedProfile };
```

---

## 📖 Step-by-Step Explanation

### Step 1: Get Current User
```typescript
const { data, error: authError } = await supabase.auth.getUser();
const user = data?.user;
```
**What this does:** Gets the currently logged-in user. We need their `id` to update their profile.

**Why `await`?** This is an async operation - we must wait for it to complete.

### Step 2: Prepare Update Data
```typescript
const updateData = {
  id: user.id,      // Match the profile row to this user
  height: '175',
  weight: '70',
  gender: 'Male',
  water: '2.5',
  updated_at: new Date().toISOString(),
};
```
**What this does:** Creates an object with all the fields to update.

**Why include `id`?** Supabase needs to know which row to update. Without it, the update fails.

### Step 3: Send Update
```typescript
const { data: updatedProfile, error } = await supabase
  .from('profiles')
  .upsert(updateData)
  .select();
```
**What this does:**
- `.from('profiles')` - Targets the profiles table
- `.upsert(...)` - Updates if row exists, creates if it doesn't
- `.select()` - Returns the updated row so we can verify it worked

**Why `.select()`?** Without it, you don't get confirmation that the update worked.

### Step 4: Check for Errors
```typescript
if (error) {
  console.error('Update failed:', error);
  return { error };
}
```
**What this does:** If something went wrong, we log it and return the error.

**Common errors:**
- `"Not authenticated"` - User not logged in
- `"row-level security policy"` - Database permissions issue
- `"JWT expired"` - Session expired, need to re-login

---

## 🧪 Testing Your Updates

### Method 1: Test in Supabase SQL Editor

1. **Open Supabase Dashboard** → SQL Editor
2. **Check current values:**
   ```sql
   SELECT id, height, weight, gender, water 
   FROM profiles 
   WHERE id = 'your-user-id-here';
   ```
3. **Update manually:**
   ```sql
   UPDATE profiles
   SET height = '175', weight = '70', gender = 'Male', water = '2.5'
   WHERE id = 'your-user-id-here';
   ```
4. **Verify:**
   ```sql
   SELECT * FROM profiles WHERE id = 'your-user-id-here';
   ```

**If this works:** Your database is fine, the issue is in your app code.
**If this fails:** Check RLS policies in Database → Policies.

### Method 2: Test from Your App

1. Open your React Native app
2. Go to Profile screen
3. Update height, weight, gender
4. Click Save
5. **Check console logs:**
   - Look for `📤 Updating profile with:`
   - Look for `✅ Profile updated successfully:`
   - Look for any `❌` error messages

### Method 3: Check Database After Update

1. Go to Supabase Dashboard → Table Editor
2. Open `profiles` table
3. Find your row (by user ID)
4. Check if `height`, `weight`, `gender`, `water` have values

---

## 📊 Example Response Logs

### ✅ Successful Update

**Console Output:**
```
💾 Saving profile: { height: '175', weight: '70', gender: 'Male' }
📤 Updating profile with: { 
  id: '123e4567-e89b-12d3-a456-426614174000',
  height: '175',
  weight: '70',
  gender: 'Male',
  water: null
}
✅ Profile updated successfully: [{
  id: '123e4567-e89b-12d3-a456-426614174000',
  height: '175',
  weight: '70',
  gender: 'Male',
  water: null,
  updated_at: '2024-01-15T10:30:00.000Z'
}]
```

**What this means:** Update worked! Values are saved.

---

### ❌ Error: Missing ID

**Console Output:**
```
❌ Error upserting profile: {
  message: 'new row violates row-level security policy',
  code: '42501'
}
```

**What this means:** The update was blocked by security policies, OR `id` was missing.

**Fix:** Make sure `id: user.id` is included in the upsert.

---

### ❌ Error: Not Authenticated

**Console Output:**
```
❌ Not authenticated: {
  message: 'JWT expired',
  code: 'PGRST301'
}
```

**What this means:** User session expired.

**Fix:** User needs to log in again.

---

### ❌ Error: Empty Values

**Console Output:**
```
📤 Updating profile with: {
  id: '...',
  height: null,    // ⚠️ This is null!
  weight: null,    // ⚠️ This is null!
  gender: null,
  water: null
}
```

**What this means:** The values being sent are empty strings, which get converted to `null`.

**Fix:** Check your form inputs - make sure they have values before saving.

---

## 🔑 Key Takeaways

1. **Always include `id: user.id`** - Without it, updates fail
2. **Use `.select()`** - So you can verify the update worked
3. **Check console logs** - They tell you exactly what's happening
4. **Test in SQL Editor first** - If manual update works, database is fine
5. **Check RLS policies** - Make sure you have update permissions

---

## 🆘 Still Not Working?

### Checklist:

- [ ] User is logged in (check `user?.id` in console)
- [ ] Profile row exists (check with SELECT query)
- [ ] `id: user.id` is included (check console logs)
- [ ] Values are not empty (check what's being sent)
- [ ] RLS policies allow updates (check Database → Policies)
- [ ] No errors in console (look for red messages)

### Get Help:

1. Check console logs - they show exactly what's happening
2. Test in SQL Editor - confirms database is working
3. Check RLS policies - most common issue
4. Verify user ID matches - `id` must match `auth.uid()`

---

## 📝 Summary

Your profile update code is now fixed with:
- ✅ Proper `id: user.id` inclusion
- ✅ `.select()` to return updated data
- ✅ Comprehensive error logging
- ✅ Debug console messages

The code will work for both:
- **Creating** new profiles (if somehow missing)
- **Updating** existing profiles

Just make sure:
1. User is authenticated
2. Values are not empty
3. RLS policies allow updates

Happy coding! 🚀

