import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
  AppState,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MissionCard from '../components/MissionCard';
import HighlightCard from '../components/HighlightCard';
import ScoreCard from '../components/ScoreCard';
import FloatingAIButton from '../components/FloatingAIButton';

import { Doctor } from './DoctorDetailsScreen';
import { useHealthData } from '../contexts/HealthDataContext';
import { getUserKey } from '../utils/userStorageUtils';
import {
  calculateMissionStatus,
  saveDailyMissionStatus,
  loadDailyMissionStatus,
  DailyMissionStatus,
  DAILY_GOALS as MISSION_GOALS,
} from '../utils/dailyMissionManager';
import { calculateHealthScore, getHealthScoreDescription } from '../utils/healthScoreCalculator';


type RootStackParamList = {
  AllHealthData: undefined;
  AIChat: undefined;
  DoctorDetails: { doctor: Doctor };
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
 * Get today's date key for AsyncStorage (user-specific)
 * Format: "dailyMission_YYYYMMDD_<userId>"
 * 
 * @param {string | null | undefined} userId - User ID from auth
 * @returns {string} User-specific date key
 */
const getTodayKey = (userId: string | null | undefined): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const baseKey = `dailyMission_${year}${month}${day}`;
  return getUserKey(baseKey, userId);
};

/**
 * Check if a date key is for today (user-specific)
 */
const isToday = (dateKey: string, userId: string | null | undefined): boolean => {
  return dateKey === getTodayKey(userId);
};

interface MissionCompletionState {
  waterIntake: boolean;
  burnedCalories: boolean;
  nutrition: boolean;
  sleep: boolean;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [username, setUsername] = useState('Username');
  const [isDoctorsModalVisible, setIsDoctorsModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [userHeight, setUserHeight] = useState<string | null>(null);
  const [userWeight, setUserWeight] = useState<string | null>(null);

  // Doctor data
  const doctors: Doctor[] = [
    {
      name: 'Rajesh Kumar',
      phone: '(+91) 7020152531',
      email: 'dr.rajesh.kumar@hospital.com',
      specialization: 'Cardiologist',
      experience: '15 years',
      hospital: 'Apollo Hospitals',
      hospitalAddress: '123 Medical Street, Sector 5, New Delhi - 110001',
    },
    {
      name: 'Priya Sharma',
      phone: '(+91) 7020152531',
      email: 'dr.priya.sharma@hospital.com',
      specialization: 'Dermatologist',
      experience: '12 years',
      hospital: 'Fortis Healthcare',
      hospitalAddress: '456 Health Avenue, MG Road, Bangalore - 560001',
    },
    {
      name: 'Amit Patel',
      phone: '(+91) 7020152531',
      email: 'dr.amit.patel@hospital.com',
      specialization: 'Orthopedic Surgeon',
      experience: '18 years',
      hospital: 'Max Super Specialty Hospital',
      hospitalAddress: '789 Wellness Boulevard, Andheri West, Mumbai - 400053',
    },
    {
      name: 'Sneha Reddy',
      phone: '(+91) 7020152531',
      email: 'dr.sneha.reddy@hospital.com',
      specialization: 'Gynecologist',
      experience: '10 years',
      hospital: 'AIIMS',
      hospitalAddress: '321 Care Circle, Ansari Nagar, New Delhi - 110029',
    },
  ];

  const handleDoctorPress = (doctor: Doctor) => {
    setIsDoctorsModalVisible(false);
    setSelectedDoctor(doctor);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    const emailUrl = `mailto:${email}`;
    Linking.canOpenURL(emailUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(emailUrl);
        } else {
          console.log('Email client not available');
        }
      })
      .catch((err) => console.error('Error opening email client:', err));
  };

  const handleBookAppointment = () => {
    if (!selectedDoctor) return;
    Alert.alert(
      'Book Appointment',
      `Would you like to book an appointment with Dr. ${selectedDoctor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: () => {
            // TODO: Implement appointment booking logic
            Alert.alert('Success', 'Appointment booking feature coming soon!');
          },
        },
      ]
    );
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        // Get username, height, and weight from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name, subscription_plan, height, weight')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUsername(profile.full_name || profile.username || user.email?.split('@')[0] || 'Username');
          setIsPremium(profile.subscription_plan === 'Premium');
          setUserHeight(profile.height || null);
          setUserWeight(profile.weight || null);
        } else {
          setUsername(user.email?.split('@')[0] || 'Username');
          setUserHeight(null);
          setUserWeight(null);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUsername(user.email?.split('@')[0] || 'Username');
        setUserHeight(null);
        setUserWeight(null);
      }
    };

    loadUserProfile();
  }, [user]);

  
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
   * For Burned Calories:
   * - totalBurnedCalories is a derived value (treadmillCalories + cyclingCalories) shared across all screens
   * - Updated in real-time when user calculates treadmill or cycling calories in BurnedCaloriesScreen
   * - This ensures consistency across BurnedCaloriesScreen, AllHealthDataScreen, and HomeScreen
   */
  const { waterValue, burnedValue, nutritionValue, sleepValue, totalBurnedCalories } = useHealthData();
  const [missionCompletion, setMissionCompletion] = useState<MissionCompletionState>({
    waterIntake: false,
    burnedCalories: false,
    nutrition: false,
    sleep: false,
  });
  const [missionStatus, setMissionStatus] = useState<DailyMissionStatus>({
    waterDone: false,
    burnedDone: false,
    nutritionDone: false,
    sleepDone: false,
    completedCount: 0,
    canClaimReward: false,
  });
  const [lastDateKey, setLastDateKey] = useState<string>(getTodayKey(user?.id));

  /**
   * Load mission completion state from AsyncStorage for today (user-specific)
   * If the date has changed, reset all missions
   * Uses user-specific keys to ensure each user has isolated mission data
   */
  const loadMissionCompletion = useCallback(async () => {
    if (!user?.id) {
      // No user - reset to defaults
      setMissionCompletion({
        waterIntake: false,
        burnedCalories: false,
        nutrition: false,
        sleep: false,
      });
      return;
    }

    try {
      const todayKey = getTodayKey(user.id);
      
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
        // Clear old date's data (optional cleanup - user-specific)
        if (lastDateKey && lastDateKey.includes(user.id)) {
          await AsyncStorage.removeItem(lastDateKey);
        }
        // Save reset state for today (user-specific)
        await AsyncStorage.setItem(todayKey, JSON.stringify(resetState));
        return;
      }

      // Load today's completion state (user-specific)
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
  }, [lastDateKey, user?.id]);

  /**
   * Save mission completion state to AsyncStorage (user-specific)
   */
  const saveMissionCompletion = useCallback(async (state: MissionCompletionState) => {
    if (!user?.id) return; // Don't save if no user
    
    try {
      const todayKey = getTodayKey(user.id);
      await AsyncStorage.setItem(todayKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving mission completion:', error);
    }
  }, [user?.id]);

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
   * This runs reactively whenever waterValue, totalBurnedCalories, nutritionValue, or sleepValue changes
   * Also calculates canClaimReward status (requires 3+ missions completed)
   * 
   * Note: Uses totalBurnedCalories (treadmill + cycling) instead of burnedValue (average)
   * for mission completion check
   */
  useEffect(() => {
    if (!user?.id) return;

    // Calculate mission status using the new manager
    // Use totalBurnedCalories for burned calories mission (treadmill + cycling)
    // totalBurnedCalories is always a number (defaults to 0), so pass null if 0 for mission check
    const newStatus = calculateMissionStatus(
      waterValue,
      totalBurnedCalories > 0 ? totalBurnedCalories : null, // Use totalBurnedCalories instead of burnedValue
      nutritionValue,
      sleepValue
    );

    // Convert to old format for backward compatibility
    const newCompletion: MissionCompletionState = {
      waterIntake: newStatus.waterDone,
      burnedCalories: newStatus.burnedDone,
      nutrition: newStatus.nutritionDone,
      sleep: newStatus.sleepDone,
    };

    // Only update if something changed to avoid unnecessary saves
    const hasChanged = 
      newStatus.waterDone !== missionStatus.waterDone ||
      newStatus.burnedDone !== missionStatus.burnedDone ||
      newStatus.nutritionDone !== missionStatus.nutritionDone ||
      newStatus.sleepDone !== missionStatus.sleepDone ||
      newStatus.canClaimReward !== missionStatus.canClaimReward;

    if (hasChanged) {
      setMissionCompletion(newCompletion);
      setMissionStatus(newStatus);
      
      // Save to AsyncStorage with user-specific key
      saveDailyMissionStatus(user.id, newStatus).catch((error) => {
        console.error('Error saving mission status:', error);
      });
    }
  }, [waterValue, totalBurnedCalories, nutritionValue, sleepValue, user?.id, missionStatus]);

  /**
   * Calculate Health Score reactively based on health data and profile
   * Updates whenever water intake, nutrition, burned calories, height, or weight changes
   */
  const healthScore = useMemo(() => {
    return calculateHealthScore(
      waterValue,
      nutritionValue,
      totalBurnedCalories,
      userHeight,
      userWeight
    );
  }, [waterValue, nutritionValue, totalBurnedCalories, userHeight, userWeight]);

  /**
   * Get Health Score description based on calculated score
   */
  const healthScoreDescription = useMemo(() => {
    return getHealthScoreDescription(healthScore);
  }, [healthScore]);

  /**
   * Load mission completion on mount and when screen is focused
   * Also loads mission status with canClaimReward flag
   */
  useFocusEffect(
    useCallback(() => {
      loadMissionCompletion();
      
      // Also load mission status
      if (user?.id) {
        loadDailyMissionStatus(user.id).then((status) => {
          if (status) {
            setMissionStatus(status);
            // Update missionCompletion for backward compatibility
            setMissionCompletion({
              waterIntake: status.waterDone,
              burnedCalories: status.burnedDone,
              nutrition: status.nutritionDone,
              sleep: status.sleepDone,
            });
          }
        });
      }
    }, [loadMissionCompletion, user?.id])
  );

  /**
   * Listen for app state changes to detect date changes
   * When app comes to foreground, check if date has changed
   * Also reload when user changes
   */
  useEffect(() => {
    // Reload when user changes
    if (user?.id) {
      loadMissionCompletion();
      setLastDateKey(getTodayKey(user.id));
    } else {
      // User logged out - reset missions
      setMissionCompletion({
        waterIntake: false,
        burnedCalories: false,
        nutrition: false,
        sleep: false,
      });
    }
  }, [user?.id, loadMissionCompletion]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && user?.id) {
        // App came to foreground - check if date changed
        const todayKey = getTodayKey(user.id);
        if (lastDateKey !== todayKey) {
          loadMissionCompletion();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [lastDateKey, loadMissionCompletion, user?.id]);

  /**
   * Calculate completed missions count
   * Uses missionStatus for accurate count and canClaimReward status
   */
  const completedMissions = useMemo(() => {
    return missionStatus.completedCount;
  }, [missionStatus]);

  const totalMissions = 4; // Water Intake, Burned Calories, Nutrition, Sleep
  const canClaimReward = missionStatus.canClaimReward; // True when 3+ missions completed

  /**
   * Format health values for display in Highlights section
   * These values update reactively whenever HealthDataContext values change
   * 
   * For Water Intake:
   * - waterValue is the total water intake for today (from midnight to now)
   * - Updated in real-time when user adds water in WaterIntakeScreen
   * - This ensures consistency across WaterIntakeScreen, AllHealthDataScreen, and HomeScreen
   */
  const formattedWaterValue = useMemo(() => {
    if (waterValue === null || waterValue === undefined) return '0 L';
    // Format to 1 decimal place and display as "X.X L"
    return `${waterValue.toFixed(1)} L`;
  }, [waterValue]);

  // Use totalBurnedCalories (treadmill + cycling) instead of burnedValue (average)
  // totalBurnedCalories is a derived value shared across all screens for consistency
  // It's always a number (defaults to 0 if both treadmill and cycling are null)
  const formattedBurnedCaloriesValue = useMemo(() => {
    if (totalBurnedCalories === 0) return '0 kcal';
    // Round to nearest integer and format as "XXX kcal"
    return `${Math.round(totalBurnedCalories)} kcal`;
  }, [totalBurnedCalories]);

  const formattedNutritionValue = useMemo(() => {
    if (nutritionValue === null || nutritionValue === undefined) return '0 kcal';
    // Round to nearest integer and format as "XXXX kcal"
    return `${Math.round(nutritionValue)} kcal`;
  }, [nutritionValue]);




  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hi {username}!</Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={16} color="#FFD700" />
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.callIcon}
            onPress={() => setIsDoctorsModalVisible(true)}
          >
            <Ionicons name="call-outline" size={24} color="#1E3A5F" />
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
        
        {/* Mission Status and Unlock Message */}
        <View style={styles.missionStatusContainer}>
          {canClaimReward ? (
            <View style={styles.unlockMessage}>
              <Ionicons name="lock-open" size={20} color="#4CAF50" />
              <Text style={styles.unlockText}>
                {completedMissions}/4 missions completed — Reward unlocked!
              </Text>
            </View>
          ) : (
            <View style={styles.lockMessage}>
              <Ionicons name="lock-closed" size={20} color="#F5A623" />
              <Text style={styles.lockText}>
                Complete at least 3 missions to unlock your reward
              </Text>
            </View>
          )}
        </View>

        <View style={styles.separator} />

        {/* Highlights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <View style={styles.highlightsGrid}>
            {/* Water Intake */}
            {/* 
              Value updates automatically from HealthDataContext
              waterValue is the total water intake for today (shared across all screens)
              Updated in real-time when user adds water in WaterIntakeScreen
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
              Uses totalBurnedCalories (treadmill + cycling) which is updated in real-time
              when user calculates calories in BurnedCaloriesScreen
              This ensures consistency across all screens
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
            score={healthScore}
            description={healthScoreDescription}
          />
        </View>
      </ScrollView>
      
      {/* Floating AI Chat Button */}
      <FloatingAIButton />

      {/* Doctors List Modal */}
      <Modal
        visible={isDoctorsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDoctorsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Doctors</Text>
              <TouchableOpacity onPress={() => setIsDoctorsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1E3A5F" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.doctorsList}
            >
              {doctors.map((doctor, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.doctorCard}
                  onPress={() => handleDoctorPress(doctor)}
                >
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
                    <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>
                    <Text style={styles.doctorPhone}>{doctor.phone}</Text>
                  </View>
                  <View style={styles.arrowButton}>
                    <Ionicons name="chevron-forward" size={24} color="#A992F6" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Doctor Details Bottom Drawer */}
      <Modal
        visible={selectedDoctor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDoctor(null)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedDoctor(null)}
          />
          <View style={styles.drawerContent}>
            {selectedDoctor && (
              <>
                {/* Drawer Handle */}
                <View style={styles.drawerHandle} />

                {/* Doctor Header with Avatar */}
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerHeaderLeft}>
                    <View style={styles.drawerAvatar}>
                      <Text style={styles.drawerAvatarText}>
                        {selectedDoctor.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.drawerHeaderInfo}>
                      <Text style={styles.drawerDoctorName}>Dr. {selectedDoctor.name}</Text>
                      <Text style={styles.drawerSpecialization}>{selectedDoctor.specialization}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.drawerCloseButton}
                    onPress={() => setSelectedDoctor(null)}
                  >
                    <Ionicons name="close" size={24} color="#1E3A5F" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.drawerScrollContent}
                >
                  {/* Contact Information */}
                  <View style={styles.drawerSection}>
                    <Text style={styles.drawerSectionTitle}>Contact Information</Text>
                    <View style={styles.drawerInfoCard}>
                      <View style={styles.drawerInfoRow}>
                        <Ionicons name="call-outline" size={20} color="#A992F6" />
                        <View style={styles.drawerInfoContent}>
                          <Text style={styles.drawerInfoLabel}>Phone Number</Text>
                          <Text style={styles.drawerInfoValue}>{selectedDoctor.phone}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.drawerActionButton}
                          onPress={() => handleCall('+917020152531')}
                        >
                          <Ionicons name="call" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.drawerDivider} />

                      <View style={styles.drawerInfoRow}>
                        <Ionicons name="mail-outline" size={20} color="#A992F6" />
                        <View style={styles.drawerInfoContent}>
                          <Text style={styles.drawerInfoLabel}>Email</Text>
                          <Text style={styles.drawerInfoValue}>{selectedDoctor.email}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.drawerActionButton}
                          onPress={() => handleEmail(selectedDoctor.email)}
                        >
                          <Ionicons name="mail" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Professional Information */}
                  <View style={styles.drawerSection}>
                    <Text style={styles.drawerSectionTitle}>Professional Information</Text>
                    <View style={styles.drawerInfoCard}>
                      <View style={styles.drawerInfoRow}>
                        <Ionicons name="medical-outline" size={20} color="#A992F6" />
                        <View style={styles.drawerInfoContent}>
                          <Text style={styles.drawerInfoLabel}>Specialization</Text>
                          <Text style={styles.drawerInfoValue}>{selectedDoctor.specialization}</Text>
                        </View>
                      </View>

                      <View style={styles.drawerDivider} />

                      <View style={styles.drawerInfoRow}>
                        <Ionicons name="time-outline" size={20} color="#A992F6" />
                        <View style={styles.drawerInfoContent}>
                          <Text style={styles.drawerInfoLabel}>Experience</Text>
                          <Text style={styles.drawerInfoValue}>{selectedDoctor.experience}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Hospital Information */}
                  <View style={styles.drawerSection}>
                    <Text style={styles.drawerSectionTitle}>Hospital Information</Text>
                    <View style={styles.drawerInfoCard}>
                      <View style={styles.drawerInfoRow}>
                        <Ionicons name="business-outline" size={20} color="#A992F6" />
                        <View style={styles.drawerInfoContent}>
                          <Text style={styles.drawerInfoLabel}>Currently Practicing At</Text>
                          <Text style={styles.drawerInfoValue}>{selectedDoctor.hospital}</Text>
                        </View>
                      </View>

                      <View style={styles.drawerDivider} />

                      <View style={styles.drawerInfoRow}>
                        <Ionicons name="location-outline" size={20} color="#A992F6" />
                        <View style={styles.drawerInfoContent}>
                          <Text style={styles.drawerInfoLabel}>Hospital Address</Text>
                          <Text style={styles.drawerInfoValue}>{selectedDoctor.hospitalAddress}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Book Appointment Button */}
                  <TouchableOpacity
                    style={styles.drawerBookButton}
                    onPress={handleBookAppointment}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.drawerBookButtonText}>Book Appointment</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
    // Android-specific: Add padding top to account for status bar
    ...(Platform.OS === 'android' && {
      paddingTop: StatusBar.currentHeight || 0,
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 20, // Slightly less top padding on Android
    paddingBottom: Platform.OS === 'android' ? 120 : 100, // More bottom padding on Android for floating button
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 16, // More spacing on Android
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: Platform.OS === 'android' ? 26 : 28, // Slightly smaller on Android for better fit
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 32 : 34, // Better line height on Android
  },
  premiumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 4, // Increased for better visibility on Android
    }),
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: Platform.OS === 'android' ? 24 : 20, // More spacing on Android
  },
  missionStatusContainer: {
    marginTop: Platform.OS === 'android' ? 16 : 12, // More spacing on Android
    paddingHorizontal: 4,
  },
  unlockMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: Platform.OS === 'android' ? 14 : 12, // More padding on Android
    borderRadius: 12,
    gap: 8,
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 2,
    }),
  },
  unlockText: {
    fontSize: Platform.OS === 'android' ? 13 : 14, // Slightly smaller on Android
    fontWeight: '600',
    color: '#2E7D32',
    flex: 1,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  lockMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: Platform.OS === 'android' ? 14 : 12, // More padding on Android
    borderRadius: 12,
    gap: 8,
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 2,
    }),
  },
  lockText: {
    fontSize: Platform.OS === 'android' ? 13 : 14, // Slightly smaller on Android
    fontWeight: '600',
    color: '#E65100',
    flex: 1,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  section: {
    marginBottom: Platform.OS === 'android' ? 28 : 24, // More spacing on Android
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 16, // More spacing on Android
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 22 : 24, // Slightly smaller on Android
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 28 : 30,
  },
  allDataButton: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 10 : 8, // More padding on Android
    borderRadius: 20,
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 1,
    }),
  },
  allDataText: {
    fontSize: Platform.OS === 'android' ? 13 : 14, // Slightly smaller on Android
    color: '#1AA6A6',
    fontWeight: '600',
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // Android-specific: Add gap for better spacing
    ...(Platform.OS === 'android' && {
      gap: 0, // Use marginBottom in highlightItem instead
    }),
  },
  highlightItem: {
    width: '48%', // 2 cards per row
    marginBottom: Platform.OS === 'android' ? 20 : 16, // More spacing on Android
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  doctorsList: {
    paddingBottom: 20,
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 3, // Increased for better visibility
    }),
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  doctorPhone: {
    fontSize: 14,
    color: '#A992F6',
    fontWeight: '600',
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Doctor Details Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 12,
    paddingBottom: 20,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E8E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  drawerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  drawerHeaderInfo: {
    flex: 1,
  },
  drawerDoctorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  drawerSpecialization: {
    fontSize: 14,
    color: '#6F6F7B',
  },
  drawerCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  drawerSection: {
    marginBottom: 20,
  },
  drawerSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  drawerInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 3, // Increased for better visibility
    }),
  },
  drawerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  drawerInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  drawerInfoLabel: {
    fontSize: 12,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  drawerInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  drawerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#E8E8F0',
    marginVertical: 8,
    marginLeft: 32,
  },
  drawerBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A992F6',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  drawerBookButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default HomeScreen;

