/**
 * AllHealthDataScreen - Displays health metrics with rolling 24-hour averages
 * 
 * USAGE:
 * - Pass entries via props: <AllHealthDataScreen entries={entriesArray} />
 * - Pass calorieEntries via props: <AllHealthDataScreen calorieEntries={calorieEntriesArray} />
 * - Or use React Context to provide entries (see example below)
 * 
 * SAMPLE ENTRIES ARRAY:
 * const sampleEntries = [
 *   { id: '1', type: 'bmi', value: 22.5, timestamp: new Date().toISOString() },
 *   { id: '2', type: 'water', value: 2.5, timestamp: new Date(Date.now() - 3600000).toISOString() },
 *   { id: '3', type: 'sleep', value: 7.5, timestamp: new Date(Date.now() - 7200000).toISOString() },
 *   { id: '4', type: 'nutrition', value: 1800, timestamp: new Date(Date.now() - 10800000).toISOString() },
 * ];
 * 
 * SAMPLE CALORIE ENTRIES ARRAY:
 * const sampleCalorieEntries = [
 *   { id: '1', type: 'treadmill', calories: 320, timestamp: new Date().toISOString() },
 *   { id: '2', type: 'cycling', calories: 450, timestamp: new Date(Date.now() - 3600000).toISOString() },
 *   { id: '3', type: 'burn', calories: 180, timestamp: new Date(Date.now() - 7200000).toISOString() },
 * ];
 * 
 * WINDOW MODE:
 * - Set windowMode to 'day' for current day (midnight to now) - DEFAULT
 * - Set windowMode to 'rolling24' for rolling 24-hour window (now - 24h to now)
 * 
 * TESTING:
 * - Add sample entries above to test locally
 * - Averages update automatically every 60 seconds
 * - Only entries from the selected window are included in calculations
 */

// ============================================================================
// CONFIGURATION: Change windowMode here to switch between 'day' and 'rolling24'
// ============================================================================
const WINDOW_MODE: 'day' | 'rolling24' = 'day'; // 'day' = midnight to now, 'rolling24' = last 24 hours

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { fetchWorkoutHistory } from '../lib/supabase/saveWorkoutResult';
import WorkoutSelectionModal from '../components/WorkoutSelectionModal';
import { ExerciseType } from '../hooks/useExercisePose';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProfile } from '../services/profileService';
import { useAppState } from '../contexts/AppStateContext';
import { STORAGE_KEYS } from '../utils/storage';

// Health entry data structure
export interface HealthEntry {
  id: string;
  type: 'bmi' | 'water' | 'sleep' | 'nutrition';
  value: number;
  timestamp: string | number; // ISO string or Unix timestamp (milliseconds)
}

// Calorie entry data structure for burned calories
export interface CalorieEntry {
  id: string;
  type: 'treadmill' | 'cycling' | 'burn' | 'other';
  calories: number;
  timestamp: string | number; // ISO string or Unix timestamp (milliseconds)
}

// Interfaces for data loaded from storage
interface WaterEntry {
  id: string;
  liters: number;
  timestamp: string; // ISO string
}

interface SleepSession {
  id: string;
  start: number; // timestamp
  end: number; // timestamp
  durationMs: number;
}

// Props interface - entries can be passed via props or Context
interface AllHealthDataScreenProps {
  entries?: HealthEntry[]; // Optional: if not provided, will use empty array
  calorieEntries?: CalorieEntry[]; // Optional: calorie entries for burned calories calculation
}

interface HealthDataItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor?: string;
  title: string;
  value: string;
  unit: string;
  subtitle?: string; // Optional subtitle (e.g., "based on 3 entries")
  onPress?: () => void;
  isWorkout?: boolean;
  workoutInfo?: { exercise: string; date: string } | null;
}

const HealthDataItem: React.FC<HealthDataItemProps> = ({
  icon,
  iconBackgroundColor,
  iconColor = '#FFFFFF',
  title,
  value,
  unit,
  subtitle,
  onPress,
  isWorkout = false,
  workoutInfo,
}) => {
  return (
    <TouchableOpacity style={styles.healthDataItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.healthDataContent}>
        <Text style={styles.healthDataTitle}>{title}</Text>
        {isWorkout && workoutInfo ? (
          <View>
            <View style={styles.valueRow}>
              <Text style={styles.healthDataValue}>{value}</Text>
              <Text style={styles.healthDataUnit}> {unit}</Text>
            </View>
            <Text style={styles.workoutInfo}>{workoutInfo.exercise} • {workoutInfo.date}</Text>
          </View>
        ) : (
          <View>
            <View style={styles.valueRow}>
              <Text style={styles.healthDataValue}>{value}</Text>
              <Text style={styles.healthDataUnit}> {unit}</Text>
            </View>
            {subtitle && (
              <Text style={styles.subtitle}>{subtitle}</Text>
            )}
          </View>
        )}
      </View>
      {isWorkout ? (
        <View style={styles.startWorkoutButton}>
          <Ionicons name="play-circle" size={24} color="#E74C3C" />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
      )}
    </TouchableOpacity>
  );
};

type RootStackParamList = {
  WaterIntake: undefined;
  Sleep: undefined;
  PeriodCycle: undefined;
  WorkoutCamera: { exerciseType: ExerciseType };
  Nutrition: undefined;
  BMI: undefined;
  BurnedCalories: undefined;
};

type AllHealthDataScreenNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Helper function to calculate average calories burned in a time window
 * 
 * @param entries - Array of calorie entries
 * @param mode - Window mode: 'day' (midnight to now) or 'rolling24' (last 24 hours)
 * @returns Object with average (number | null) and count (number of entries used)
 * 
 * TIMEZONE CONSIDERATIONS:
 * - Uses device's local timezone for date calculations
 * - Date.now() and Date.getTime() use local time
 * - For 'day' mode: calculates from midnight (00:00:00) of current day in local time
 * - For 'rolling24' mode: calculates from (now - 24 hours) to now
 */
const averageCaloriesInWindow = (
  entries: CalorieEntry[],
  mode: 'day' | 'rolling24' = WINDOW_MODE
): { average: number | null; count: number } => {
  const now = Date.now();
  
  // Calculate window start based on mode
  let windowStart: number;
  if (mode === 'day') {
    // Current day starting at midnight (00:00:00) in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight
    windowStart = today.getTime();
  } else {
    // Rolling 24-hour window: now - 24 hours
    windowStart = now - 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  // Filter entries within the window and validate
  const validEntries = entries.filter((entry) => {
    // Skip malformed entries: missing calories or timestamp
    if (typeof entry.calories !== 'number' || isNaN(entry.calories) || entry.calories < 0) {
      return false;
    }
    if (!entry.timestamp) {
      return false;
    }

    // Convert timestamp to number (handles both ISO strings and Unix timestamps)
    let timestampMs: number;
    if (typeof entry.timestamp === 'string') {
      timestampMs = new Date(entry.timestamp).getTime();
    } else {
      timestampMs = entry.timestamp;
    }

    // Check if timestamp is valid and within window
    if (isNaN(timestampMs)) {
      return false; // Skip invalid timestamps
    }
    
    return timestampMs >= windowStart && timestampMs <= now;
  });

  if (validEntries.length === 0) {
    return { average: null, count: 0 };
  }

  // Calculate average: sum of calories / count
  const sum = validEntries.reduce((acc, entry) => acc + entry.calories, 0);
  const average = sum / validEntries.length;

  return { average, count: validEntries.length };
};

/**
 * Helper function to calculate rolling 24-hour average for a specific metric type
 * 
 * @param entries - Array of health entries
 * @param type - Type of metric to calculate ('bmi' | 'water' | 'sleep' | 'nutrition')
 * @returns Object with average (number | null) and count (number of entries used)
 * 
 * NOTE: Uses rolling 24-hour window (now - 24 hours to now)
 * 
 * TIMEZONE CONSIDERATIONS:
 * - Date.now() and Date.getTime() use the device's local timezone
 * - All timestamp comparisons are done in milliseconds since Unix epoch
 * - The 24-hour window is calculated relative to the current device time
 * 
 * To change to "current day (midnight to now)" instead of rolling 24 hours:
 * const now = new Date();
 * const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
 * Then use windowStart instead of twentyFourHoursAgo
 */
const averageLast24Hours = (
  entries: HealthEntry[],
  type: 'bmi' | 'water' | 'sleep' | 'nutrition'
): { average: number | null; count: number } => {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Filter entries by type and within last 24 hours
  // Also validate that entry has required fields
  const validEntries = entries.filter((entry) => {
    if (entry.type !== type) return false;
    if (typeof entry.value !== 'number' || isNaN(entry.value)) return false;
    if (!entry.timestamp) return false;

    // Convert timestamp to number (handles both ISO strings and Unix timestamps)
    let timestampMs: number;
    if (typeof entry.timestamp === 'string') {
      timestampMs = new Date(entry.timestamp).getTime();
    } else {
      timestampMs = entry.timestamp;
    }

    // Check if timestamp is valid and within last 24 hours
    if (isNaN(timestampMs)) {
      console.warn(`⚠️ Invalid timestamp for entry ${entry.id}:`, entry.timestamp);
      return false;
    }
    const isWithin24Hours = timestampMs >= twentyFourHoursAgo && timestampMs <= now;
    return isWithin24Hours;
  });

  if (validEntries.length === 0) {
    return { average: null, count: 0 };
  }

  // Calculate average
  const sum = validEntries.reduce((acc, entry) => acc + entry.value, 0);
  const average = sum / validEntries.length;

  return { average, count: validEntries.length };
};

const AllHealthDataScreen: React.FC<AllHealthDataScreenProps> = ({ 
  entries: propEntries = [], 
  calorieEntries: propCalorieEntries = [] 
}) => {
  const navigation = useNavigation<AllHealthDataScreenNavigationProp>();
  const { getState } = useAppState();
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [latestWorkout, setLatestWorkout] = useState<{ reps: number; exercise: string; date: string } | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  
  // Loaded entries from AsyncStorage
  const [loadedEntries, setLoadedEntries] = useState<HealthEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  
  // Calorie entries (can be passed via props or loaded from storage)
  const [loadedCalorieEntries, setLoadedCalorieEntries] = useState<CalorieEntry[]>([]);
  
  // Force re-render every 60 seconds to update rolling window
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Combine prop entries with loaded entries (prop entries take precedence)
  const entries = useMemo(() => {
    if (propEntries.length > 0) {
      return propEntries;
    }
    return loadedEntries;
  }, [propEntries, loadedEntries]);

  // Combine prop calorie entries with loaded entries (prop entries take precedence)
  const calorieEntries = useMemo(() => {
    if (propCalorieEntries.length > 0) {
      return propCalorieEntries;
    }
    return loadedCalorieEntries;
  }, [propCalorieEntries, loadedCalorieEntries]);

  // Load entries from AsyncStorage and other sources
  useEffect(() => {
    loadHealthEntries();
    loadCalorieEntries();
    loadLatestWorkout();
  }, []);

  // Reload entries when screen comes into focus (in case data was updated)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadHealthEntries();
      loadCalorieEntries();
    });
    return unsubscribe;
  }, [navigation]);

  /**
   * Load health entries from AsyncStorage and convert to HealthEntry format
   * This function aggregates data from:
   * - Water Intake: water_intake_entries
   * - Sleep: sleep_sessions
   * - Nutrition: daily_calories (current day total)
   * - BMI: calculated from profile height/weight
   */
  const loadHealthEntries = async () => {
    try {
      setLoadingEntries(true);
      const allEntries: HealthEntry[] = [];

      // 1. Load Water Intake entries from AppStateContext
      try {
        // Try AppStateContext first (used by usePersistentState)
        const waterEntries = getState<WaterEntry[]>('water_intake_entries');
        if (waterEntries && Array.isArray(waterEntries)) {
          waterEntries.forEach((entry: any) => {
            if (entry.liters && entry.timestamp) {
              allEntries.push({
                id: entry.id || `water-${Date.now()}-${Math.random()}`,
                type: 'water',
                value: entry.liters,
                timestamp: entry.timestamp,
              });
            }
          });
        } else {
          // Fallback: Try direct AsyncStorage read (legacy)
          const waterEntriesJson = await AsyncStorage.getItem('water_intake_entries');
          if (waterEntriesJson) {
            const parsed = JSON.parse(waterEntriesJson);
            if (Array.isArray(parsed)) {
              parsed.forEach((entry: any) => {
                if (entry.liters && entry.timestamp) {
                  allEntries.push({
                    id: entry.id || `water-${Date.now()}-${Math.random()}`,
                    type: 'water',
                    value: entry.liters,
                    timestamp: entry.timestamp,
                  });
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading water entries:', error);
      }

      // 2. Load Sleep sessions from AppStateContext
      try {
        // Try AppStateContext first (used by usePersistentState)
        const sleepSessions = getState<SleepSession[]>('sleep_sessions');
        if (sleepSessions && Array.isArray(sleepSessions)) {
          sleepSessions.forEach((session: any) => {
            if (session.durationMs && session.end) {
              // Convert duration from milliseconds to hours
              const hours = session.durationMs / (1000 * 60 * 60);
              
              // Convert end timestamp to ISO string if it's a number
              let timestamp: string;
              if (typeof session.end === 'number') {
                timestamp = new Date(session.end).toISOString();
              } else if (typeof session.end === 'string') {
                timestamp = session.end;
              } else {
                return; // Skip invalid timestamp
              }
              
              allEntries.push({
                id: session.id || `sleep-${Date.now()}-${Math.random()}`,
                type: 'sleep',
                value: hours,
                timestamp: timestamp,
              });
            }
          });
        } else {
          // Fallback: Try direct AsyncStorage read (legacy)
          const sleepSessionsJson = await AsyncStorage.getItem('sleep_sessions');
          if (sleepSessionsJson) {
            const parsed = JSON.parse(sleepSessionsJson);
            if (Array.isArray(parsed)) {
              parsed.forEach((session: any) => {
                if (session.durationMs && session.end) {
                  const hours = session.durationMs / (1000 * 60 * 60);
                  let timestamp: string;
                  if (typeof session.end === 'number') {
                    timestamp = new Date(session.end).toISOString();
                  } else if (typeof session.end === 'string') {
                    timestamp = session.end;
                  } else {
                    return;
                  }
                  allEntries.push({
                    id: session.id || `sleep-${Date.now()}-${Math.random()}`,
                    type: 'sleep',
                    value: hours,
                    timestamp: timestamp,
                  });
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading sleep entries:', error);
      }

      // 3. Load Nutrition (daily calories total)
      try {
        const dailyCaloriesJson = await AsyncStorage.getItem('daily_calories');
        if (dailyCaloriesJson) {
          const meals = JSON.parse(dailyCaloriesJson);
          if (meals && typeof meals === 'object') {
            // Calculate total calories for today
            const total = Object.values(meals).reduce((sum: number, val: any) => {
              const num = parseInt(val, 10) || 0;
              return sum + num;
            }, 0);
            
            if (total > 0) {
              // Create an entry for today's total nutrition
              allEntries.push({
                id: `nutrition-${new Date().toISOString().split('T')[0]}`,
                type: 'nutrition',
                value: total,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading nutrition entries:', error);
      }

      // 4. Load BMI from profile (calculate current BMI)
      try {
        const profile = await fetchProfile();
        if (profile?.height && profile?.weight) {
          const heightNum = parseFloat(profile.height);
          const weightNum = parseFloat(profile.weight);
          
          if (heightNum > 0 && weightNum > 0) {
            const heightM = heightNum / 100;
            const bmi = weightNum / (heightM * heightM);
            
            // Create BMI entry (use current timestamp)
            allEntries.push({
              id: `bmi-${Date.now()}`,
              type: 'bmi',
              value: Math.round(bmi * 100) / 100, // Round to 2 decimals
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('❌ Error loading BMI entry:', error);
      }

      // Debug: Log what we found
      const waterCount = allEntries.filter(e => e.type === 'water').length;
      const sleepCount = allEntries.filter(e => e.type === 'sleep').length;
      const bmiCount = allEntries.filter(e => e.type === 'bmi').length;
      const nutritionCount = allEntries.filter(e => e.type === 'nutrition').length;
      
      console.log(`📊 Loaded entries: Water=${waterCount}, Sleep=${sleepCount}, BMI=${bmiCount}, Nutrition=${nutritionCount}`);

      // If no entries found, log helpful message
      if (allEntries.length === 0) {
        console.log('ℹ️ No health entries found in storage. Add data in Water Intake, Sleep, or Nutrition screens to see averages.');
      }

      setLoadedEntries(allEntries);
      console.log(`✅ Total entries loaded: ${allEntries.length}`);
    } catch (error) {
      console.error('❌ Error loading health entries:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  /**
   * Load calorie entries from AppStateContext
   * These entries are saved when users calculate calories in BurnedCaloriesScreen
   */
  const loadCalorieEntries = async () => {
    try {
      // First try direct AsyncStorage read (most reliable)
      // usePersistentState stores data in AppStateContext which is backed by AsyncStorage
      // We can read directly from AsyncStorage to get the latest data
      const appStateJson = await AsyncStorage.getItem('@fithive:app_state');
      if (appStateJson) {
        const appState = JSON.parse(appStateJson);
        const entries = appState?.burned_calories_entries;
        if (entries && Array.isArray(entries)) {
          setLoadedCalorieEntries(entries);
          console.log(`🔥 Loaded ${entries.length} calorie entries from AsyncStorage`);
          return;
        }
      }

      // Fallback: Try AppStateContext (might not be loaded yet)
      const entries = getState<CalorieEntry[]>('burned_calories_entries');
      if (entries && Array.isArray(entries)) {
        setLoadedCalorieEntries(entries);
        console.log(`🔥 Loaded ${entries.length} calorie entries from AppStateContext`);
      } else {
        console.log('ℹ️ No calorie entries found in storage');
        setLoadedCalorieEntries([]);
      }
    } catch (error) {
      console.error('❌ Error loading calorie entries:', error);
      setLoadedCalorieEntries([]);
    }
  };

  // Set up interval to recompute averages every 60 seconds
  // This ensures the rolling 24-hour window updates automatically
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1);
    }, 60000); // 60 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calculate averages for each metric type using useMemo
  // Recomputes when entries change or updateTrigger changes (every 60s)
  const bmiAverage = useMemo(() => {
    const result = averageLast24Hours(entries, 'bmi');
    console.log(`📊 BMI average: ${result.average} (from ${result.count} entries)`);
    return result;
  }, [entries, updateTrigger]);
  
  const waterAverage = useMemo(() => {
    const result = averageLast24Hours(entries, 'water');
    console.log(`💧 Water average: ${result.average}L (from ${result.count} entries)`);
    return result;
  }, [entries, updateTrigger]);
  
  const sleepAverage = useMemo(() => {
    const result = averageLast24Hours(entries, 'sleep');
    console.log(`😴 Sleep average: ${result.average}hr (from ${result.count} entries)`);
    return result;
  }, [entries, updateTrigger]);
  
  const nutritionAverage = useMemo(() => {
    const result = averageLast24Hours(entries, 'nutrition');
    console.log(`🍎 Nutrition average: ${result.average}kcal (from ${result.count} entries)`);
    return result;
  }, [entries, updateTrigger]);

  // Calculate burned calories average using useMemo
  // Recomputes when calorieEntries change or updateTrigger changes (every 60s)
  const burnedCaloriesAverage = useMemo(() => {
    const result = averageCaloriesInWindow(calorieEntries, WINDOW_MODE);
    console.log(`🔥 Burned calories average: ${result.average} (from ${result.count} entries, mode: ${WINDOW_MODE})`);
    return result;
  }, [calorieEntries, updateTrigger]);

  // Format average value for display
  const formatAverage = (
    result: { average: number | null; count: number },
    decimals: number = 1,
    unit: string = ''
  ): string => {
    if (result.average === null) {
      return '—';
    }
    return `${result.average.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
  };

  const loadLatestWorkout = async () => {
    try {
      setLoadingWorkout(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingWorkout(false);
        return;
      }

      const workouts = await fetchWorkoutHistory(user.id, 1);
      if (workouts.length > 0) {
        const workout = workouts[0];
        const exerciseName = workout.exercise === 'pushup' ? 'Push-Ups' : 
                            workout.exercise === 'curl' ? 'Bicep Curls' : 'Squats';
        const date = new Date(workout.created_at);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        setLatestWorkout({
          reps: workout.reps,
          exercise: exerciseName,
          date: formattedDate,
        });
      }
    } catch (error) {
      console.error('❌ Error loading latest workout:', error);
    } finally {
      setLoadingWorkout(false);
    }
  };

  const handleStartWorkout = (exerciseType: ExerciseType) => {
    navigation.navigate('WorkoutCamera', { exerciseType });
  };

  // Health data array with computed averages
  // Averages are calculated from entries in the last 24 hours
  const healthData = [
    {
      id: '1',
      icon: 'body' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#A992F6',
      title: 'Body mass index',
      value: formatAverage(bmiAverage, 1, 'BMI'),
      unit: '',
    },
    {
      id: '2',
      icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#63e5ff',
      title: 'Water Intake',
      value: formatAverage(waterAverage, 1, 'L'),
      unit: '',
    },
    {
      id: '3',
      icon: 'calendar' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#F5A623',
      title: 'Cycle tracking',
      value: '08 April',
      unit: '',
    },
    {
      id: '4',
      icon: 'bed' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#1E3A5F',
      title: 'Sleep',
      value: formatAverage(sleepAverage, 1, 'hr'),
      unit: '',
    },
    {
      id: '5',
      icon: 'barbell-outline' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#FFE5E5',
      iconColor: '#E74C3C',
      title: 'Workout',
      value: loadingWorkout ? '...' : latestWorkout ? `${latestWorkout.reps}` : '0',
      unit: latestWorkout ? 'reps' : 'Start',
      isWorkout: true,
    },
    {
      id: '6',
      icon: 'flame' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#F5A623',
      title: 'Burned calories',
      value: burnedCaloriesAverage.average !== null 
        ? `${Math.round(burnedCaloriesAverage.average)}`
        : 'No data',
      unit: burnedCaloriesAverage.average !== null ? 'kcal' : '',
      subtitle: burnedCaloriesAverage.count > 0 
        ? `based on ${burnedCaloriesAverage.count} ${burnedCaloriesAverage.count === 1 ? 'entry' : 'entries'}`
        : undefined,
    },
    {
      id: '7',
      icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#7B5EA7',
      title: 'Nutrition',
      value: formatAverage(nutritionAverage, 0, 'kcal'),
      unit: '',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Health Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading indicator while entries are being loaded */}
        {loadingEntries && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#A992F6" />
            <Text style={styles.loadingText}>Loading health data...</Text>
          </View>
        )}
        
        {healthData.map((item) => (
          <HealthDataItem
            key={item.id}
            icon={item.icon}
            iconBackgroundColor={item.iconBackgroundColor}
            iconColor={item.iconColor}
            title={item.title}
            value={item.value}
            unit={item.unit}
            isWorkout={item.isWorkout}
            workoutInfo={item.isWorkout && latestWorkout ? { exercise: latestWorkout.exercise, date: latestWorkout.date } : null}
            onPress={
              item.title === 'Body mass index'
                ? () => navigation.navigate('BMI')
                : item.title === 'Water Intake' 
                  ? () => navigation.navigate('WaterIntake') 
                  : item.title === 'Sleep' 
                    ? () => navigation.navigate('Sleep')
                    : item.title === 'Cycle tracking'
                      ? () => navigation.navigate('PeriodCycle')
                      : item.title === 'Workout'
                        ? () => setShowWorkoutModal(true)
                        : item.title === 'Nutrition'
                          ? () => navigation.navigate('Nutrition')
                          : item.title === 'Burned calories'
                            ? () => navigation.navigate('BurnedCalories')
                            : undefined
            }
          />
        ))}
      </ScrollView>

      <WorkoutSelectionModal
        visible={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        onSelectExercise={handleStartWorkout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  healthDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  healthDataContent: {
    flex: 1,
  },
  healthDataTitle: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthDataValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  healthDataUnit: {
    fontSize: 14,
    color: '#6F6F7B',
  },
  dragSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 8,
  },
  dragDots: {
    marginRight: 12,
  },
  dotRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A992F6',
    marginHorizontal: 2,
  },
  dragText: {
    fontSize: 16,
    color: '#A992F6',
    fontWeight: '500',
  },
  startWorkoutButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    fontSize: 12,
    color: '#6F6F7B',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6F6F7B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6F6F7B',
    marginTop: 8,
  },
});

export default AllHealthDataScreen;

