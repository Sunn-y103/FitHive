# Quick Test Guide - Profile Updates

## 🧪 Testing Your Profile Updates

### Step 1: Check Your Current Profile in Supabase

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** (left sidebar)
3. Run this query to see all profiles:

```sql
SELECT 
  id, 
  username, 
  full_name, 
  height, 
  weight, 
  gender, 
  water, 
  updated_at 
FROM profiles;
```

### Step 2: Get Your User ID

Run this to get your user ID:

```sql
SELECT id, email FROM auth.users;
```

Copy your user ID (it looks like: `123e4567-e89b-12d3-a456-426614174000`)

### Step 3: Test Manual Update in SQL

Replace `YOUR_USER_ID` with your actual user ID:

```sql
UPDATE profiles
SET 
  height = '175',
  weight = '70',
  gender = 'Male',
  water = '2.5',
  updated_at = NOW()
WHERE id = 'YOUR_USER_ID';

-- Verify it worked
SELECT * FROM profiles WHERE id = 'YOUR_USER_ID';
```

If this works, your database is fine. If it fails, check RLS policies.

### Step 4: Test from Your App

1. Open your React Native app
2. Go to Profile screen
3. Update height, weight, gender
4. Save
5. Check the console logs - you should see:
   - `💾 Saving profile: {...}`
   - `📤 Updating profile with: {...}`
   - `✅ Profile updated successfully: [...]`

### Step 5: Verify in Database

Run this query again to see if values were saved:

```sql
SELECT height, weight, gender, water, updated_at 
FROM profiles 
WHERE id = 'YOUR_USER_ID';
```

## 🔍 Debugging Checklist

- [ ] User is authenticated (check console for user ID)
- [ ] Profile exists (check with SELECT query)
- [ ] RLS policies allow updates (check Database → Policies)
- [ ] Values are not empty strings (check console logs)
- [ ] `id: user.id` is included in upsert (check console logs)
- [ ] No errors in console (check for red error messages)

## 📊 Expected Console Output

### ✅ Success Logs

```
💾 Saving profile: { height: '175', weight: '70', gender: 'Male' }
📤 Updating profile with: { id: '...', height: '175', weight: '70', gender: 'Male', water: null }
✅ Profile updated successfully: [{ id: '...', height: '175', weight: '70', ... }]
```

### ❌ Error Logs

```
❌ Not authenticated: { message: 'JWT expired' }
❌ Error upserting profile: { message: 'new row violates row-level security policy' }
```

## 🛠️ Common Issues & Fixes

### Issue 1: "new row violates row-level security policy"

**Fix:** Check your RLS policies in Supabase Dashboard → Database → Policies

You need a policy like:
```sql
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

### Issue 2: Values are NULL after update

**Possible causes:**
- Empty strings being sent (check console logs)
- Fields not in the update data (check what's being sent)
- RLS blocking the update

**Fix:** Check console logs to see what's actually being sent

### Issue 3: Update works but values don't change

**Possible causes:**
- Caching issue (try refreshing profile)
- Wrong user ID (check if id matches)
- Update happening on wrong row

**Fix:** Add more logging and verify the user ID matches

