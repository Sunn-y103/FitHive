import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  APP_STATE: '@fithive:app_state',
  USER_PROFILE: '@fithive:user_profile',
  USER_SETTINGS: '@fithive:user_settings',
  WATER_INTAKE: '@fithive:water_intake',
  SLEEP_DATA: '@fithive:sleep_data',
  PERIOD_CYCLE: '@fithive:period_cycle',
  HEALTH_DATA: '@fithive:health_data',
} as const;

// Storage helper functions
export const Storage = {
  /**
   * Save data to AsyncStorage
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving to AsyncStorage [${key}]:`, error);
      throw error;
    }
  },

  /**
   * Load data from AsyncStorage
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error loading from AsyncStorage [${key}]:`, error);
      return null;
    }
  },

  /**
   * Remove data from AsyncStorage
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from AsyncStorage [${key}]:`, error);
      throw error;
    }
  },

  /**
   * Clear all app data from AsyncStorage
   */
  async clearAll(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw error;
    }
  },

  /**
   * Clear user-specific data (keep app settings)
   */
  async clearUserData(): Promise<void> {
    try {
      const userKeys = [
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.WATER_INTAKE,
        STORAGE_KEYS.SLEEP_DATA,
        STORAGE_KEYS.PERIOD_CYCLE,
        STORAGE_KEYS.HEALTH_DATA,
      ];
      await AsyncStorage.multiRemove(userKeys);
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  },
};

