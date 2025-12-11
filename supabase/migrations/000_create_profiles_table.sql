-- =====================================================
-- PROFILES TABLE SCHEMA
-- =====================================================
-- This table stores user profile information
-- Signup creates: id, email, name (full_name)
-- Health fields are updated later via Profile screen
-- =====================================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  -- Primary Key (matches auth.users.id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Profile Fields (set during signup)
  email TEXT,  -- User's email (for convenience, also in auth.users)
  full_name TEXT,  -- User's full name (optional during signup)
  username TEXT UNIQUE,  -- Unique username (extracted from email)
  
  -- Profile Details (optional, updated later)
  avatar_url TEXT,
  website TEXT,
  
  -- Health & Fitness Fields (updated in Profile screen)
  height TEXT,  -- Height in cm (e.g., "175")
  weight TEXT,  -- Weight in kg (e.g., "70")
  gender TEXT,  -- Gender (e.g., "Male", "Female", "Other")
  water TEXT,  -- Daily water goal in liters (e.g., "2.5")
  activity_level TEXT,  -- Activity level (e.g., "Sedentary", "Active", "Very Active")
  sleep TEXT,  -- Sleep hours per night (e.g., "8")
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policy: Anyone can view profiles (for public profiles)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

