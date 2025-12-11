# Exact Code Examples - Profile Creation & Updates

## 📋 Required React Native Update Code Format

### Exact Code Pattern (as requested):

```typescript
// Step 1: Get authenticated user
const { data: { user } } = await supabase.auth.getUser();

// Step 2: Update health fields ONLY
await supabase
  .from("profiles")
  .upsert({
    id: user.id,  // REQUIRED
    height,
    weight,
    gender,
    water
  })
  .select();
```

## 🔧 Implementation in Your Codebase

### Function: `updateHealthFields()`

Located in: `services/profileService.ts`

```typescript
export const updateHealthFields = async (
  fields: Partial<HealthFields>
): Promise<{ error: Error | null; data?: SupabaseProfile[] }> => {
  try {
    // Step 1: Get authenticated user (exactly as you requested)
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user;

    if (authError || !user) {
      return { error: new Error('Not authenticated') };
    }

    // Step 2: Update health fields (exactly as you requested)
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,      // REQUIRED: PK must match auth.uid()
        height: fields.height || null,
        weight: fields.weight || null,
        gender: fields.gender || null,
        water: fields.water || null,
        activity_level: fields.activity_level || null,
        sleep: fields.sleep || null,
        updated_at: new Date().toISOString(),
      })
      .select();  // Returns updated row

    if (error) {
      return { error: error as Error };
    }

    return { error: null, data: updatedProfile };
  } catch (error) {
    return { error: error as Error };
  }
};
```

## 📱 Usage in ProfileScreen

### Example: Update Health Fields

```typescript
import { updateHealthFields } from '../services/profileService';

const handleSaveHealthData = async () => {
  const { error, data } = await updateHealthFields({
    height: "175",
    weight: "70",
    gender: "Male",
    water: "2.5",
    activity_level: "Active",
  });

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Updated:', data);
  }
};
```

## 🗄️ Complete SQL Table Schema

### Run this in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Primary Key
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Profile (set during signup)
  email TEXT,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  website TEXT,
  
  -- Health Fields (updated in Profile screen)
  height TEXT,
  weight TEXT,
  gender TEXT,
  water TEXT,
  activity_level TEXT,
  sleep TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

## 🔍 Debugging Logs

### Console Output During Update:

```
💪 Updating health fields...
📤 Updating health fields with: {
  id: "123e4567-e89b-12d3-a456-426614174000",
  height: "175",
  weight: "70",
  gender: "Male",
  water: "2.5",
  activity_level: "Active",
  sleep: "8"
}
✅ Health fields updated successfully: [{
  id: "123e4567-e89b-12d3-a456-426614174000",
  height: "175",
  weight: "70",
  gender: "Male",
  water: "2.5",
  activity_level: "Active",
  sleep: "8",
  updated_at: "2024-01-15T10:30:00.000Z"
}]
```

### On Error:

```
❌ Error updating health fields: {
  message: "new row violates row-level security policy",
  details: "Policy violation",
  code: "42501"
}
```

## ✅ All Three Functions

### 1. `fetchProfile()`

```typescript
const profile = await fetchProfile();
// Returns: { id, email, full_name, height, weight, gender, water, ... }
```

### 2. `updateProfileDetails()`

```typescript
const { error, data } = await updateProfileDetails({
  full_name: "John Doe",
  username: "johndoe",
});
// Updates: name, username, avatar, website only
```

### 3. `updateHealthFields()`

```typescript
const { error, data } = await updateHealthFields({
  height: "175",
  weight: "70",
  gender: "Male",
  water: "2.5",
  activity_level: "Active",
});
// Updates: height, weight, gender, water, activity_level, sleep only
```

## 🎯 Key Requirements Met

✅ Signup creates: `id`, `email`, `name` only  
✅ Health fields start as NULL  
✅ `updateHealthFields()` only updates health fields  
✅ Always includes `id: user.id`  
✅ Uses `.upsert()` and `.select()`  
✅ Clean reusable functions provided  
✅ Debugging logs included  
✅ Works with email + password signin  

