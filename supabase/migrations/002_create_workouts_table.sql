-- =====================================================
-- WORKOUTS TABLE SCHEMA
-- =====================================================
-- This table stores workout results from AI rep counter
-- =====================================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS public.workouts CASCADE;

-- Create workouts table
CREATE TABLE public.workouts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key to auth.users
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Workout Data
  exercise TEXT NOT NULL,  -- Exercise type: 'pushup', 'curl', or 'squat'
  reps INTEGER NOT NULL,   -- Number of repetitions completed
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_workouts_user_id ON public.workouts(user_id);

-- Create index on created_at for sorting
CREATE INDEX idx_workouts_created_at ON public.workouts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policy: Users can view their own workouts
CREATE POLICY "Users can view own workouts"
  ON public.workouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own workouts
CREATE POLICY "Users can insert own workouts"
  ON public.workouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workouts
CREATE POLICY "Users can update own workouts"
  ON public.workouts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workouts
CREATE POLICY "Users can delete own workouts"
  ON public.workouts
  FOR DELETE
  USING (auth.uid() = user_id);

