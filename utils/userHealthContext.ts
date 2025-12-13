/**
 * User Health Context Aggregator
 * 
 * This module provides a single "source of truth" for user health data
 * by aggregating data from multiple sources:
 * - Supabase profile (height, weight, sleep)
 * - HealthDataContext/AsyncStorage (burned calories, nutrition, water)
 * - Calculated values (BMI)
 * 
 * This unified data structure is designed for use by the AI Personal Health Assistant
 * and other features that need a complete view of user health metrics.
 */

import React, { useState, useEffect } from 'react';
import { useHealthData } from '../contexts/HealthDataContext';
import { fetchProfile } from '../services/profileService';
import { AppProfile } from '../services/profileService';

/**
 * Complete user health data structure
 * This is the single source of truth format for AI assistant and other features
 */
export interface UserHealthContext {
  // Profile data (from Supabase)
  height: number | null;        // Height in cm
  weight: number | null;        // Weight in kg
  sleep: number | null;         // Sleep hours per night
  gender: string | null;        // Gender (for context)
  
  // Activity data (from HealthDataContext/AsyncStorage)
  burnedCalories: number;       // Total burned calories (treadmill + cycling)
  nutrition: number | null;     // Daily calories intake
  waterIntake: number | null;   // Daily water intake in liters
  
  // Calculated values
  bmi: number | null;           // BMI calculated from height and weight
  
  // Metadata
  hasCompleteData: boolean;    // Whether all essential fields are available
  dataTimestamp: Date;          // When this data was aggregated
}

/**
 * Parse string values from Supabase profile to numbers
 */
const parseProfileNumber = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Calculate BMI from height (cm) and weight (kg)
 * Formula: BMI = weight (kg) / (height (m))^2
 * Returns null if height or weight is missing
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
 * Get user health context by aggregating data from all sources
 * 
 * This function:
 * 1. Fetches profile data from Supabase (height, weight, sleep, gender)
 * 2. Reads activity data from HealthDataContext (burned calories, nutrition, water)
 * 3. Calculates BMI from height and weight
 * 4. Returns a unified UserHealthContext object
 * 
 * @returns Promise<UserHealthContext> - Complete health data structure
 * 
 * @example
 * ```typescript
 * const healthContext = await getUserHealthContext();
 * if (healthContext.hasCompleteData) {
 *   // Use healthContext for AI recommendations
 * }
 * ```
 */
export const getUserHealthContext = async (): Promise<UserHealthContext> => {
  // Step 1: Fetch profile data from Supabase
  let profile: AppProfile | null = null;
  try {
    profile = await fetchProfile();
  } catch (error) {
    console.error('Error fetching profile for health context:', error);
  }

  // Step 2: Get health data from context
  // Note: This requires the function to be called from within a React component
  // For a pure utility function, we'll need to pass health data as a parameter
  // Let's create two versions: one that takes health data as param, one hook version

  // Parse profile data
  const height = parseProfileNumber(profile?.height);
  const weight = parseProfileNumber(profile?.weight);
  const sleep = parseProfileNumber(profile?.sleep);
  const gender = profile?.gender || null;

  // Step 3: Calculate BMI
  const bmi = calculateBMI(height, weight);

  // Step 4: Determine if we have complete data
  // Essential fields: height, weight (for BMI), at least one activity metric
  const hasCompleteData = !!(height && weight && (bmi !== null));

  return {
    height,
    weight,
    sleep,
    gender,
    burnedCalories: 0, // Will be set by caller or hook
    nutrition: null,    // Will be set by caller or hook
    waterIntake: null,  // Will be set by caller or hook
    bmi,
    hasCompleteData,
    dataTimestamp: new Date(),
  };
};

/**
 * React Hook version: Get user health context with automatic HealthDataContext integration
 * 
 * This hook automatically reads from HealthDataContext and combines with Supabase profile data.
 * Use this in React components.
 * 
 * @returns Promise<UserHealthContext> - Complete health data structure
 * 
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const [healthContext, setHealthContext] = useState<UserHealthContext | null>(null);
 *   
 *   useEffect(() => {
 *     getUserHealthContextHook().then(setHealthContext);
 *   }, []);
 *   
 *   if (healthContext?.hasCompleteData) {
 *     // Use healthContext for AI recommendations
 *   }
 * }
 * ```
 */
export const useUserHealthContext = (): UserHealthContext | null => {
  const healthData = useHealthData();
  const [context, setContext] = useState<UserHealthContext | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      // Fetch profile data
      let profile: AppProfile | null = null;
      try {
        profile = await fetchProfile();
      } catch (error) {
        console.error('Error fetching profile for health context:', error);
      }

      // Parse profile data
      const height = parseProfileNumber(profile?.height);
      const weight = parseProfileNumber(profile?.weight);
      const sleep = parseProfileNumber(profile?.sleep);
      const gender = profile?.gender || null;

      // Get activity data from HealthDataContext
      const burnedCalories = healthData.totalBurnedCalories || 0;
      const nutrition = healthData.nutritionValue;
      const waterIntake = healthData.waterValue;

      // Calculate BMI
      const bmi = calculateBMI(height, weight);

      // Determine if we have complete data
      const hasCompleteData = !!(height && weight && (bmi !== null));

      setContext({
        height,
        weight,
        sleep,
        gender,
        burnedCalories,
        nutrition,
        waterIntake,
        bmi,
        hasCompleteData,
        dataTimestamp: new Date(),
      });
    };

    loadContext();
  }, [
    healthData.totalBurnedCalories,
    healthData.nutritionValue,
    healthData.waterValue,
  ]);

  return context;
};

/**
 * Utility function: Get user health context with health data passed as parameter
 * 
 * Use this version when you already have health data and want to combine with profile.
 * Useful for non-React contexts or when you want more control.
 * 
 * @param healthData - Health data from HealthDataContext
 * @returns Promise<UserHealthContext> - Complete health data structure
 * 
 * @example
 * ```typescript
 * const healthData = useHealthData();
 * const context = await getUserHealthContextWithData(healthData);
 * ```
 */
export const getUserHealthContextWithData = async (
  healthData: {
    totalBurnedCalories: number;
    nutritionValue: number | null;
    waterValue: number | null;
  }
): Promise<UserHealthContext> => {
  // Fetch profile data
  let profile: AppProfile | null = null;
  try {
    profile = await fetchProfile();
  } catch (error) {
    console.error('Error fetching profile for health context:', error);
  }

  // Parse profile data
  const height = parseProfileNumber(profile?.height);
  const weight = parseProfileNumber(profile?.weight);
  const sleep = parseProfileNumber(profile?.sleep);
  const gender = profile?.gender || null;

  // Get activity data from parameter
  const burnedCalories = healthData.totalBurnedCalories || 0;
  const nutrition = healthData.nutritionValue;
  const waterIntake = healthData.waterValue;

  // Calculate BMI
  const bmi = calculateBMI(height, weight);

  // Determine if we have complete data
  const hasCompleteData = !!(height && weight && (bmi !== null));

  return {
    height,
    weight,
    sleep,
    gender,
    burnedCalories,
    nutrition,
    waterIntake,
    bmi,
    hasCompleteData,
    dataTimestamp: new Date(),
  };
};

// Export helper functions for external use
export { calculateBMI, parseProfileNumber };

