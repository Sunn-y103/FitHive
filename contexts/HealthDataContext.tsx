import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * HealthDataContext - Shared state for health metrics across the app
 * 
 * This context provides a single source of truth for health data values
 * that can be consumed by HomeScreen and updated by AllHealthDataScreen
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
  const [waterValue, setWaterValue] = useState<number | null>(null);
  const [burnedValue, setBurnedValue] = useState<number | null>(null);
  const [nutritionValue, setNutritionValue] = useState<number | null>(null);
  const [sleepValue, setSleepValue] = useState<number | null>(null);

  const updateWaterValue = useCallback((value: number | null) => {
    setWaterValue(value);
  }, []);

  const updateBurnedValue = useCallback((value: number | null) => {
    setBurnedValue(value);
  }, []);

  const updateNutritionValue = useCallback((value: number | null) => {
    setNutritionValue(value);
  }, []);

  const updateSleepValue = useCallback((value: number | null) => {
    setSleepValue(value);
  }, []);

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

