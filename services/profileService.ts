import { supabase } from '../lib/supabase';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Basic profile fields (set during signup)
 */
export interface BasicProfileFields {
  id: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  website?: string | null;
}

/**
 * Health & fitness fields (updated in Profile screen)
 */
export interface HealthFields {
  height?: string | null;
  weight?: string | null;
  gender?: string | null;
  water?: string | null;
  activity_level?: string | null;
  sleep?: string | null;
}

/**
 * Complete profile interface (matches Supabase profiles table)
 */
export interface SupabaseProfile extends BasicProfileFields, HealthFields {
  created_at?: string;
  updated_at?: string;
}

/**
 * Extended profile with email from auth.users
 */
export interface AppProfile extends BasicProfileFields, HealthFields {
  email: string; // Always present (from auth.users)
}

// =====================================================
// FETCH PROFILE
// =====================================================

/**
 * Fetch current user's profile from Supabase
 * Returns complete profile with all fields (basic + health)
 * 
 * @returns Profile data or null if not found/error
 */
export const fetchProfile = async (): Promise<AppProfile | null> => {
  try {
    console.log('🔍 Fetching user profile...');

    // Step 1: Get current authenticated user
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user;

    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      return null;
    }

    console.log('✅ User authenticated:', user.id);

    // Step 2: Fetch profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, username, avatar_url, website, height, weight, gender, water, activity_level, sleep, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return null;
    }

    if (!profile) {
      console.log('⚠️ Profile not found for user:', user.id);
      // Return default profile with auth user data
      return {
        id: user.id,
        email: user.email || '',
        full_name: null,
        username: user.email?.split('@')[0] || null,
        avatar_url: null,
        website: null,
      };
    }

    // Step 3: Combine profile with email from auth
    const appProfile: AppProfile = {
      id: profile.id,
      email: profile.email || user.email || '',
      full_name: profile.full_name || null,
      username: profile.username || null,
      avatar_url: profile.avatar_url || null,
      website: profile.website || null,
      height: profile.height || undefined,
      weight: profile.weight || undefined,
      gender: profile.gender || undefined,
      water: profile.water || undefined,
      activity_level: profile.activity_level || undefined,
      sleep: profile.sleep || undefined,
    };

    console.log('✅ Profile fetched successfully:', {
      id: appProfile.id,
      email: appProfile.email,
      hasHealthData: !!(appProfile.height || appProfile.weight || appProfile.gender),
    });

    return appProfile;
  } catch (error) {
    console.error('❌ Exception in fetchProfile:', error);
    return null;
  }
};

// =====================================================
// UPDATE PROFILE DETAILS (Basic Fields)
// =====================================================

/**
 * Update basic profile fields (name, username, avatar, website)
 * Does NOT update health fields
 * 
 * @param fields - Basic profile fields to update
 * @returns Updated profile data or error
 */
export const updateProfileDetails = async (
  fields: Partial<BasicProfileFields>
): Promise<{ error: Error | null; data?: SupabaseProfile[] }> => {
  try {
    console.log('📝 Updating profile details...');

    // Step 1: Get current authenticated user
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user;

    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      return { error: new Error('Not authenticated') };
    }

    // Step 2: Prepare update data (only basic fields)
    const updateData: Partial<SupabaseProfile> = {
      id: user.id,  // REQUIRED: PK must match auth.uid()
      full_name: fields.full_name || null,
      username: fields.username || null,
      avatar_url: fields.avatar_url || null,
      website: fields.website || null,
      updated_at: new Date().toISOString(),
    };

    console.log('📤 Updating profile details with:', {
      id: user.id,
      full_name: updateData.full_name,
      username: updateData.username,
    });

    // Step 3: Upsert profile (insert or update)
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .upsert(updateData)
      .select();

    if (error) {
      console.error('❌ Error updating profile details:', {
        message: error.message,
        details: error.details,
        code: error.code,
      });
      return { error: error as Error };
    }

    console.log('✅ Profile details updated successfully');
    return { error: null, data: updatedProfile };
  } catch (error) {
    console.error('❌ Exception in updateProfileDetails:', error);
    return { error: error as Error };
  }
};

// =====================================================
// UPDATE HEALTH FIELDS (Health & Fitness Only)
// =====================================================

/**
 * Update ONLY health & fitness fields (height, weight, gender, water, etc.)
 * Does NOT update basic profile fields (name, username, etc.)
 * 
 * @param fields - Health fields to update
 * @returns Updated profile data or error
 */
export const updateHealthFields = async (
  fields: Partial<HealthFields>
): Promise<{ error: Error | null; data?: SupabaseProfile[] }> => {
  try {
    console.log('💪 Updating health fields...');

    // Step 1: Get current authenticated user
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user;

    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      return { error: new Error('Not authenticated') };
    }

    // Step 2: Prepare update data (ONLY health fields)
    const updateData: Partial<SupabaseProfile> = {
      id: user.id,  // REQUIRED: PK must match auth.uid()
      height: fields.height || null,
      weight: fields.weight || null,
      gender: fields.gender || null,
      water: fields.water || null,
      activity_level: fields.activity_level || null,
      sleep: fields.sleep || null,
      updated_at: new Date().toISOString(),
    };

    // Debug log: Show what's being updated
    console.log('📤 Updating health fields with:', {
      id: user.id,
      height: updateData.height,
      weight: updateData.weight,
      gender: updateData.gender,
      water: updateData.water,
      activity_level: updateData.activity_level,
      sleep: updateData.sleep,
    });

    // Step 3: Upsert profile (insert or update)
    // This will ONLY update the health fields, leaving other fields unchanged
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .upsert(updateData)
      .select();

    if (error) {
      console.error('❌ Error updating health fields:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { error: error as Error };
    }

    console.log('✅ Health fields updated successfully:', updatedProfile);
    return { error: null, data: updatedProfile };
  } catch (error) {
    console.error('❌ Exception in updateHealthFields:', error);
    return { error: error as Error };
  }
};

// =====================================================
// LEGACY FUNCTIONS (for backward compatibility)
// =====================================================

/**
 * @deprecated Use fetchProfile() instead
 * Get current authenticated user's profile from Supabase
 */
export const getCurrentUserProfile = fetchProfile;

/**
 * @deprecated Use updateProfileDetails() or updateHealthFields() instead
 * Create or update user profile in Supabase (all fields)
 */
export const upsertUserProfile = async (
  profile: Partial<SupabaseProfile>
): Promise<{ error: Error | null; data?: any }> => {
  try {
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user;

    if (authError || !user) {
      return { error: new Error('Not authenticated') };
    }

    const updateData: Partial<SupabaseProfile> = {
      id: user.id,
      ...profile,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .upsert(updateData)
      .select();

    if (error) {
      return { error: error as Error };
    }

    return { error: null, data: updatedProfile };
  } catch (error) {
    return { error: error as Error };
  }
};

/**
 * Clear cached profile data for the current user
 */
export const clearCachedProfile = async (): Promise<void> => {
  // This will be handled by Storage.clearUserData() on logout
  // But we can add any profile-specific cache clearing here if needed
};
