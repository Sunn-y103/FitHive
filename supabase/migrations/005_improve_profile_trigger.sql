-- =====================================================
-- IMPROVE PROFILE CREATION TRIGGER
-- =====================================================
-- This ensures the trigger always uses the correct email
-- and handles edge cases better
-- =====================================================

-- Drop and recreate the trigger function with better email handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile row when a user signs up
  -- Use COALESCE to ensure we always have a value
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NULL),  -- Explicitly use NEW.email, fallback to NULL
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(
      NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),  -- Extract username, handle empty
      SUBSTRING(NEW.id::text, 1, 8)    -- Fallback to first 8 chars of UUID
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),  -- Update email if provided
    username = COALESCE(EXCLUDED.username, profiles.username)  -- Update username if provided
  WHERE profiles.email IS DISTINCT FROM EXCLUDED.email;  -- Only update if different
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger should already exist, but recreate it to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Immediate fix: Update the specific user's email
-- Replace 'gotya@gmail.com' with the actual user ID if you know it
-- Or run this query to find and fix the user:
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND u.email = 'gotya@gmail.com'
  AND p.email != u.email;

-- Show the result
SELECT 
  p.id,
  p.email as profile_email,
  u.email as auth_email,
  p.username
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'gotya@gmail.com';

