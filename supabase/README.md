# Supabase Profile Setup

This directory contains the necessary files to automatically create user profiles when a new user signs up.

## Setup Instructions

### Option 1: Database Trigger (Recommended - Simpler & More Reliable)

The database trigger automatically creates a profile row when a new user signs up. This is the recommended approach.

1. **Run the migration:**
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or manually run the SQL in your Supabase dashboard:
   # Go to SQL Editor → New Query → Paste contents of migrations/001_create_profile_trigger.sql → Run
   ```

2. **Verify the trigger is active:**
   - Go to Database → Triggers in your Supabase dashboard
   - You should see `on_auth_user_created` trigger on `auth.users` table

### Option 2: Edge Function (Alternative)

The edge function can be used if you need more complex logic or want to call external APIs.

1. **Deploy the edge function:**
   ```bash
   # If using Supabase CLI
   supabase functions deploy handle_new_user
   ```

2. **Set up the webhook:**
   - Go to Database → Webhooks in your Supabase dashboard
   - Create a new webhook that triggers on `auth.users` INSERT
   - Point it to: `https://[your-project-ref].supabase.co/functions/v1/handle_new_user`

## How It Works

### Database Trigger Approach
- When a user signs up, a trigger fires automatically
- The trigger inserts a new row into `profiles` table with:
  - `id`: The user's UUID from `auth.users`
  - `username`: Extracted from email (part before @)
  - `full_name`: From user metadata if available
  - `updated_at`: Current timestamp

### Edge Function Approach
- When a user signs up, a webhook calls the edge function
- The function uses the service role key to insert the profile
- Handles duplicate profile creation gracefully

## Profile Updates

Profile updates are handled by the `upsertUserProfile` function in `services/profileService.ts`:

- Always includes `id: user.id` to match the authenticated user
- Uses `.upsert()` to create or update in a single operation
- Prevents duplicate rows by using the user ID as the primary key
- Includes `.select()` to return the updated profile

## Testing

1. **Test profile creation:**
   - Sign up a new user
   - Check the `profiles` table in Supabase dashboard
   - Verify a row was created with the user's ID

2. **Test profile update:**
   - Update profile fields (height, weight, gender, etc.)
   - Verify the update works even if the profile already exists
   - Check that no duplicate rows are created

