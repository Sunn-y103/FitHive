# Profile Schema & Usage Guide

## 📊 Database Schema

### Complete SQL Table Design

```sql
CREATE TABLE public.profiles (
  -- Primary Key (matches auth.users.id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Profile Fields (set during signup)
  email TEXT,                    -- User's email (for convenience)
  full_name TEXT,                -- User's full name (optional)
  username TEXT UNIQUE,           -- Unique username (extracted from email)
  
  -- Profile Details (optional, updated later)
  avatar_url TEXT,
  website TEXT,
  
  -- Health & Fitness Fields (updated in Profile screen)
  height TEXT,                   -- Height in cm (e.g., "175")
  weight TEXT,                   -- Weight in kg (e.g., "70")
  gender TEXT,                   -- Gender (e.g., "Male", "Female", "Other")
  water TEXT,                    -- Daily water goal in liters (e.g., "2.5")
  activity_level TEXT,           -- Activity level (e.g., "Sedentary", "Active")
  sleep TEXT,                    -- Sleep hours per night (e.g., "8")
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 Signup Flow

### What Happens During Signup:

1. User signs up with email + password + name (optional)
2. Supabase creates user in `auth.users` table
3. Database trigger `handle_new_user()` automatically fires
4. Profile row is created with:
   ```json
   {
     "id": "user-uuid",
     "email": "user@example.com",
     "full_name": "John Doe",  // optional
     "username": "user",        // extracted from email
     "height": null,            // NOT set during signup
     "weight": null,            // NOT set during signup
     "gender": null,            // NOT set during signup
     "water": null,             // NOT set during signup
     "activity_level": null     // NOT set during signup
   }
   ```

## 📱 Profile Update Flow

### When User Updates Profile:

1. User opens Profile screen
2. User edits health fields (height, weight, gender, water, etc.)
3. User clicks "Save"
4. App calls `updateHealthFields()` - **ONLY updates health fields**
5. Basic profile fields (name, username) remain unchanged

## 🔧 Available Functions

### 1. `fetchProfile()`

Fetches complete user profile (basic + health fields).

```typescript
import { fetchProfile } from '../services/profileService';

const profile = await fetchProfile();
if (profile) {
  console.log('Profile:', profile);
  // {
  //   id: "...",
  //   email: "user@example.com",
  //   full_name: "John Doe",
  //   height: "175",
  //   weight: "70",
  //   gender: "Male",
  //   ...
  // }
}
```

### 2. `updateProfileDetails()`

Updates ONLY basic profile fields (name, username, avatar, website).

```typescript
import { updateProfileDetails } from '../services/profileService';

const { error, data } = await updateProfileDetails({
  full_name: "John Doe",
  username: "johndoe",
  avatar_url: "https://...",
  website: "https://...",
});

if (error) {
  console.error('Update failed:', error);
} else {
  console.log('Updated:', data);
}
```

### 3. `updateHealthFields()`

Updates ONLY health & fitness fields (height, weight, gender, water, etc.).

```typescript
import { updateHealthFields } from '../services/profileService';

const { error, data } = await updateHealthFields({
  height: "175",
  weight: "70",
  gender: "Male",
  water: "2.5",
  activity_level: "Active",
  sleep: "8",
});

if (error) {
  console.error('Update failed:', error);
} else {
  console.log('Updated:', data);
}
```

## 📝 Example: Complete Profile Update

```typescript
// In your ProfileScreen component

const handleSaveProfile = async () => {
  try {
    // Step 1: Update basic profile fields
    const { error: profileError } = await updateProfileDetails({
      full_name: editingProfile.name,
      username: editingProfile.username,
    });

    if (profileError) {
      Alert.alert('Error', `Failed to save profile: ${profileError.message}`);
      return;
    }

    // Step 2: Update health fields ONLY
    const { error: healthError } = await updateHealthFields({
      height: editingProfile.height,
      weight: editingProfile.weight,
      gender: editingProfile.gender,
      water: editingProfile.water,
      activity_level: editingProfile.activity_level,
    });

    if (healthError) {
      Alert.alert('Error', `Failed to save health data: ${healthError.message}`);
      return;
    }

    // Step 3: Refresh profile to get latest data
    const updatedProfile = await fetchProfile();
    console.log('Profile updated:', updatedProfile);

    Alert.alert('Success', 'Profile updated successfully!');
  } catch (error) {
    console.error('Error:', error);
    Alert.alert('Error', 'Failed to save profile');
  }
};
```

## 🐛 Debugging Logs

### Expected Console Output:

**During Signup:**
```
✅ User authenticated: abc-123-uuid
🔍 Fetching user profile...
✅ Profile fetched successfully: { id: "...", email: "...", hasHealthData: false }
```

**During Profile Update:**
```
💪 Updating health fields...
📤 Updating health fields with: {
  id: "abc-123-uuid",
  height: "175",
  weight: "70",
  gender: "Male",
  water: "2.5",
  activity_level: "Active",
  sleep: "8"
}
✅ Health fields updated successfully: [{ id: "...", height: "175", ... }]
```

**On Error:**
```
❌ Error updating health fields: {
  message: "new row violates row-level security policy",
  code: "42501"
}
```

## ✅ Key Points

1. **Signup creates:** `id`, `email`, `name` (full_name) only
2. **Health fields start as NULL** - user fills them later
3. **`updateHealthFields()`** only updates health fields
4. **`updateProfileDetails()`** only updates basic fields
5. **Always includes `id: user.id`** in updates
6. **Uses `.upsert()` and `.select()`** for reliable updates

## 🧪 Testing

### Test in SQL Editor:

```sql
-- Check what was created during signup
SELECT id, email, full_name, username, height, weight, gender, water 
FROM profiles 
WHERE id = 'your-user-id';

-- Should show:
-- id: your-user-id
-- email: user@example.com
-- full_name: John Doe
-- username: user
-- height: NULL
-- weight: NULL
-- gender: NULL
-- water: NULL

-- Test manual update
UPDATE profiles
SET height = '175', weight = '70', gender = 'Male', water = '2.5'
WHERE id = 'your-user-id';

-- Verify update
SELECT * FROM profiles WHERE id = 'your-user-id';
```

## 📋 Checklist

- [ ] Database trigger creates profile with id, email, name only
- [ ] Health fields are NULL after signup
- [ ] `updateHealthFields()` only updates health fields
- [ ] `updateProfileDetails()` only updates basic fields
- [ ] All updates include `id: user.id`
- [ ] Console logs show what's happening
- [ ] RLS policies allow updates

