# Profile Update Guide - Beginner's Explanation

## 🔍 Understanding the Problem

### Why Your Profile Updates Aren't Saving

When you update your profile (height, weight, gender, water), the values are being sent to Supabase, but they might not be saved correctly. Here are the most common reasons:

1. **Missing `id: user.id`** - Without this, Supabase doesn't know which profile to update
2. **Empty string values** - If fields are empty, they get converted to `null`
3. **RLS (Row Level Security) policies** - Your database might block updates
4. **Not awaiting the response** - The code might not wait for the update to complete

## ✅ The Correct Update Code

Here's the exact code pattern you should use:

```typescript
// Step 1: Get the current authenticated user
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  console.error('Not authenticated:', authError);
  return;
}

// Step 2: Update the profile with ALL fields including id
const { data: updatedProfile, error: updateError } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,        // ⚠️ CRITICAL: Must match auth.uid()
    height: height || null,
    weight: weight || null,
    gender: gender || null,
    water: water || null,
    updated_at: new Date().toISOString(),
  })
  .select();

if (updateError) {
  console.error('Update failed:', updateError);
} else {
  console.log('Profile updated:', updatedProfile);
}
```

## 🧪 How to Test in Supabase SQL Editor

### Step 1: Check Your Current Profile

```sql
-- See all profiles
SELECT * FROM profiles;

-- See your specific profile (replace with your user ID)
SELECT id, height, weight, gender, water, updated_at 
FROM profiles 
WHERE id = 'your-user-id-here';
```

### Step 2: Test an Update Manually

```sql
-- Update your profile directly (replace with your values)
UPDATE profiles
SET 
  height = '175',
  weight = '70',
  gender = 'Male',
  water = '2.5',
  updated_at = NOW()
WHERE id = 'your-user-id-here';

-- Verify the update
SELECT * FROM profiles WHERE id = 'your-user-id-here';
```

### Step 3: Check RLS Policies

```sql
-- See if you have update permissions
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname LIKE '%update%';
```

You should see a policy like:
- Policy name: `Users can update own profile`
- Policy definition: `(auth.uid() = id)`

## 📊 Example Response Logs

### ✅ Successful Update Response

```javascript
{
  data: [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      height: "175",
      weight: "70",
      gender: "Male",
      water: "2.5",
      updated_at: "2024-01-15T10:30:00.000Z"
    }
  ],
  error: null,
  status: 200,
  statusText: "OK"
}
```

### ❌ Error Response (Missing ID)

```javascript
{
  data: null,
  error: {
    message: "new row violates row-level security policy",
    details: "Policy violation",
    hint: null,
    code: "42501"
  },
  status: 406,
  statusText: "Not Acceptable"
}
```

### ❌ Error Response (Not Authenticated)

```javascript
{
  data: null,
  error: {
    message: "JWT expired",
    details: null,
    hint: null,
    code: "PGRST301"
  },
  status: 401,
  statusText: "Unauthorized"
}
```

## 🐛 Debugging Steps

1. **Add console logs** to see what's being sent:
```typescript
console.log('Updating profile with:', {
  id: user.id,
  height,
  weight,
  gender,
  water
});
```

2. **Check the response**:
```typescript
const { data, error } = await supabase.from('profiles').upsert(...).select();
console.log('Update response:', { data, error });
```

3. **Verify authentication**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id);
```

## 🔧 Common Fixes

### Fix 1: Ensure ID is Always Included

```typescript
// ❌ WRONG - Missing id
await supabase.from('profiles').upsert({ height, weight });

// ✅ CORRECT - Includes id
await supabase.from('profiles').upsert({ 
  id: user.id,  // Required!
  height, 
  weight 
});
```

### Fix 2: Handle Empty Values

```typescript
// ❌ WRONG - Empty strings become null
height: height || null  // If height is "", it becomes null

// ✅ BETTER - Preserve empty strings or use null
height: height?.trim() || null,
```

### Fix 3: Always Use .select()

```typescript
// ❌ WRONG - No way to verify update
await supabase.from('profiles').upsert({...});

// ✅ CORRECT - Returns updated data
const { data } = await supabase.from('profiles').upsert({...}).select();
```

