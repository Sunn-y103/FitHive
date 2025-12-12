/**
 * Daily Mission Manager
 * 
 * This utility manages daily mission completion status and determines
 * whether users can claim rewards based on mission completion.
 * 
 * Requirements:
 * - Users must complete at least 3 out of 4 daily missions to unlock rewards
 * - Mission status is stored per user, per day
 * - Status updates automatically when health values change
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserKey } from './userStorageUtils';
import { todayKey } from './storageUtils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Daily mission completion status
 */
export interface DailyMissionStatus {
  waterDone: boolean;
  burnedDone: boolean;
  nutritionDone: boolean;
  sleepDone: boolean;
  completedCount: number;    // 0-4
  canClaimReward: boolean;  // true when completedCount >= 3
}

/**
 * Mission completion state (simplified, for backward compatibility)
 */
export interface MissionCompletionState {
  waterIntake: boolean;
  burnedCalories: boolean;
  nutrition: boolean;
  sleep: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Daily mission goals
 */
export const DAILY_GOALS = {
  WATER_INTAKE: 3,      // liters
  BURNED_CALORIES: 300, // kcal
  NUTRITION: 2200,      // kcal
  SLEEP: 7,             // hours
} as const;

/**
 * Minimum missions required to unlock rewards
 */
const MIN_MISSIONS_FOR_REWARD = 3;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the storage key for daily mission status
 * Format: "dailyMission_<userId>_YYYY-MM-DD"
 * 
 * @param {string | null | undefined} userId - User ID
 * @param {string} dateStr - Date string in YYYY-MM-DD format (defaults to today)
 * @returns {string} Storage key
 */
export function getDailyMissionKey(
  userId: string | null | undefined,
  dateStr: string = todayKey()
): string {
  const baseKey = `dailyMission_${dateStr}`;
  return getUserKey(baseKey, userId);
}

/**
 * Check if a mission is completed based on current value vs goal
 * 
 * @param {number | null} currentValue - Current health value
 * @param {number} goal - Goal value
 * @returns {boolean} True if mission is completed
 */
export function isMissionCompleted(
  currentValue: number | null,
  goal: number
): boolean {
  if (currentValue === null || currentValue === undefined) {
    return false;
  }
  return currentValue >= goal;
}

/**
 * Calculate mission completion status from health values
 * 
 * @param {Object} values - Health values
 * @param {number | null} waterValue - Water intake in liters
 * @param {number | null} burnedValue - Burned calories
 * @param {number | null} nutritionValue - Nutrition calories
 * @param {number | null} sleepValue - Sleep hours
 * @returns {DailyMissionStatus} Complete mission status
 */
export function calculateMissionStatus(
  waterValue: number | null,
  burnedValue: number | null,
  nutritionValue: number | null,
  sleepValue: number | null
): DailyMissionStatus {
  const waterDone = isMissionCompleted(waterValue, DAILY_GOALS.WATER_INTAKE);
  const burnedDone = isMissionCompleted(burnedValue, DAILY_GOALS.BURNED_CALORIES);
  const nutritionDone = isMissionCompleted(nutritionValue, DAILY_GOALS.NUTRITION);
  const sleepDone = isMissionCompleted(sleepValue, DAILY_GOALS.SLEEP);

  const completedCount = [
    waterDone,
    burnedDone,
    nutritionDone,
    sleepDone,
  ].filter(Boolean).length;

  const canClaimReward = completedCount >= MIN_MISSIONS_FOR_REWARD;

  return {
    waterDone,
    burnedDone,
    nutritionDone,
    sleepDone,
    completedCount,
    canClaimReward,
  };
}

/**
 * Convert DailyMissionStatus to MissionCompletionState (for backward compatibility)
 * 
 * @param {DailyMissionStatus} status - Daily mission status
 * @returns {MissionCompletionState} Mission completion state
 */
export function statusToState(status: DailyMissionStatus): MissionCompletionState {
  return {
    waterIntake: status.waterDone,
    burnedCalories: status.burnedDone,
    nutrition: status.nutritionDone,
    sleep: status.sleepDone,
  };
}

/**
 * Convert MissionCompletionState to DailyMissionStatus
 * 
 * @param {MissionCompletionState} state - Mission completion state
 * @returns {DailyMissionStatus} Daily mission status
 */
export function stateToStatus(state: MissionCompletionState): DailyMissionStatus {
  const completedCount = [
    state.waterIntake,
    state.burnedCalories,
    state.nutrition,
    state.sleep,
  ].filter(Boolean).length;

  return {
    waterDone: state.waterIntake,
    burnedDone: state.burnedCalories,
    nutritionDone: state.nutrition,
    sleepDone: state.sleep,
    completedCount,
    canClaimReward: completedCount >= MIN_MISSIONS_FOR_REWARD,
  };
}

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

/**
 * Load daily mission status from AsyncStorage
 * 
 * @param {string | null | undefined} userId - User ID
 * @param {string} dateStr - Date string (defaults to today)
 * @returns {Promise<DailyMissionStatus | null>} Mission status or null if not found
 */
export async function loadDailyMissionStatus(
  userId: string | null | undefined,
  dateStr: string = todayKey()
): Promise<DailyMissionStatus | null> {
  if (!userId) {
    return null;
  }

  try {
    const key = getDailyMissionKey(userId, dateStr);
    const saved = await AsyncStorage.getItem(key);
    
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // If it's the old format (MissionCompletionState), convert it
      if ('waterIntake' in parsed) {
        return stateToStatus(parsed as MissionCompletionState);
      }
      
      // If it's already DailyMissionStatus, return it
      if ('canClaimReward' in parsed) {
        return parsed as DailyMissionStatus;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error loading daily mission status:', error);
    return null;
  }
}

/**
 * Save daily mission status to AsyncStorage
 * 
 * @param {string | null | undefined} userId - User ID
 * @param {DailyMissionStatus} status - Mission status to save
 * @param {string} dateStr - Date string (defaults to today)
 * @returns {Promise<boolean>} True if saved successfully
 */
export async function saveDailyMissionStatus(
  userId: string | null | undefined,
  status: DailyMissionStatus,
  dateStr: string = todayKey()
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const key = getDailyMissionKey(userId, dateStr);
    await AsyncStorage.setItem(key, JSON.stringify(status));
    return true;
  } catch (error) {
    console.error('Error saving daily mission status:', error);
    return false;
  }
}

/**
 * Get or create daily mission status
 * If status doesn't exist, creates a default one
 * 
 * @param {string | null | undefined} userId - User ID
 * @param {Object} healthValues - Current health values
 * @param {number | null} waterValue - Water intake
 * @param {number | null} burnedValue - Burned calories
 * @param {number | null} nutritionValue - Nutrition calories
 * @param {number | null} sleepValue - Sleep hours
 * @param {string} dateStr - Date string (defaults to today)
 * @returns {Promise<DailyMissionStatus>} Mission status
 */
export async function getOrCreateDailyMissionStatus(
  userId: string | null | undefined,
  waterValue: number | null,
  burnedValue: number | null,
  nutritionValue: number | null,
  sleepValue: number | null,
  dateStr: string = todayKey()
): Promise<DailyMissionStatus> {
  // Try to load existing status
  const existing = await loadDailyMissionStatus(userId, dateStr);
  
  if (existing) {
    // Recalculate to ensure it's up to date
    return calculateMissionStatus(waterValue, burnedValue, nutritionValue, sleepValue);
  }
  
  // Create new status
  const newStatus = calculateMissionStatus(waterValue, burnedValue, nutritionValue, sleepValue);
  
  // Save it
  await saveDailyMissionStatus(userId, newStatus, dateStr);
  
  return newStatus;
}

