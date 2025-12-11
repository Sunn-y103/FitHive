# Supabase Profile Setup & Configuration

## Overview
This document explains the profile management implementation and any required Supabase configurations.

## Implementation Summary

### ✅ What Was Implemented

1. **SignUpScreen Updates**
   - Added "Full Name" input field
   - Validates that name is at least 3 characters (for username constraint)
   - Passes full_name to signup function

2. **AuthContext Updates**
   - `signUp()` now accepts `fullName` parameter
   - Passes `full_name` in user metadata during signup
   - Automatically sets `username` (first word of name) after signup
   - Handles profile creation with retry logic to account for trigger timing

3. **ProfileScreen Updates**
   - Uses `full_name` from Supabase profile for display
   - Sets `username` as first word of name when saving profile
   - Email is displayed and can be updated
   - Syncs with Supabase profiles table

4. **Profile Service**
   - `getCurrentUserProfile()` - Fetches fresh profile from Supabase
   - `upsertUserProfile()` - Creates/updates profile with username and full_name

## Supabase Configuration Status

### ✅ Already Configured (Based on Your SQL)

Your Supabase setup looks good! You have:

1. **Profiles Table** ✅
   - `id` (uuid, PK, references auth.users)
   - `full_name` (text)
   - `username` (text, unique, constraint: >= 3 characters)
   - `avatar_url` (text)
   - `website` (text)
   - `updated_at` (timestamptz)

2. **RLS Policies** ✅
   - Public profiles are viewable by everyone
   - Users can insert their own profile
   - Users can update their own profile

3. **Trigger for Auto-Profile Creation** ✅
   - `handle_new_user()` function creates profile on signup
   - Uses `full_name` from `raw_user_meta_data`

4. **Storage Bucket** ✅
   - `avatars` bucket created with public access policies

### 🔧 Optional Configuration Recommendations

#### 1. Email Confirmation (Recommended)
If you want email confirmation before users can log in:

**In Supabase Dashboard:**
- Go to Authentication > Settings
- Enable "Enable email confirmations"
- Configure email templates if needed

**Note:** Currently, the app allows immediate login after signup. If you enable email confirmation, users will need to confirm their email before logging in.

#### 2. Profile Update Trigger (Optional)
You could add a trigger to automatically update `updated_at` timestamp:

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

#### 3. Username Validation (Already Handled)
The app validates that the first word of the name is at least 3 characters (matching your constraint). This is handled in:
- SignUpScreen validation
- ProfileScreen save logic
- AuthContext signup logic

#### 4. Real-time Profile Updates (Optional)
If you want real-time profile sync across devices:

**In Supabase Dashboard:**
- Go to Database > Replication
- Enable replication for `profiles` table
- The app already refreshes profile on screen focus, but real-time would be instant

**In your app:**
You could add a real-time subscription in `profileService.ts`:

```typescript
// Subscribe to profile changes
const subscription = supabase
  .channel('profile-changes')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
    (payload) => {
      // Refresh profile data
    }
  )
  .subscribe();
```

## How It Works

### Signup Flow
1. User enters: Name, Email, Password
2. App calls `signUp(email, password, fullName)`
3. Supabase Auth creates user with `full_name` in metadata
4. Trigger `handle_new_user()` creates profile with `full_name`
5. App updates profile to set `username` (first word of name)
6. User navigates to Login screen

### Login Flow
1. User logs in with email/password
2. `AuthContext` fetches profile from Supabase
3. Profile data is available throughout the app

### Profile Update Flow
1. User edits profile in ProfileScreen
2. `full_name` and `username` saved to Supabase
3. Local fields (age, height, weight, gender) saved to AsyncStorage
4. Profile refreshes from Supabase to show latest data

### Profile Sync Across Devices
- Profile data always loaded fresh from Supabase (no local cache)
- When ProfileScreen comes into focus, it refreshes profile from DB
- On login, old user data is cleared and fresh profile is fetched

## Testing Checklist

- [ ] Sign up with a new account (name should have at least 3 characters in first word)
- [ ] Check Supabase dashboard - profile should be created with full_name and username
- [ ] Login and verify profile displays correctly
- [ ] Edit profile and verify changes save to Supabase
- [ ] Logout and login with different account - verify old data is cleared
- [ ] Test on multiple devices with same account - verify profile syncs

## Troubleshooting

### Profile Not Created After Signup
- Check Supabase logs for trigger errors
- Verify RLS policies allow INSERT
- Check that `full_name` is in metadata

### Username Not Set
- Verify first word of name is at least 3 characters
- Check Supabase logs for upsert errors
- The retry logic should handle timing issues, but check console logs

### Profile Not Syncing Across Devices
- Verify profile is loading from Supabase (check network tab)
- Ensure `refreshProfile()` is called on screen focus
- Check that RLS policies allow SELECT for authenticated users

## Files Modified

1. `screens/SignUpScreen.tsx` - Added name field
2. `contexts/AuthContext.tsx` - Updated signUp to accept fullName and set username
3. `screens/ProfileScreen.tsx` - Uses username from Supabase, saves properly
4. `services/profileService.ts` - Handles profile fetching and updating

## No Additional Supabase Configuration Needed

Your current Supabase setup is complete! The trigger, RLS policies, and table structure are all correctly configured. The app will work with your existing setup.

