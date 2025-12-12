/**
 * User-Specific Storage Utilities
 * 
 * This module provides helper functions to create user-specific storage keys.
 * All health data must be stored with user-specific keys to prevent data
 * leakage between different users.
 * 
 * Usage:
 *   const userKey = getUserKey('water_intake_entries', userId);
 *   // Returns: 'water_intake_entries_<userId>'
 */

/**
 * Generates a user-specific storage key
 * 
 * @param {string} baseKey - Base storage key (e.g., 'water_intake_entries')
 * @param {string | null | undefined} userId - User ID from auth
 * @returns {string} User-specific key (e.g., 'water_intake_entries_abc123')
 * 
 * If userId is null/undefined, returns the base key (for backward compatibility
 * or when user is not logged in)
 */
export function getUserKey(baseKey: string, userId: string | null | undefined): string {
  if (!userId) {
    // If no user ID, return base key (for backward compatibility)
    // In production, you might want to throw an error instead
    return baseKey;
  }
  return `${baseKey}_${userId}`;
}

/**
 * Gets all user-specific keys for a given base key pattern
 * 
 * @param {string} baseKey - Base key pattern (e.g., 'water_intake_entries')
 * @param {string} userId - User ID
 * @returns {string[]} Array of user-specific keys
 */
export function getUserKeys(baseKey: string, userId: string): string[] {
  return [getUserKey(baseKey, userId)];
}

/**
 * Clears all user-specific data for a given user
 * 
 * @param {string} userId - User ID
 * @param {string[]} baseKeys - Array of base keys to clear
 * @returns {Promise<void>}
 */
export async function clearUserData(
  userId: string,
  baseKeys: string[]
): Promise<void> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const userKeys = baseKeys.map(key => getUserKey(key, userId));
  await AsyncStorage.multiRemove(userKeys);
}

