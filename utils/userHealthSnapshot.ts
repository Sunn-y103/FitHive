/**
 * User Health Snapshot Utility
 * 
 * Creates a single plain JavaScript object aggregating all available user health data
 * for use by AI Personal Health Assistant and other features.
 * 
 * This is a frontend-only aggregation layer that:
 * - Reads from Supabase profile (height, weight, sleep)
 * - Reads from HealthDataContext/AsyncStorage (burned calories, nutrition)
 * - Calculates BMI dynamically
 * - Returns a simple plain object (not stored permanently)
 * 
 * Usage:
 * ```typescript
 * const snapshot = await getUserHealthSnapshot(healthData);
 * // Use snapshot.height, snapshot.weight, snapshot.bmi, etc.
 * ```
 */

import { fetchProfile } from '../services/profileService';

/**
 * User Health Snapshot - Plain JavaScript object
 * Single source of truth for AI assistant context
 */
export interface UserHealthSnapshot {
  height: number | null;
  weight: number | null;
  bmi: number | null;
  sleepHours: number | null;
  burnedCalories: number;
  nutritionSummary: number | null;
}

/**
 * Calculate BMI from height (cm) and weight (kg)
 * Formula: BMI = weight (kg) / (height (m))^2
 * Returns null if height or weight is missing/invalid
 */
const calculateBMI = (height: number | null, weight: number | null): number | null => {
  if (!height || !weight || height <= 0 || weight <= 0) {
    return null;
  }
  
  // Convert height from cm to meters
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  // Round to 1 decimal place
  return Math.round(bmi * 10) / 10;
};

/**
 * Parse string value from Supabase profile to number
 * Returns null if value is missing or invalid
 */
const parseNumber = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Create a User Health Snapshot by aggregating data from all sources
 * 
 * This function:
 * 1. Fetches profile data from Supabase (height, weight, sleep)
 * 2. Uses provided health data from HealthDataContext (burned calories, nutrition)
 * 3. Calculates BMI from height and weight
 * 4. Returns a plain JavaScript object with all available data
 * 
 * @param healthData - Health data from HealthDataContext
 * @returns Promise<UserHealthSnapshot> - Plain object with all health metrics
 * 
 * @example
 * ```typescript
 * const healthData = useHealthData();
 * const snapshot = await getUserHealthSnapshot({
 *   totalBurnedCalories: healthData.totalBurnedCalories,
 *   nutritionValue: healthData.nutritionValue,
 * });
 * 
 * // Use snapshot for AI recommendations
 * if (snapshot.bmi) {
 *   console.log(`User BMI: ${snapshot.bmi}`);
 * }
 * ```
 */
export const getUserHealthSnapshot = async (
  healthData: {
    totalBurnedCalories: number;
    nutritionValue: number | null;
  }
): Promise<UserHealthSnapshot> => {
  // Step 1: Fetch profile data from Supabase (height, weight, sleep)
  let profile = null;
  try {
    profile = await fetchProfile();
  } catch (error) {
    console.error('Error fetching profile for health snapshot:', error);
    // Continue with null profile - will use fallback values
  }

  // Step 2: Parse profile data with fallbacks
  const height = parseNumber(profile?.height) ?? null;
  const weight = parseNumber(profile?.weight) ?? null;
  const sleepHours = parseNumber(profile?.sleep) ?? null;

  // Step 3: Get activity data from HealthDataContext parameter
  const burnedCalories = healthData.totalBurnedCalories || 0;
  const nutritionSummary = healthData.nutritionValue ?? null;

  // Step 4: Calculate BMI dynamically
  const bmi = calculateBMI(height, weight);

  // Step 5: Return plain JavaScript object
  return {
    height,
    weight,
    bmi,
    sleepHours,
    burnedCalories,
    nutritionSummary,
  };
};

/**
 * Create a User Health Snapshot synchronously (if profile data is already available)
 * 
 * Use this version when you already have profile data loaded and want to avoid
 * an additional async call to fetchProfile.
 * 
 * @param profileData - Profile data from Supabase (can be null)
 * @param healthData - Health data from HealthDataContext
 * @returns UserHealthSnapshot - Plain object with all health metrics
 * 
 * @example
 * ```typescript
 * const profile = await fetchProfile();
 * const healthData = useHealthData();
 * const snapshot = getUserHealthSnapshotSync(profile, {
 *   totalBurnedCalories: healthData.totalBurnedCalories,
 *   nutritionValue: healthData.nutritionValue,
 * });
 * ```
 */
export const getUserHealthSnapshotSync = (
  profileData: {
    height?: string | null;
    weight?: string | null;
    sleep?: string | null;
  } | null,
  healthData: {
    totalBurnedCalories: number;
    nutritionValue: number | null;
  }
): UserHealthSnapshot => {
  // Parse profile data with fallbacks
  const height = parseNumber(profileData?.height) ?? null;
  const weight = parseNumber(profileData?.weight) ?? null;
  const sleepHours = parseNumber(profileData?.sleep) ?? null;

  // Get activity data
  const burnedCalories = healthData.totalBurnedCalories || 0;
  const nutritionSummary = healthData.nutritionValue ?? null;

  // Calculate BMI dynamically
  const bmi = calculateBMI(height, weight);

  // Return plain JavaScript object
  return {
    height,
    weight,
    bmi,
    sleepHours,
    burnedCalories,
    nutritionSummary,
  };
};

// Export helper functions for external use
export { calculateBMI, parseNumber };

