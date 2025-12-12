import React, { useState, useEffect }, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [username, setUsername] = useState('Username');
  const [isDoctorsModalVisible, setIsDoctorsModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

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
        // Get username from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name, subscription_plan')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUsername(profile.full_name || profile.username || user.email?.split('@')[0] || 'Username');
          setIsPremium(profile.subscription_plan === 'Premium');
        } else {
          setUsername(user.email?.split('@')[0] || 'Username');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUsername(user.email?.split('@')[0] || 'Username');
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
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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

