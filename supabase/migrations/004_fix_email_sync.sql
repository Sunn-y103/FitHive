-- =====================================================
-- FIX EMAIL SYNC BETWEEN AUTH.USERS AND PROFILES
-- =====================================================
-- This script ensures profiles.email matches auth.users.email
-- Run this if you see incorrect emails in the profiles table
-- =====================================================

-- Function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile email when auth.users email changes
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email on auth.users update
DROP TRIGGER IF EXISTS sync_email_on_auth_update ON auth.users;
CREATE TRIGGER sync_email_on_auth_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Fix existing mismatched emails
-- This updates all profiles to match their auth.users email
UPDATE public.profiles p
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE id = p.id
)
WHERE EXISTS (
  SELECT 1 
  FROM auth.users u 
  WHERE u.id = p.id 
  AND u.email IS DISTINCT FROM p.email
);

-- Verify the fix
SELECT 
  p.id,
  p.email as profile_email,
  u.email as auth_email,
  CASE 
    WHEN p.email = u.email THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC
LIMIT 10;

