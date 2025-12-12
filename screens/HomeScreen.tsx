import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MissionCard from '../components/MissionCard';
import HighlightCard from '../components/HighlightCard';
import ScoreCard from '../components/ScoreCard';
import FloatingAIButton from '../components/FloatingAIButton';
import { useHealthData } from '../contexts/HealthDataContext';

type RootStackParamList = {
  AllHealthData: undefined;
  AIChat: undefined;
  BurnedCalories: undefined;
  WaterIntake: undefined;
  PeriodCycle: undefined;
  Nutrition: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Daily Mission Goals (fixed values)
 * These are the targets users must reach to complete each mission
 */
const DAILY_GOALS = {
  WATER_INTAKE: 3,      // Liters
  BURNED_CALORIES: 300, // kcal
  NUTRITION: 2200,      // kcal
  SLEEP: 7,             // hours
} as const;

/**
 * Get today's date key for AsyncStorage
 * Format: "dailyMission_YYYYMMDD"
 */
const getTodayKey = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `dailyMission_${year}${month}${day}`;
};

/**
 * Check if a date is today
 */
const isToday = (dateKey: string): boolean => {
  return dateKey === getTodayKey();
};

interface MissionCompletionState {
  waterIntake: boolean;
  burnedCalories: boolean;
  nutrition: boolean;
  sleep: boolean;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  
  /**
   * DATA FLOW: How Highlights get live values
   * 
   * 1. User enters data in activity screens (WaterIntakeScreen, NutritionScreen, BurnedCaloriesScreen)
   *    → Data is saved to AppStateContext (via usePersistentState)
   * 
   * 2. AllHealthDataScreen reads from AppStateContext and calculates rolling 24-hour averages
   *    → Updates HealthDataContext with these averages via useEffect
   * 
   * 3. HomeScreen reads from HealthDataContext (via useHealthData hook)
   *    → Values update reactively whenever HealthDataContext changes
   *    → Highlights containers display formatted values automatically
   * 
   * This ensures Highlights always show the latest calculated averages from AllHealthDataScreen,
   * which updates whenever the screen is focused or data changes.
   */
  const { waterValue, burnedValue, nutritionValue, sleepValue } = useHealthData();
  const [missionCompletion, setMissionCompletion] = useState<MissionCompletionState>({
    waterIntake: false,
    burnedCalories: false,
    nutrition: false,
    sleep: false,
  });
  const [lastDateKey, setLastDateKey] = useState<string>(getTodayKey());

  /**
   * Load mission completion state from AsyncStorage for today
   * If the date has changed, reset all missions
   */
  const loadMissionCompletion = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      
      // Check if date has changed (new day or app reopened on new day)
      if (lastDateKey !== todayKey) {
        // Reset all missions for the new day
        const resetState: MissionCompletionState = {
          waterIntake: false,
          burnedCalories: false,
          nutrition: false,
          sleep: false,
        };
        setMissionCompletion(resetState);
        setLastDateKey(todayKey);
        // Clear old date's data (optional cleanup)
        if (lastDateKey) {
          await AsyncStorage.removeItem(lastDateKey);
        }
        // Save reset state for today
        await AsyncStorage.setItem(todayKey, JSON.stringify(resetState));
        return;
      }

      // Load today's completion state
      const saved = await AsyncStorage.getItem(todayKey);
      if (saved) {
        const parsed = JSON.parse(saved) as MissionCompletionState;
        setMissionCompletion(parsed);
      } else {
        // First time today - initialize with all false
        const initialState: MissionCompletionState = {
          waterIntake: false,
          burnedCalories: false,
          nutrition: false,
          sleep: false,
        };
        setMissionCompletion(initialState);
        await AsyncStorage.setItem(todayKey, JSON.stringify(initialState));
      }
    } catch (error) {
      console.error('Error loading mission completion:', error);
    }
  }, [lastDateKey]);

  /**
   * Save mission completion state to AsyncStorage
   */
  const saveMissionCompletion = useCallback(async (state: MissionCompletionState) => {
    try {
      const todayKey = getTodayKey();
      await AsyncStorage.setItem(todayKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving mission completion:', error);
    }
  }, []);

  /**
   * Check if a mission is completed based on current value vs goal
   * Mission is completed when: currentValue >= goal
   */
  const checkMissionCompletion = useCallback((
    currentValue: number | null,
    goal: number
  ): boolean => {
    if (currentValue === null) return false;
    return currentValue >= goal;
  }, []);

  /**
   * Update mission completion state when health values change
   * This runs reactively whenever waterValue, burnedValue, nutritionValue, or sleepValue changes
   */
  useEffect(() => {
    const newCompletion: MissionCompletionState = {
      waterIntake: checkMissionCompletion(waterValue, DAILY_GOALS.WATER_INTAKE),
      burnedCalories: checkMissionCompletion(burnedValue, DAILY_GOALS.BURNED_CALORIES),
      nutrition: checkMissionCompletion(nutritionValue, DAILY_GOALS.NUTRITION),
      sleep: checkMissionCompletion(sleepValue, DAILY_GOALS.SLEEP),
    };

    // Only update if something changed to avoid unnecessary saves
    const hasChanged = 
      newCompletion.waterIntake !== missionCompletion.waterIntake ||
      newCompletion.burnedCalories !== missionCompletion.burnedCalories ||
      newCompletion.nutrition !== missionCompletion.nutrition ||
      newCompletion.sleep !== missionCompletion.sleep;

    if (hasChanged) {
      setMissionCompletion(newCompletion);
      saveMissionCompletion(newCompletion);
    }
  }, [waterValue, burnedValue, nutritionValue, sleepValue, checkMissionCompletion, missionCompletion, saveMissionCompletion]);

  /**
   * Load mission completion on mount and when screen is focused
   */
  useFocusEffect(
    useCallback(() => {
      loadMissionCompletion();
    }, [loadMissionCompletion])
  );

  /**
   * Listen for app state changes to detect date changes
   * When app comes to foreground, check if date has changed
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - check if date changed
        const todayKey = getTodayKey();
        if (lastDateKey !== todayKey) {
          loadMissionCompletion();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [lastDateKey, loadMissionCompletion]);

  /**
   * Calculate completed missions count
   * Counts how many missions have been completed (currentValue >= goal)
   */
  const completedMissions = useMemo(() => {
    return Object.values(missionCompletion).filter(Boolean).length;
  }, [missionCompletion]);

  const totalMissions = 4; // Water Intake, Burned Calories, Nutrition, Sleep

  /**
   * Format health values for display in Highlights section
   * These values update reactively whenever HealthDataContext values change
   * (which happens when AllHealthDataScreen updates them)
   */
  const formattedWaterValue = useMemo(() => {
    if (waterValue === null || waterValue === undefined) return '0 L';
    // Round to 1 decimal place and format as "X.X L"
    return `${Math.round(waterValue * 10) / 10} L`;
  }, [waterValue]);

  const formattedBurnedCaloriesValue = useMemo(() => {
    if (burnedValue === null || burnedValue === undefined) return '0 kcal';
    // Round to nearest integer and format as "XXX kcal"
    return `${Math.round(burnedValue)} kcal`;
  }, [burnedValue]);

  const formattedNutritionValue = useMemo(() => {
    if (nutritionValue === null || nutritionValue === undefined) return '0 kcal';
    // Round to nearest integer and format as "XXXX kcal"
    return `${Math.round(nutritionValue)} kcal`;
  }, [nutritionValue]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi Username!</Text>
          <TouchableOpacity style={styles.profileIcon}>
            <Ionicons name="person-outline" size={24} color="#1E3A5F" />
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {/* Daily Missions */}
        {/* 
          Daily Mission Container:
          - Tracks 4 missions: Water Intake (3L), Burned Calories (300 kcal), Nutrition (2200 kcal), Sleep (7hr)
          - Missions are marked completed when currentValue >= goal
          - Completion state persists to AsyncStorage with date-based keys
          - Automatically resets at midnight or when app opens on a new day
          - Updates reactively when health values change in AllHealthDataScreen
        */}
        <MissionCard completed={completedMissions} total={totalMissions} />

        <View style={styles.separator} />

        {/* Highlights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <View style={styles.highlightsGrid}>
            {/* Water Intake */}
            {/* 
              Value updates automatically from HealthDataContext
              AllHealthDataScreen updates waterValue whenever user logs water intake
            */}
            <View style={styles.highlightItem}>
              <TouchableOpacity
                onPress={() => navigation.navigate('WaterIntake')}
                activeOpacity={0.8}
              >
                <HighlightCard
                  icon="water-outline"
                  metric="Water Intake"
                  value={formattedWaterValue}
                  updateTime="Live"
                  backgroundColor="#A992F6"
                />
              </TouchableOpacity>
            </View>
            
            {/* Cycle Tracking */}
            <View style={styles.highlightItem}>
              <TouchableOpacity
                onPress={() => navigation.navigate('PeriodCycle')}
                activeOpacity={0.8}
              >
                <HighlightCard
                  icon="calendar-outline"
                  metric="Cycle tracking"
                  value="12 days before period"
                  updateTime="updated 30m ago"
                  backgroundColor="#C299F6"
                />
              </TouchableOpacity>
            </View>
            
            {/* REMOVED: Workout container - replaced with Burned Calories */}
            {/* ADDED: Burned Calories container */}
            {/* 
              Value updates automatically from HealthDataContext
              AllHealthDataScreen updates burnedValue whenever user calculates burned calories
            */}
            <View style={styles.highlightItem}>
              <TouchableOpacity
                onPress={() => navigation.navigate('BurnedCalories')}
                activeOpacity={0.8}
              >
                <HighlightCard
                  icon="flame"
                  metric="Burned Calories"
                  value={formattedBurnedCaloriesValue}
                  updateTime="Live"
                  backgroundColor="#F5A623"
                />
              </TouchableOpacity>
            </View>
            
            {/* Nutrition */}
            {/* 
              Value updates automatically from HealthDataContext
              AllHealthDataScreen updates nutritionValue whenever user logs calories
            */}
            <View style={styles.highlightItem}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Nutrition')}
                activeOpacity={0.8}
              >
                <HighlightCard
                  icon="restaurant-outline"
                  metric="Nutrition"
                  value={formattedNutritionValue}
                  updateTime="Live"
                  backgroundColor="#1AA6A6"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Overview Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <TouchableOpacity 
              style={styles.allDataButton}
              onPress={() => navigation.navigate('AllHealthData')}
            >
              <Text style={styles.allDataText}>All Data</Text>
            </TouchableOpacity>
          </View>
          <ScoreCard
            score={78}
            description="Based on your overview health tracking, your score is 78 and consider good.."
          />
        </View>
      </ScrollView>
      
      {/* Floating AI Chat Button */}
      <FloatingAIButton />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  allDataButton: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  allDataText: {
    fontSize: 14,
    color: '#1AA6A6',
    fontWeight: '600',
  },
  highlightsGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
},

highlightItem: {
  width: '48%',       // 2 cards per row
  marginBottom: 16,

 },
});

export default HomeScreen;

