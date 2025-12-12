/**
 * Streak and Milestones Tracker
 * 
 * This module implements frontend-only logic for:
 * - Tracking daily mission completion
 * - Computing and updating streaks
 * - Awarding milestone FitCoins (7, 14, 30 days)
 * 
 * This works together with the AI reward flow to provide a complete
 * gamification system for daily health tracking.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// STORAGE KEYS
// ============================================================================

/**
 * Storage keys used by this module
 */
const STORAGE_KEYS = {
  CURRENT_STREAK: 'current_streak',
  LAST_COMPLETED_DATE: 'last_completed_date',
  MILESTONES_AWARDED: 'milestones_awarded',
  FITCOINS_BALANCE: 'fitcoins_balance',
} as const;

/**
 * Generate daily mission storage key
 * Format: "dailyMission_YYYY-MM-DD"
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Storage key
 */
function dailyMissionKey(dateStr: string): string {
  return `dailyMission_${dateStr}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a date as YYYY-MM-DD string
 * 
 * @param {Date} date - Date object (defaults to today)
 * @returns {string} Formatted date string
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date as YYYY-MM-DD string
 * 
 * @param {Date} date - Reference date (defaults to today)
 * @returns {string} Yesterday's date string
 */
export function yesterdayDateStr(date: Date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}

/**
 * Load JSON object from AsyncStorage
 * 
 * @param {string} key - Storage key
 * @returns {Promise<any>} Parsed JSON object or null
 */
async function loadJSON(key: string): Promise<any> {
  try {
    const jsonString = await AsyncStorage.getItem(key);
    if (jsonString === null) {
      return null;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`Error loading JSON from AsyncStorage [${key}]:`, error);
    return null;
  }
}

/**
 * Save JSON object to AsyncStorage
 * 
 * @param {string} key - Storage key
 * @param {any} obj - Object to save
 * @returns {Promise<boolean>} True if successful
 */
async function saveJSON(key: string, obj: any): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(obj);
    await AsyncStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error(`Error saving JSON to AsyncStorage [${key}]:`, error);
    return false;
  }
}

/**
 * Add FitCoins to the current balance
 * 
 * @param {number} amount - Coins to add
 * @returns {Promise<number>} New balance after adding
 */
async function addFitcoins(amount: number): Promise<number> {
  try {
    const currentBalance = await loadJSON(STORAGE_KEYS.FITCOINS_BALANCE);
    const balance = typeof currentBalance === 'number' && currentBalance >= 0 
      ? currentBalance 
      : 0;
    
    const newBalance = balance + amount;
    await saveJSON(STORAGE_KEYS.FITCOINS_BALANCE, newBalance);
    return newBalance;
  } catch (error) {
    console.error('Error adding FitCoins:', error);
    // Return current balance on error
    const currentBalance = await loadJSON(STORAGE_KEYS.FITCOINS_BALANCE);
    return typeof currentBalance === 'number' && currentBalance >= 0 
      ? currentBalance 
      : 0;
  }
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Daily mission completion record
 */
interface DailyMissionRecord {
  allCompleted: boolean;
  completedAt: string; // ISO string
}

/**
 * Milestone record
 */
interface MilestoneRecord {
  streak: number;
  awardedAt: string; // YYYY-MM-DD
}

/**
 * Newly awarded milestone
 */
export interface NewlyAwardedMilestone {
  streak: number;
  coins: number;
}

/**
 * Result of marking today as completed
 */
interface MarkTodayResult {
  alreadyMarked: boolean;
  dateStr: string;
}

/**
 * Result of onDailyMissionCompleted
 */
export interface DailyMissionCompletedResult {
  alreadyMarked: boolean;
  dateStr: string;
  streak: number;
  newlyAwarded: NewlyAwardedMilestone[];
  newBalance?: number;
}

// ============================================================================
// MARK TODAY AS COMPLETED (IDEMPOTENT)
// ============================================================================

/**
 * Marks today as completed in storage
 * 
 * This function is idempotent - calling it multiple times for the same day
 * will only mark it once. This prevents duplicate completions.
 * 
 * @param {Date} date - Date to mark (defaults to today)
 * @returns {Promise<MarkTodayResult>} Result with alreadyMarked flag and dateStr
 */
export async function markTodayCompleted(
  date: Date = new Date()
): Promise<MarkTodayResult> {
  // Step 1: Get today's date string
  const dateStr = formatDate(date);
  const key = dailyMissionKey(dateStr);

  // Step 2: Check if today is already marked as completed
  const existing = await loadJSON(key);
  
  if (
    existing &&
    typeof existing === 'object' &&
    existing.allCompleted === true
  ) {
    // Already marked - return early (idempotent)
    return {
      alreadyMarked: true,
      dateStr,
    };
  }

  // Step 3: Mark today as completed
  const record: DailyMissionRecord = {
    allCompleted: true,
    completedAt: new Date().toISOString(),
  };

  await saveJSON(key, record);

  // Step 4: Update last completed date
  await saveJSON(STORAGE_KEYS.LAST_COMPLETED_DATE, dateStr);

  return {
    alreadyMarked: false,
    dateStr,
  };
}

// ============================================================================
// COMPUTE & UPDATE STREAK
// ============================================================================

/**
 * Computes and updates the current streak
 * 
 * Streak logic:
 * - If yesterday was completed → streak continues (prevStreak + 1)
 * - If yesterday was NOT completed → streak resets to 1
 * 
 * This ensures streaks are only maintained for consecutive days.
 * 
 * @param {Date} date - Reference date (defaults to today)
 * @returns {Promise<number>} New streak count
 */
export async function computeAndUpdateStreak(
  date: Date = new Date()
): Promise<number> {
  // Step 1: Get yesterday's date string
  const yesterdayStr = yesterdayDateStr(date);
  const yesterdayKey = dailyMissionKey(yesterdayStr);

  // Step 2: Check if yesterday was completed
  const yesterdayRecord = await loadJSON(yesterdayKey);
  const yesterdayDone =
    yesterdayRecord &&
    typeof yesterdayRecord === 'object' &&
    yesterdayRecord.allCompleted === true;

  // Step 3: Load previous streak (defaults to 0)
  const prevStreak = await loadJSON(STORAGE_KEYS.CURRENT_STREAK);
  const previousStreak = typeof prevStreak === 'number' && prevStreak >= 0 
    ? prevStreak 
    : 0;

  // Step 4: Calculate new streak
  let newStreak: number;
  if (yesterdayDone) {
    // Yesterday was completed → streak continues
    newStreak = previousStreak + 1;
  } else {
    // Yesterday was NOT completed → streak resets to 1
    // (Today is the first day of a new streak)
    newStreak = 1;
  }

  // Step 5: Save new streak and update last completed date
  const dateStr = formatDate(date);
  await saveJSON(STORAGE_KEYS.CURRENT_STREAK, newStreak);
  await saveJSON(STORAGE_KEYS.LAST_COMPLETED_DATE, dateStr);

  return newStreak;
}

// ============================================================================
// MILESTONE AWARDING (7, 14, 30 DAYS)
// ============================================================================

/**
 * Awards milestone FitCoins if streak reaches a milestone threshold
 * 
 * Milestone thresholds:
 * - 7 days → 50 FitCoins
 * - 14 days → 120 FitCoins
 * - 30 days → 300 FitCoins
 * 
 * Each milestone is only awarded once (tracked in milestones_awarded array).
 * 
 * @param {number} newStreak - Current streak count
 * @param {Date} date - Reference date (defaults to today)
 * @returns {Promise<NewlyAwardedMilestone[]>} Array of newly awarded milestones
 */
export async function awardMilestoneIfAny(
  newStreak: number,
  date: Date = new Date()
): Promise<NewlyAwardedMilestone[]> {
  // Step 1: Define milestone thresholds and rewards
  const milestones = [
    { streak: 7, coins: 50 },
    { streak: 14, coins: 120 },
    { streak: 30, coins: 300 },
  ];

  // Step 2: Load previously awarded milestones
  const awarded = await loadJSON(STORAGE_KEYS.MILESTONES_AWARDED);
  const milestonesAwarded: MilestoneRecord[] = Array.isArray(awarded)
    ? awarded
    : [];

  // Step 3: Check which milestones should be awarded
  const newlyAwarded: NewlyAwardedMilestone[] = [];
  const dateStr = formatDate(date);

  for (const milestone of milestones) {
    // Check if streak reached this milestone
    if (newStreak >= milestone.streak) {
      // Check if this milestone was already awarded
      const alreadyAwarded = milestonesAwarded.some(
        (m) => m.streak === milestone.streak
      );

      if (!alreadyAwarded) {
        // Award this milestone
        // Step 3a: Add FitCoins to balance
        await addFitcoins(milestone.coins);

        // Step 3b: Record milestone award
        milestonesAwarded.push({
          streak: milestone.streak,
          awardedAt: dateStr,
        });

        // Step 3c: Add to newly awarded list
        newlyAwarded.push({
          streak: milestone.streak,
          coins: milestone.coins,
        });
      }
    }
  }

  // Step 4: Save updated milestones array
  if (newlyAwarded.length > 0) {
    await saveJSON(STORAGE_KEYS.MILESTONES_AWARDED, milestonesAwarded);
  }

  return newlyAwarded;
}

// ============================================================================
// MAIN FUNCTION: onDailyMissionCompleted
// ============================================================================

/**
 * Main function called when all daily missions are completed
 * 
 * This function orchestrates the complete flow:
 * 1. Marks today as completed (idempotent)
 * 2. Computes and updates streak
 * 3. Awards milestone FitCoins if applicable
 * 4. Returns comprehensive result
 * 
 * This should be called when the user completes all 4 daily missions:
 * - Water Intake (3L)
 * - Burned Calories (300 kcal)
 * - Nutrition (2200 kcal)
 * - Sleep (7 hours)
 * 
 * @param {Date} date - Date to process (defaults to today)
 * @returns {Promise<DailyMissionCompletedResult>} Complete result with streak and milestones
 * 
 * @example
 * const result = await onDailyMissionCompleted();
 * if (result.alreadyMarked) {
 *   console.log('Already completed today');
 * } else {
 *   console.log(`New streak: ${result.streak} days`);
 *   if (result.newlyAwarded.length > 0) {
 *     console.log('Milestones awarded:', result.newlyAwarded);
 *   }
 * }
 */
export async function onDailyMissionCompleted(
  date: Date = new Date()
): Promise<DailyMissionCompletedResult> {
  // Step 1: Mark today as completed
  // This is idempotent - if already marked, it returns early
  const markResult = await markTodayCompleted(date);

  // Step 2: If already marked, return early with current streak
  if (markResult.alreadyMarked) {
    const currentStreak = await loadJSON(STORAGE_KEYS.CURRENT_STREAK);
    const streak = typeof currentStreak === 'number' && currentStreak >= 0 
      ? currentStreak 
      : 0;

    return {
      alreadyMarked: true,
      dateStr: markResult.dateStr,
      streak,
      newlyAwarded: [],
    };
  }

  // Step 3: Compute and update streak
  // This checks if yesterday was completed and updates streak accordingly
  const newStreak = await computeAndUpdateStreak(date);

  // Step 4: Award milestone FitCoins if applicable
  // This checks if streak reached 7, 14, or 30 days and awards coins
  const newlyAwarded = await awardMilestoneIfAny(newStreak, date);

  // Step 5: Load updated FitCoins balance
  // Only include balance if milestones were awarded (coins were added)
  let newBalance: number | undefined;
  if (newlyAwarded.length > 0) {
    const balance = await loadJSON(STORAGE_KEYS.FITCOINS_BALANCE);
    newBalance = typeof balance === 'number' && balance >= 0 ? balance : 0;
  }

  // Step 6: Return comprehensive result
  return {
    alreadyMarked: false,
    dateStr: markResult.dateStr,
    streak: newStreak,
    newlyAwarded,
    newBalance,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  formatDate,
  yesterdayDateStr,
  markTodayCompleted,
  computeAndUpdateStreak,
  awardMilestoneIfAny,
  onDailyMissionCompleted,
};

