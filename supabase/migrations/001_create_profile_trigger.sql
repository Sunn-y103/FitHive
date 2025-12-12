-- =====================================================
-- AUTO-PROFILE CREATION FUNCTION
-- =====================================================
-- NOTE: Supabase doesn't allow triggers on auth.users from SQL editor
-- This function can be called manually or via Database Webhooks
-- The app will handle profile creation automatically via AuthContext
-- =====================================================

-- Function to create profile (can be called from app or webhook)
CREATE OR REPLACE FUNCTION public.handle_new_user(user_id UUID, user_email TEXT, user_full_name TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  user_username TEXT;
BEGIN
  -- Extract username from email (before @) or use UUID prefix as fallback
  user_username := COALESCE(
    SPLIT_PART(user_email, '@', 1),
    SUBSTRING(user_id::text, 1, 8)
  );

  -- Insert new profile row with basic fields
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    user_id,
    user_email,  -- Store email
    user_full_name,  -- Name from signup (optional)
    user_username  -- Extracted from email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    username = COALESCE(EXCLUDED.username, profiles.username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user(UUID, TEXT, TEXT) TO authenticated, anon;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- =====================================================
-- ALTERNATIVE: If you want to use Database Webhooks
-- =====================================================
-- Go to Supabase Dashboard > Database > Webhooks
-- Create a new webhook:
-- - Table: auth.users
-- - Events: INSERT
-- - HTTP Request: POST to your edge function or API endpoint
-- - Or use the function above in your app code

