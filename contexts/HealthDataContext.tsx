import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserKey } from '../utils/userStorageUtils';

/**
 * HealthDataContext - Shared state for health metrics across the app
 * 
 * This context provides a single source of truth for health data values
 * that can be consumed by HomeScreen and updated by AllHealthDataScreen
 * 
 * IMPORTANT: All data is user-specific. When user changes, context reloads
 * their personal data from AsyncStorage using user-specific keys.
 */

interface HealthDataContextType {
  // Current values (null when no data available)
  waterValue: number | null;
  burnedValue: number | null;
  nutritionValue: number | null;
  sleepValue: number | null;
  
  // Update functions
  setWaterValue: (value: number | null) => void;
  setBurnedValue: (value: number | null) => void;
  setNutritionValue: (value: number | null) => void;
  setSleepValue: (value: number | null) => void;
}

const HealthDataContext = createContext<HealthDataContextType | undefined>(undefined);

interface HealthDataProviderProps {
  children: ReactNode;
}

export const HealthDataProvider: React.FC<HealthDataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [waterValue, setWaterValueState] = useState<number | null>(null);
  const [burnedValue, setBurnedValueState] = useState<number | null>(null);
  const [nutritionValue, setNutritionValueState] = useState<number | null>(null);
  const [sleepValue, setSleepValueState] = useState<number | null>(null);

  /**
   * Load user-specific health data from AsyncStorage
   * Called when user logs in or user changes
   */
  const loadUserHealthData = useCallback(async (userId: string | null) => {
    if (!userId) {
      // User logged out - clear all values
      setWaterValueState(null);
      setBurnedValueState(null);
      setNutritionValueState(null);
      setSleepValueState(null);
      return;
    }

    try {
      // Load user-specific values from AsyncStorage
      // These are stored by AllHealthDataScreen when it calculates averages
      const waterKey = getUserKey('health_waterValue', userId);
      const burnedKey = getUserKey('health_burnedValue', userId);
      const nutritionKey = getUserKey('health_nutritionValue', userId);
      const sleepKey = getUserKey('health_sleepValue', userId);

      const [water, burned, nutrition, sleep] = await Promise.all([
        AsyncStorage.getItem(waterKey),
        AsyncStorage.getItem(burnedKey),
        AsyncStorage.getItem(nutritionKey),
        AsyncStorage.getItem(sleepKey),
      ]);

      // Parse and set values
      setWaterValueState(water ? parseFloat(water) : null);
      setBurnedValueState(burned ? parseFloat(burned) : null);
      setNutritionValueState(nutrition ? parseFloat(nutrition) : null);
      setSleepValueState(sleep ? parseFloat(sleep) : null);
    } catch (error) {
      console.error('Error loading user health data:', error);
      // On error, set to null (no data available)
      setWaterValueState(null);
      setBurnedValueState(null);
      setNutritionValueState(null);
      setSleepValueState(null);
    }
  }, []);

  /**
   * Reload data when user changes
   * This ensures each user sees only their own data
   */
  useEffect(() => {
    loadUserHealthData(user?.id || null);
  }, [user?.id, loadUserHealthData]);

  /**
   * Save value to user-specific AsyncStorage key
   */
  const updateWaterValue = useCallback(async (value: number | null) => {
    setWaterValueState(value);
    if (user?.id) {
      try {
        const key = getUserKey('health_waterValue', user.id);
        await AsyncStorage.setItem(key, value !== null ? String(value) : '');
      } catch (error) {
        console.error('Error saving water value:', error);
      }
    }
  }, [user?.id]);

  const updateBurnedValue = useCallback(async (value: number | null) => {
    setBurnedValueState(value);
    if (user?.id) {
      try {
        const key = getUserKey('health_burnedValue', user.id);
        await AsyncStorage.setItem(key, value !== null ? String(value) : '');
      } catch (error) {
        console.error('Error saving burned value:', error);
      }
    }
  }, [user?.id]);

  const updateNutritionValue = useCallback(async (value: number | null) => {
    setNutritionValueState(value);
    if (user?.id) {
      try {
        const key = getUserKey('health_nutritionValue', user.id);
        await AsyncStorage.setItem(key, value !== null ? String(value) : '');
      } catch (error) {
        console.error('Error saving nutrition value:', error);
      }
    }
  }, [user?.id]);

  const updateSleepValue = useCallback(async (value: number | null) => {
    setSleepValueState(value);
    if (user?.id) {
      try {
        const key = getUserKey('health_sleepValue', user.id);
        await AsyncStorage.setItem(key, value !== null ? String(value) : '');
      } catch (error) {
        console.error('Error saving sleep value:', error);
      }
    }
  }, [user?.id]);

  const value: HealthDataContextType = {
    waterValue,
    burnedValue,
    nutritionValue,
    sleepValue,
    setWaterValue: updateWaterValue,
    setBurnedValue: updateBurnedValue,
    setNutritionValue: updateNutritionValue,
    setSleepValue: updateSleepValue,
  };

  return (
    <HealthDataContext.Provider value={value}>
      {children}
    </HealthDataContext.Provider>
  );
};

/**
 * Hook to use health data context
 * @throws Error if used outside HealthDataProvider
 */
export const useHealthData = (): HealthDataContextType => {
  const context = useContext(HealthDataContext);
  if (!context) {
    throw new Error('useHealthData must be used within a HealthDataProvider');
  }
  return context;
};

