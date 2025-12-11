-- =====================================================
-- AUTO-PROFILE CREATION TRIGGER
-- =====================================================
-- This trigger automatically creates a profile row when a user signs up
-- ONLY inserts: id, email, name (full_name)
-- Health fields (height, weight, gender, water, etc.) are NULL
-- User will fill these later in the Profile screen
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile row when a user signs up
  -- ONLY basic fields: id, email, name (full_name)
  -- Health fields are NOT set here - they start as NULL
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,  -- Store email for convenience
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),  -- Name from signup form (optional)
    COALESCE(
      SPLIT_PART(NEW.email, '@', 1),  -- Extract username from email (before @)
      SUBSTRING(NEW.id::text, 1, 8)    -- Fallback to first 8 chars of UUID
    )
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate inserts
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

