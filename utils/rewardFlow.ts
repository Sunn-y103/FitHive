/**
 * Reward Flow - Complete Frontend Reward Generation
 * 
 * This module implements the full reward generation flow:
 * 1. Idempotency check (avoid generating duplicate rewards for the same day)
 * 2. OpenAI API call to generate personalized reward
 * 3. Parse and validate AI response
 * 4. Save reward to AsyncStorage
 * 5. Update FitCoins balance
 * 
 * This is a frontend-only implementation that works entirely in React Native.
 */

// ============================================================================
// IMPORTS
// ============================================================================

import {
  todayKey,
  rewardStorageKey,
  fitcoinsKey,
  saveJSON,
  loadJSON,
  getUserKey,
} from './storageUtils';
import { buildRewardPrompt } from './rewardPromptBuilder';
import { callOpenAI } from './openaiClient';
import { parseRewardResponse } from './parseRewardResponse';
import { handleOpenAIError, getFallbackRewardByStreak } from './rewardErrorAndPrompts';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Health metrics summary for reward generation
 */
export interface HealthSummary {
  water: number | null;
  burned: number | null;
  nutrition: number | null;
  sleep: number | null;
  streak: number;
  canClaimReward?: boolean; // Optional: true when 3+ missions completed
}

/**
 * Reward object structure
 */
export interface Reward {
  date: string;
  message: string;
  badge: string;
  coins: number;
  generatedAt: string;
}

/**
 * Function parameters
 */
export interface CheckAndGenerateRewardParams {
  apiKey: string;
  summary: HealthSummary;
  userId?: string | null; // User ID for user-specific reward storage
}

/**
 * Function return type
 */
export interface RewardResult {
  fromCache: boolean;
  reward: Reward;
  newBalance?: number;
  blocked?: boolean; // True if reward was blocked (e.g., missions incomplete)
  reason?: string; // Reason for blocking
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Fallback reward used when OpenAI fails or returns invalid response
 * This ensures the user always gets a reward, even if AI generation fails
 */
const FALLBACK_REWARD = {
  message: 'Great work today! Keep going!',
  badge: 'Consistency Star',
  coins: 10,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets the current FitCoins balance from storage (user-specific)
 * 
 * @param {string | null | undefined} userId - User ID for user-scoped storage
 * @returns {Promise<number>} Current balance (defaults to 0 if not found)
 */
async function getFitCoinsBalance(userId: string | null | undefined): Promise<number> {
  try {
    if (!userId) {
      // No user - return 0
      return 0;
    }
    
    // Use user-specific key
    const userKey = getUserKey(fitcoinsKey, userId);
    const balance = await loadJSON(userKey);
    
    if (typeof balance === 'number' && balance >= 0) {
      return balance;
    }
    // If balance is invalid or missing, default to 0 (new user starts at 0)
    return 0;
  } catch (error) {
    console.error('Error loading FitCoins balance:', error);
    return 0;
  }
}

/**
 * Updates the FitCoins balance by adding coins (user-specific)
 * 
 * @param {number} coinsToAdd - Coins to add to balance
 * @param {string | null | undefined} userId - User ID for user-scoped storage
 * @returns {Promise<number>} New balance after update
 */
async function updateFitCoinsBalance(coinsToAdd: number, userId: string | null | undefined): Promise<number> {
  try {
    if (!userId) {
      console.error('Cannot update FitCoins balance: no userId provided');
      return 0;
    }
    
    // Get current balance (user-specific)
    const currentBalance = await getFitCoinsBalance(userId);
    const newBalance = currentBalance + coinsToAdd;
    
    // Save updated balance using user-specific key
    const userKey = getUserKey(fitcoinsKey, userId);
    const saved = await saveJSON(userKey, newBalance);
    
    if (!saved) {
      console.error('Failed to save FitCoins balance');
      return currentBalance; // Return old balance if save failed
    }
    
    return newBalance;
  } catch (error) {
    console.error('Error updating FitCoins balance:', error);
    return await getFitCoinsBalance(userId); // Return current balance on error
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Checks if a reward exists for today, and if not, generates a new one
 * 
 * This function implements idempotency to ensure:
 * - Users don't get duplicate rewards for the same day
 * - Rewards are cached and reused if the function is called multiple times
 * - The UI always gets a valid reward object, even if AI generation fails
 * 
 * @param {CheckAndGenerateRewardParams} params - API key and health summary
 * @returns {Promise<RewardResult>} Reward result with cache status and new balance
 * 
 * @example
 * const result = await checkAndGenerateReward({
 *   apiKey: 'sk-...',
 *   summary: {
 *     water: 2.5,
 *     burned: 350,
 *     nutrition: 2200,
 *     sleep: 7.5,
 *     streak: 5
 *   }
 * });
 * 
 * if (result.fromCache) {
 *   console.log('Reward from cache:', result.reward);
 * } else {
 *   console.log('New reward generated:', result.reward);
 *   console.log('New balance:', result.newBalance);
 * }
 */
export async function checkAndGenerateReward(
  params: CheckAndGenerateRewardParams
): Promise<RewardResult> {
  const { apiKey, summary, userId } = params;

  // ========================================================================
  // STEP 0: MISSION COMPLETION CHECK
  // ========================================================================
  // Reward is only available when user completes 3+ daily missions
  // This prevents users from claiming rewards without completing missions
  if (summary.canClaimReward === false) {
    return {
      fromCache: false,
      reward: {
        date: todayKey(),
        message: 'Complete at least 3 daily missions to unlock rewards',
        badge: 'Locked',
        coins: 0,
        generatedAt: new Date().toISOString(),
      },
      blocked: true,
      reason: 'Daily missions incomplete. Complete at least 3 out of 4 missions to unlock rewards.',
    };
  }

  // ========================================================================
  // STEP 1: IDEMPOTENCY CHECK
  // ========================================================================
  // Why idempotency?
  // - Prevents users from getting duplicate rewards if they tap the button multiple times
  // - Ensures one reward per day, stored using date-based keys
  // - Improves performance by avoiding unnecessary API calls
  
  const dateStr = todayKey(); // Get today's date in YYYY-MM-DD format
  const baseRewardKey = rewardStorageKey(dateStr); // Build base storage key: "reward_YYYY-MM-DD"
  const rewardKey = getUserKey(baseRewardKey, userId); // Make it user-specific: "reward_YYYY-MM-DD_<userId>"

  // Check if reward already exists for today (user-specific)
  const existingReward = await loadJSON(rewardKey);
  
  // Also check if userId is required
  if (!userId) {
    return {
      fromCache: false,
      reward: {
        date: dateStr,
        message: 'User authentication required to claim rewards',
        badge: 'Locked',
        coins: 0,
        generatedAt: new Date().toISOString(),
      },
      blocked: true,
      reason: 'User must be authenticated to claim rewards.',
    };
  }
  
  if (existingReward && typeof existingReward === 'object') {
    // Reward already exists - return cached version
    // This is idempotent: calling the function multiple times returns the same result
    return {
      fromCache: true,
      reward: existingReward as Reward,
      // Note: newBalance is not included for cached rewards
    };
  }

  // ========================================================================
  // STEP 2: BUILD PROMPT & CALL OPENAI
  // ========================================================================
  // Generate a personalized reward based on user's health metrics
  // The prompt instructs OpenAI to return JSON only
  
  let parsedReward = null;
  let errorInfo = null;
  
  try {
    // Build the prompt with user's health metrics
    const prompt = buildRewardPrompt({
      water: summary.water,
      burned: summary.burned,
      nutrition: summary.nutrition,
      sleep: summary.sleep,
      streak: summary.streak,
      dateStr,
    });

    // Call OpenAI API to generate reward
    const aiResponse = await callOpenAI(apiKey, prompt);

    // ========================================================================
    // STEP 3: PARSE AND VALIDATE
    // ========================================================================
    // Why validate?
    // - AI responses can be noisy (code fences, extra text, malformed JSON)
    // - We need to ensure the response matches our expected structure
    // - parseRewardResponse handles all edge cases safely
    
    if (aiResponse) {
      parsedReward = parseRewardResponse(aiResponse);
    }
  } catch (error) {
    // OpenAI call failed - normalize error and log with context
    errorInfo = handleOpenAIError(error);
    
    // Log error with normalized information
    console.warn('OpenAI API call failed:', {
      code: errorInfo.code,
      message: errorInfo.message,
      transient: errorInfo.transient,
      originalError: error instanceof Error ? error.message : String(error),
    });
    
    // For quota/billing errors, log a more specific message
    if (errorInfo.code === 'API_ERROR' && errorInfo.message.includes('quota')) {
      console.warn('⚠️ OpenAI quota exceeded. Using fallback reward. User will still receive a reward.');
    }
  }

  // Use parsed reward if valid, otherwise use intelligent fallback
  // Fallback ensures users always get a reward, even if AI generation fails
  // Use streak-based fallback for better user experience
  const rewardData = parsedReward || getFallbackRewardByStreak(summary.streak || 0);

  // ========================================================================
  // STEP 4: SAVE REWARD
  // ========================================================================
  // Why save rewards?
  // - Enables idempotency (check if reward exists before generating)
  // - Allows users to view their reward history
  // - Stores rewards using date keys for easy lookup
  
  const reward: Reward = {
    date: dateStr, // Today's date (YYYY-MM-DD)
    message: rewardData.message,
    badge: rewardData.badge,
    coins: rewardData.coins,
    generatedAt: new Date().toISOString(), // Timestamp when reward was generated
  };

  // Save reward to AsyncStorage (user-specific)
  // This makes it available for future idempotency checks
  await saveJSON(rewardKey, reward);
  
  // Also add to user's reward history (user-specific)
  const rewardHistoryKey = getUserKey('reward_history', userId);
  const existingHistory = await loadJSON(rewardHistoryKey);
  const historyArray = Array.isArray(existingHistory) ? existingHistory : [];
  const updatedHistory = [reward, ...historyArray].slice(0, 100); // Keep last 100 rewards
  await saveJSON(rewardHistoryKey, updatedHistory);

  // ========================================================================
  // STEP 5: UPDATE FITCOINS BALANCE
  // ========================================================================
  // Add reward coins to user's FitCoins balance (user-specific)
  // Only update balance for newly generated rewards (not cached ones)
  
  const newBalance = await updateFitCoinsBalance(reward.coins, userId);

  // ========================================================================
  // STEP 6: RETURN RESULT
  // ========================================================================
  // Return reward with metadata:
  // - fromCache: false (this is a new reward)
  // - reward: the complete reward object
  // - newBalance: updated FitCoins balance (only for new rewards)
  
  return {
    fromCache: false,
    reward,
    newBalance,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  checkAndGenerateReward,
};

