/**
 * Parse Reward Response Utility
 * 
 * This module safely parses and validates AI-generated reward responses from OpenAI.
 * The AI is instructed to return JSON only, but responses can still include:
 * - Markdown code fences (```json ... ```)
 * - Extra whitespace or newlines
 * - Malformed JSON
 * - Invalid values
 * 
 * This function handles all these edge cases defensively.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Validated reward response structure
 */
export interface RewardResponse {
  message: string;
  badge: string;
  coins: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Simple profanity blocklist
 * In production, consider using a more comprehensive library or service
 */
const PROFANITY_BLOCKLIST = ['badword1', 'badword2', 'example'];

/**
 * Safe fallback message when profanity is detected
 */
const SAFE_FALLBACK_MESSAGE = 'Great job! Keep going!';

/**
 * Safe fallback badge when profanity is detected
 */
const SAFE_FALLBACK_BADGE = 'Achiever';

/**
 * Minimum coins value
 */
const MIN_COINS = 1;

/**
 * Maximum coins value (clamped to prevent abuse)
 */
const MAX_COINS = 500;

/**
 * Maximum message length
 */
const MAX_MESSAGE_LENGTH = 250;

/**
 * Maximum badge length
 */
const MAX_BADGE_LENGTH = 80;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Removes markdown code fences from a string
 * Handles both ```json and ``` formats
 * 
 * @param {string} text - Text that may contain code fences
 * @returns {string} Text with code fences removed
 */
function removeCodeFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ```
  return text
    .replace(/^```json\s*/i, '') // Remove opening ```json
    .replace(/^```\s*/g, '') // Remove opening ```
    .replace(/\s*```$/g, '') // Remove closing ```
    .trim();
}

/**
 * Extracts the first JSON object from a string
 * Uses regex to find { ... } blocks, handling nested braces
 * 
 * @param {string} text - Text that may contain JSON
 * @returns {string | null} Extracted JSON string or null if not found
 */
function extractJSON(text: string): string | null {
  // Remove code fences first
  let cleaned = removeCodeFences(text).trim();

  // Try to find the first { ... } block
  // This regex matches opening brace, then captures everything until matching closing brace
  // We use a simple approach: find first { and last } in the string
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    // Extract the JSON block
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  // If no braces found, return the entire string (might be JSON without braces)
  return cleaned || null;
}

/**
 * Sanitizes a string by removing control characters and normalizing whitespace
 * 
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces into one
    .trim();
}

/**
 * Checks if a string contains profanity
 * 
 * @param {string} text - Text to check
 * @returns {boolean} True if profanity detected
 */
function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return PROFANITY_BLOCKLIST.some((word) => lowerText.includes(word));
}

/**
 * Safely converts a value to an integer
 * 
 * @param {unknown} value - Value to convert
 * @returns {number | null} Integer value or null if invalid
 */
function safeParseInt(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * Clamps a number between min and max values
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

/**
 * Safely parses and validates an AI-generated reward response
 * 
 * This function handles:
 * - Markdown code fences (```json ... ```)
 * - Extra whitespace and newlines
 * - Malformed JSON
 * - Invalid values
 * - Profanity detection and sanitization
 * 
 * @param {string | null} text - Raw response text from OpenAI
 * @returns {RewardResponse | null} Parsed and validated reward, or null on failure
 * 
 * @example
 * const reward = parseRewardResponse('{"message": "Great job!", "badge": "Champion", "coins": 50}');
 * // Returns: { message: "Great job!", badge: "Champion", coins: 50 }
 */
export function parseRewardResponse(
  text: string | null
): RewardResponse | null {
  // Step 1: Handle null/undefined/empty input
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return null;
  }

  // Step 2: Extract JSON from the response
  // The AI might return JSON wrapped in code fences or with extra text
  const jsonString = extractJSON(text);
  if (!jsonString) {
    return null;
  }

  // Step 3: Parse JSON safely
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    // JSON parsing failed - return null
    return null;
  }

  // Step 4: Validate that parsed result is an object
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  // Step 5: Extract and validate 'message'
  let message: string | null = null;
  if (typeof obj.message === 'string' && obj.message.trim() !== '') {
    message = sanitizeString(obj.message);
    // Limit length
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.substring(0, MAX_MESSAGE_LENGTH).trim();
    }
    // Check for profanity and replace if found
    if (containsProfanity(message)) {
      message = SAFE_FALLBACK_MESSAGE;
    }
  }

  if (!message) {
    return null;
  }

  // Step 6: Extract and validate 'badge'
  let badge: string | null = null;
  if (typeof obj.badge === 'string' && obj.badge.trim() !== '') {
    badge = sanitizeString(obj.badge);
    // Limit length
    if (badge.length > MAX_BADGE_LENGTH) {
      badge = badge.substring(0, MAX_BADGE_LENGTH).trim();
    }
    // Check for profanity and replace if found
    if (containsProfanity(badge)) {
      badge = SAFE_FALLBACK_BADGE;
    }
  }

  if (!badge) {
    return null;
  }

  // Step 7: Extract and validate 'coins'
  const coinsValue = safeParseInt(obj.coins);
  if (coinsValue === null || coinsValue <= 0) {
    return null;
  }

  // Clamp coins to valid range (1-500)
  // This prevents abuse if the AI returns suspiciously large values
  const coins = clamp(coinsValue, MIN_COINS, MAX_COINS);

  // Step 8: Return validated reward response
  return {
    message,
    badge,
    coins,
  };
}

// ============================================================================
// EXAMPLE USAGES (for testing/reference)
// ============================================================================

/*
// Example 1: Well-formed JSON response
const example1 = parseRewardResponse(
  '{"message": "Great job today! You crushed your goals!", "badge": "Champion", "coins": 50}'
);
// Expected: { message: "Great job today! You crushed your goals!", badge: "Champion", coins: 50 }

// Example 2: JSON inside triple-backtick code fence
const example2 = parseRewardResponse(
  '```json\n{"message": "Keep it up!", "badge": "Warrior", "coins": 75}\n```'
);
// Expected: { message: "Keep it up!", badge: "Warrior", coins: 75 }

// Example 3: Malformed response or invalid values
const example3a = parseRewardResponse('Invalid JSON text');
// Expected: null

const example3b = parseRewardResponse('{"message": "", "badge": "Test", "coins": 0}');
// Expected: null (empty message and coins <= 0)

const example3c = parseRewardResponse('{"message": "Good job", "badge": "Hero", "coins": 1000}');
// Expected: { message: "Good job", badge: "Hero", coins: 500 } (clamped to max)

const example3d = parseRewardResponse('{"message": "badword1 test", "badge": "Champ", "coins": 25}');
// Expected: { message: "Great job! Keep going!", badge: "Champ", coins: 25 } (profanity sanitized)
*/

