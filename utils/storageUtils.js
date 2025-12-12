import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage Utility Functions
 * 
 * This module provides helper functions for:
 * - Date key generation (YYYY-MM-DD format)
 * - Reward storage key generation
 * - Safe JSON save/load operations with AsyncStorage
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Storage key for FitCoins balance
 * @constant {string}
 */
export const fitcoinsKey = 'fitcoins_balance';

/**
 * Storage key for milestones awarded
 * @constant {string}
 */
export const milestonesKey = 'milestones_awarded';

// ============================================================================
// DATE KEY FUNCTIONS
// ============================================================================

/**
 * Generates a date key in YYYY-MM-DD format
 * 
 * @param {Date} date - Optional date object (defaults to today)
 * @returns {string} Date string in format "YYYY-MM-DD"
 * 
 * @example
 * todayKey() // Returns "2024-01-15" (today's date)
 * todayKey(new Date('2024-12-25')) // Returns "2024-12-25"
 */
export const todayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generates a reward storage key using today's date
 * 
 * @param {string} dateString - Optional date string in YYYY-MM-DD format (defaults to today)
 * @returns {string} Storage key in format "reward_YYYY-MM-DD"
 * 
 * @example
 * rewardStorageKey() // Returns "reward_2024-01-15" (today's date)
 * rewardStorageKey('2024-12-25') // Returns "reward_2024-12-25"
 */
export const rewardStorageKey = (dateString = null) => {
  const date = dateString || todayKey();
  return `reward_${date}`;
};

// ============================================================================
// USER-SPECIFIC KEY HELPERS
// ============================================================================

/**
 * Creates a user-scoped storage key
 * 
 * Appends the user ID to the base key to ensure each user has isolated storage.
 * This prevents data leakage between different user accounts.
 * 
 * PER-USER ISOLATION:
 * - Each authenticated user gets their own storage keys
 * - Example: fitcoins_balance_user-123 vs fitcoins_balance_user-456
 * - New users start with default values (0 for balance, [] for arrays)
 * - When a user logs out, their UI state is cleared, but storage persists
 * - When a new user logs in, they load only their own data
 * 
 * @param {string} baseKey - Base storage key (e.g., 'fitcoins_balance')
 * @param {string | null | undefined} userId - User ID from authentication
 * @returns {string} User-scoped key (e.g., 'fitcoins_balance_user-123')
 * 
 * @example
 * getUserKey('fitcoins_balance', 'user-123') // Returns 'fitcoins_balance_user-123'
 * getUserKey('reward_history', 'abc-456') // Returns 'reward_history_abc-456'
 * getUserKey('fitcoins_balance', null) // Returns 'fitcoins_balance' (no user)
 */
export const getUserKey = (baseKey, userId) => {
  if (!userId || userId === null || userId === undefined || userId === '') {
    // If no userId provided, return base key (for backward compatibility)
    return baseKey;
  }
  return `${baseKey}_${userId}`;
};

// ============================================================================
// ASYNCSTORAGE JSON HELPERS
// ============================================================================

/**
 * Saves a JavaScript object to AsyncStorage as JSON
 * 
 * Safely serializes the object to JSON and stores it with the given key.
 * All errors are caught and logged, but not re-thrown to prevent app crashes.
 * 
 * @param {string} key - Storage key
 * @param {Object} obj - JavaScript object to save
 * @returns {Promise<boolean>} Returns true if save was successful, false otherwise
 * 
 * @example
 * await saveJSON('user_preferences', { theme: 'dark', notifications: true });
 */
export const saveJSON = async (key, obj) => {
  try {
    if (key === null || key === undefined || key === '') {
      console.error('saveJSON: Invalid key provided');
      return false;
    }

    const jsonString = JSON.stringify(obj);
    await AsyncStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error(`Error saving JSON to AsyncStorage [${key}]:`, error);
    return false;
  }
};

/**
 * Loads a JSON object from AsyncStorage
 * 
 * Safely retrieves and parses JSON data from AsyncStorage.
 * Returns null if the key doesn't exist, the data is invalid JSON, or an error occurs.
 * 
 * @param {string} key - Storage key
 * @returns {Promise<Object|null>} Parsed JSON object, or null if missing/invalid
 * 
 * @example
 * const userPrefs = await loadJSON('user_preferences');
 * if (userPrefs) {
 *   console.log(userPrefs.theme); // "dark"
 * }
 */
export const loadJSON = async (key) => {
  try {
    if (key === null || key === undefined || key === '') {
      console.error('loadJSON: Invalid key provided');
      return null;
    }

    const jsonString = await AsyncStorage.getItem(key);
    
    if (jsonString === null) {
      // Key doesn't exist - this is normal, not an error
      return null;
    }

    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    // Handle JSON parse errors or AsyncStorage errors
    console.error(`Error loading JSON from AsyncStorage [${key}]:`, error);
    return null;
  }
};

/**
 * Removes a key from AsyncStorage
 * 
 * @param {string} key - Storage key to remove
 * @returns {Promise<boolean>} Returns true if removal was successful, false otherwise
 * 
 * @example
 * await removeJSON('user_preferences');
 */
export const removeJSON = async (key) => {
  try {
    if (key === null || key === undefined || key === '') {
      console.error('removeJSON: Invalid key provided');
      return false;
    }

    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing key from AsyncStorage [${key}]:`, error);
    return false;
  }
};

// ============================================================================
// DEFAULT EXPORT (for convenience)
// ============================================================================

export default {
  todayKey,
  rewardStorageKey,
  saveJSON,
  loadJSON,
  removeJSON,
  fitcoinsKey,
  milestonesKey,
};

