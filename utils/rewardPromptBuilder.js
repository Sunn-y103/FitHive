/**
 * Reward Prompt Builder
 * 
 * This module generates prompts for OpenAI to create personalized daily rewards
 * based on user health metrics. The prompts are designed to ensure the AI returns
 * only valid JSON with no additional commentary.
 */

// ============================================================================
// PROMPT BUILDER FUNCTION
// ============================================================================

/**
 * Builds a JSON-only prompt for OpenAI to generate personalized daily rewards
 * 
 * @param {Object} metrics - User health metrics
 * @param {number|null} metrics.water - Water intake in liters
 * @param {number|null} metrics.burned - Burned calories
 * @param {number|null} metrics.nutrition - Nutrition calories consumed
 * @param {number|null} metrics.sleep - Sleep hours
 * @param {number} metrics.streak - Current streak count (days)
 * @param {string} metrics.dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted prompt string for OpenAI
 * 
 * @example
 * const prompt = buildRewardPrompt({
 *   water: 2.5,
 *   burned: 350,
 *   nutrition: 2200,
 *   sleep: 7.5,
 *   streak: 5,
 *   dateStr: '2024-01-15'
 * });
 */
export const buildRewardPrompt = ({ water, burned, nutrition, sleep, streak, dateStr }) => {
  // Format metrics for display (handle null values)
  const formatMetric = (value, unit) => {
    if (value === null || value === undefined) return 'Not recorded';
    return `${value} ${unit}`;
  };

  const waterDisplay = formatMetric(water, 'L');
  const burnedDisplay = formatMetric(burned, 'kcal');
  const nutritionDisplay = formatMetric(nutrition, 'kcal');
  const sleepDisplay = formatMetric(sleep, 'hours');

  // Build the prompt
  const prompt = `You are a fitness reward generator. Based on the user's daily health metrics, generate a personalized reward.

USER METRICS FOR ${dateStr}:
- Water Intake: ${waterDisplay}
- Burned Calories: ${burnedDisplay}
- Nutrition Calories: ${nutritionDisplay}
- Sleep Hours: ${sleepDisplay}
- Current Streak: ${streak} days

INSTRUCTIONS:
1. Analyze the user's metrics and create a personalized, motivational reward message.
2. Generate a short badge name that reflects their achievement.
3. Award FitCoins based on their performance (1-200 coins).
4. Return ONLY valid JSON with no explanations, no markdown, no code blocks, no additional text.

REQUIRED JSON STRUCTURE (return exactly this format):
{
  "message": "short motivational message",
  "badge": "short badge name",
  "coins": integer
}

RULES:
- "message": Must be a short, motivational string (max 100 characters). No newlines, no special formatting.
- "badge": Must be a short badge name (max 30 characters). Examples: "Hydration Hero", "Calorie Crusher", "Sleep Champion".
- "coins": Must be an integer between 1 and 200. Award more coins for better performance and completing all goals.
- Return ONLY the JSON object. No explanations before or after. No markdown code blocks. No additional commentary.

Return ONLY valid JSON. No extra text, no commentary.`;

  return prompt;
};

/**
 * Builds a simplified prompt for quick reward generation
 * (Alternative version with more concise instructions)
 * 
 * @param {Object} metrics - User health metrics (same as buildRewardPrompt)
 * @returns {string} Simplified prompt string
 */
export const buildRewardPromptSimple = ({ water, burned, nutrition, sleep, streak, dateStr }) => {
  const formatMetric = (value, unit) => {
    if (value === null || value === undefined) return 'Not recorded';
    return `${value} ${unit}`;
  };

  return `Generate a daily fitness reward for ${dateStr}.

Metrics:
- Water: ${formatMetric(water, 'L')}
- Burned: ${formatMetric(burned, 'kcal')}
- Nutrition: ${formatMetric(nutrition, 'kcal')}
- Sleep: ${formatMetric(sleep, 'hours')}
- Streak: ${streak} days

Return ONLY this JSON (no other text):
{
  "message": "short motivational message",
  "badge": "short badge name",
  "coins": integer
}

Rules: coins = 1-200 integer, message/badge = short strings, JSON only.`;
};

// ============================================================================
// VALIDATION HELPERS (Optional utilities)
// ============================================================================

/**
 * Validates the structure of a reward response from OpenAI
 * 
 * @param {Object} response - Response object to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const validateRewardResponse = (response) => {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // Check required fields
  if (typeof response.message !== 'string' || response.message.length === 0) {
    return false;
  }

  if (typeof response.badge !== 'string' || response.badge.length === 0) {
    return false;
  }

  if (typeof response.coins !== 'number' || !Number.isInteger(response.coins)) {
    return false;
  }

  // Check value constraints
  if (response.coins < 1 || response.coins > 200) {
    return false;
  }

  if (response.message.length > 100) {
    return false;
  }

  if (response.badge.length > 30) {
    return false;
  }

  return true;
};

/**
 * Parses and validates a JSON string response from OpenAI
 * 
 * @param {string} jsonString - JSON string to parse
 * @returns {Object|null} Parsed and validated reward object, or null if invalid
 */
export const parseRewardResponse = (jsonString) => {
  try {
    // Remove markdown code blocks if present
    let cleaned = jsonString.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    
    if (validateRewardResponse(parsed)) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing reward response:', error);
    return null;
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  buildRewardPrompt,
  buildRewardPromptSimple,
  validateRewardResponse,
  parseRewardResponse,
};

