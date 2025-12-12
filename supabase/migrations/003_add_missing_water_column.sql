-- =====================================================
-- ADD MISSING COLUMNS TO PROFILES TABLE
-- =====================================================
-- This migration adds missing columns to the profiles table
-- Run this in Supabase SQL Editor to fix schema errors
-- =====================================================

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Added created_at column to profiles table';
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Added updated_at column to profiles table';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Add water column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'water'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN water TEXT;
        
        RAISE NOTICE 'Added water column to profiles table';
    ELSE
        RAISE NOTICE 'water column already exists';
    END IF;
END $$;

-- Add activity_level column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'activity_level'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN activity_level TEXT;
        
        RAISE NOTICE 'Added activity_level column to profiles table';
    END IF;
END $$;

-- Add sleep column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'sleep'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN sleep TEXT;
        
        RAISE NOTICE 'Added sleep column to profiles table';
    END IF;
END $$;

