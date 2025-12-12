-- =====================================================
-- FIX NULL EMAILS AND SYNC EMAIL FROM AUTH.USERS
-- =====================================================
-- This migration:
-- 1. Updates existing profiles with NULL emails from auth.users
-- 2. Creates a function to sync email when user confirms email
-- 3. Creates a trigger to auto-update email when it changes in auth.users
-- =====================================================

-- Step 1: Update existing profiles with NULL emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id 
  AND p.email IS NULL 
  AND u.email IS NOT NULL;

-- Step 2: Create function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile email when auth.users email changes (e.g., on confirmation)
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id
    AND (email IS NULL OR email != NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to sync email on auth.users update
DROP TRIGGER IF EXISTS sync_email_on_user_update ON auth.users;
CREATE TRIGGER sync_email_on_user_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();

-- Step 4: Also sync email when user is created (in case trigger missed it)
CREATE OR REPLACE FUNCTION public.ensure_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile exists but email is NULL, update it
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id
    AND email IS NULL
    AND NEW.email IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_email_on_user_create ON auth.users;
CREATE TRIGGER ensure_email_on_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_email();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_profile_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_email() TO authenticated;

