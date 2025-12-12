/**
 * Reward Error Handling and Prompts
 * 
 * This module provides robust error handling, retry logic, and fallback utilities
 * for the AI reward generation flow. It ensures the reward system is resilient
 * to network issues, API errors, and invalid responses.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Error information structure
 */
export interface ErrorInfo {
  code: 'NETWORK_ERROR' | 'API_ERROR' | 'PARSE_ERROR' | 'RATE_LIMIT' | 'UNKNOWN';
  message: string;
  transient: boolean; // If true, retrying might help
}

/**
 * Fallback reward structure
 */
export interface FallbackReward {
  message: string;
  badge: string;
  coins: number;
}

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

/**
 * Retries a function with exponential backoff
 * 
 * This is useful for network requests that might fail due to temporary issues.
 * Exponential backoff means we wait longer between each retry:
 * - 1st retry: 500ms delay
 * - 2nd retry: 1000ms delay
 * - 3rd retry: 2000ms delay
 * 
 * This prevents overwhelming the server and gives transient errors time to resolve.
 * 
 * @template T - Return type of the function
 * @param {() => Promise<T>} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<T>} Result of the function call
 * @throws {Error} Last error if all retries fail
 * 
 * @example
 * const result = await retryWithBackoff(
 *   () => callOpenAI(apiKey, prompt),
 *   2 // Retry up to 2 times
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: unknown;

  // Try the function, and retry on failure
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Call the function
      return await fn();
    } catch (error) {
      // Store the error
      lastError = error;

      // If this was the last attempt, don't wait - just throw
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay using exponential backoff
      // Attempt 0: 500ms, Attempt 1: 1000ms, Attempt 2: 2000ms
      const delayMs = 500 * Math.pow(2, attempt);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries failed - throw the last error
  throw lastError;
}

/**
 * Helper function to create a delay promise
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Normalizes and categorizes OpenAI API errors
 * 
 * This function takes any error and converts it into a structured format
 * that the UI can use to decide:
 * - Whether to show a retry button (if transient)
 * - What error message to display
 * - Whether to use fallback reward immediately
 * 
 * Error categories:
 * - NETWORK_ERROR: Connection issues (transient - retry might help)
 * - API_ERROR: API returned an error (may be transient or permanent)
 * - PARSE_ERROR: Response couldn't be parsed (usually permanent)
 * - RATE_LIMIT: Too many requests (transient - wait and retry)
 * - UNKNOWN: Unexpected error (unknown if transient)
 * 
 * @param {unknown} err - Error object (can be any type)
 * @returns {ErrorInfo} Normalized error information
 * 
 * @example
 * try {
 *   await callOpenAI(apiKey, prompt);
 * } catch (error) {
 *   const errorInfo = handleOpenAIError(error);
 *   if (errorInfo.transient) {
 *     // Show retry button
 *   } else {
 *     // Use fallback reward immediately
 *   }
 * }
 */
export function handleOpenAIError(err: unknown): ErrorInfo {
  // Handle network errors (TypeError from fetch)
  if (err instanceof TypeError) {
    // Common network errors: no internet, DNS failure, timeout
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed. Please check your internet connection.',
      transient: true, // Network issues are usually temporary
    };
  }

  // Handle Error objects with messages
  if (err instanceof Error) {
    const message = err.message.toLowerCase();

    // Check for quota/billing errors (non-transient - won't fix on retry)
    if (
      message.includes('quota') ||
      message.includes('billing') ||
      message.includes('exceeded') ||
      message.includes('insufficient_quota') ||
      message.includes('payment')
    ) {
      return {
        code: 'API_ERROR',
        message: 'OpenAI API quota exceeded. Please check your billing plan. Using fallback reward.',
        transient: false, // Quota errors won't fix on retry
      };
    }

    // Check for rate limit errors
    if (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    ) {
      return {
        code: 'RATE_LIMIT',
        message: 'Too many requests. Please wait a moment and try again.',
        transient: true, // Rate limits are temporary
      };
    }

    // Check for API errors (from OpenAI)
    if (message.includes('openai') || message.includes('api')) {
      // Check for authentication errors
      if (message.includes('401') || message.includes('unauthorized')) {
        return {
          code: 'API_ERROR',
          message: 'Invalid API key. Please check your configuration.',
          transient: false, // Auth errors won't fix themselves
        };
      }

      // Check for server errors
      if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return {
          code: 'API_ERROR',
          message: 'OpenAI service is temporarily unavailable. Please try again later.',
          transient: true, // Server errors are usually temporary
        };
      }

      // Generic API error
      return {
        code: 'API_ERROR',
        message: 'OpenAI API error. Please try again.',
        transient: true, // Most API errors are transient
      };
    }

    // Check for JSON parse errors
    if (
      message.includes('json') ||
      message.includes('parse') ||
      message.includes('syntax')
    ) {
      return {
        code: 'PARSE_ERROR',
        message: 'Failed to parse AI response. Using fallback reward.',
        transient: false, // Parse errors won't fix on retry
      };
    }
  }

  // Handle string errors
  if (typeof err === 'string') {
    return {
      code: 'UNKNOWN',
      message: err,
      transient: false,
    };
  }

  // Unknown error type
  return {
    code: 'UNKNOWN',
    message: 'An unexpected error occurred. Please try again.',
    transient: true, // Assume transient for unknown errors
  };
}

// ============================================================================
// FALLBACK REWARDS
// ============================================================================

/**
 * Returns a safe, deterministic fallback reward
 * 
 * This is used when:
 * - OpenAI API call fails
 * - AI response is invalid or can't be parsed
 * - Network is unavailable
 * 
 * The fallback ensures users always get a reward, maintaining engagement
 * even when the AI system is unavailable. The reward is deterministic
 * (always the same) so it's predictable and safe.
 * 
 * @returns {FallbackReward} Safe fallback reward object
 * 
 * @example
 * try {
 *   const reward = await generateReward();
 * } catch (error) {
 *   const fallback = getFallbackReward();
 *   // Use fallback reward
 * }
 */
export function getFallbackReward(): FallbackReward {
  return {
    message: 'Great work today! Keep going!',
    badge: 'Consistency Star',
    coins: 10,
  };
}

/**
 * Returns a fallback reward based on streak
 * 
 * Provides slightly better rewards for users with longer streaks,
 * even when AI is unavailable. This maintains motivation.
 * 
 * @param {number} streak - Current streak count
 * @returns {FallbackReward} Streak-based fallback reward
 */
export function getFallbackRewardByStreak(streak: number): FallbackReward {
  if (streak >= 30) {
    return {
      message: 'Incredible consistency! 30+ days strong!',
      badge: 'Streak Master',
      coins: 30,
    };
  } else if (streak >= 14) {
    return {
      message: 'Amazing dedication! Keep the streak alive!',
      badge: 'Streak Champion',
      coins: 20,
    };
  } else if (streak >= 7) {
    return {
      message: 'Great week! Your consistency is paying off!',
      badge: 'Week Warrior',
      coins: 15,
    };
  } else {
    return getFallbackReward();
  }
}

/**
 * Returns a fallback reward based on mission completion
 * 
 * Provides rewards based on how many missions were completed,
 * even when AI is unavailable.
 * 
 * @param {number} completedCount - Number of missions completed (0-4)
 * @returns {FallbackReward} Mission-based fallback reward
 */
export function getFallbackRewardByMissions(completedCount: number): FallbackReward {
  if (completedCount === 4) {
    return {
      message: 'Perfect day! All missions completed!',
      badge: 'Perfect Day',
      coins: 15,
    };
  } else if (completedCount === 3) {
    return {
      message: 'Almost there! Great progress today!',
      badge: 'Almost Perfect',
      coins: 12,
    };
  } else if (completedCount === 2) {
    return {
      message: 'Good effort! Keep pushing forward!',
      badge: 'Halfway Hero',
      coins: 8,
    };
  } else {
    return getFallbackReward();
  }
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

/**
 * Base prompt template for reward generation
 * 
 * This can be customized or extended for different reward types.
 */
export const REWARD_PROMPT_TEMPLATE = `You are a fitness reward generator. Based on the user's daily health metrics, generate a personalized reward.

USER METRICS:
- Water Intake: {water}
- Burned Calories: {burned}
- Nutrition Calories: {nutrition}
- Sleep Hours: {sleep}
- Current Streak: {streak} days

INSTRUCTIONS:
1. Analyze the user's metrics and create a personalized, motivational reward message.
2. Generate a short badge name that reflects their achievement.
3. Award FitCoins based on their performance (1-200 coins).
4. Return ONLY valid JSON with no explanations, no markdown, no code blocks.

REQUIRED JSON STRUCTURE:
{
  "message": "short motivational message",
  "badge": "short badge name",
  "coins": integer
}

RULES:
- "message": Short motivational string (max 100 characters). No newlines.
- "badge": Short badge name (max 30 characters).
- "coins": Integer between 1 and 200. Award more for better performance.
- Return ONLY the JSON object. No extra text, no commentary.`;

/**
 * Builds a prompt from template with actual values
 * 
 * @param {Record<string, string | number>} values - Values to substitute in template
 * @param {string} template - Template string (defaults to REWARD_PROMPT_TEMPLATE)
 * @returns {string} Formatted prompt
 */
export function buildPromptFromTemplate(
  values: Record<string, string | number>,
  template: string = REWARD_PROMPT_TEMPLATE
): string {
  let prompt = template;

  // Replace placeholders with actual values
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{${key}}`;
    prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return prompt;
}

// ============================================================================
// ERROR RECOVERY STRATEGIES
// ============================================================================

/**
 * Determines the best recovery strategy based on error type
 * 
 * @param {ErrorInfo} errorInfo - Normalized error information
 * @returns {'RETRY' | 'FALLBACK' | 'RETRY_THEN_FALLBACK'} Recovery strategy
 */
export function getRecoveryStrategy(errorInfo: ErrorInfo): 'RETRY' | 'FALLBACK' | 'RETRY_THEN_FALLBACK' {
  if (!errorInfo.transient) {
    // Non-transient errors won't fix on retry - use fallback immediately
    return 'FALLBACK';
  }

  if (errorInfo.code === 'RATE_LIMIT') {
    // Rate limits need longer wait - retry with longer backoff
    return 'RETRY_THEN_FALLBACK';
  }

  if (errorInfo.code === 'NETWORK_ERROR') {
    // Network errors might fix quickly - try retry first
    return 'RETRY_THEN_FALLBACK';
  }

  // Default: try retry, then fallback
  return 'RETRY_THEN_FALLBACK';
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  retryWithBackoff,
  handleOpenAIError,
  getFallbackReward,
  getFallbackRewardByStreak,
  getFallbackRewardByMissions,
  buildPromptFromTemplate,
  getRecoveryStrategy,
  REWARD_PROMPT_TEMPLATE,
};

