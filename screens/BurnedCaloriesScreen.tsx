import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchProfile } from '../services/profileService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePersistentState } from '../hooks/usePersistentState';

type BurnedCaloriesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BurnedCalories'>;

// Calorie entry interface for storage
interface CalorieEntry {
  id: string;
  type: 'treadmill' | 'cycling' | 'burn' | 'other';
  calories: number;
  timestamp: string; // ISO string
}

// App color palette (matching the rest of the app)
const COLORS = {
  primary: '#A992F6',
  primaryLight: '#C299F6',
  primaryBg: '#F7F5FF',
  navy: '#1E3A5F',
  background: '#F7F7FA',
  white: '#FFFFFF',
  textPrimary: '#1E3A5F',
  textSecondary: '#6F6F7B',
  border: '#E8E8F0',
  borderLight: '#F0F0F0',
  error: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FF9800',
};

const BurnedCaloriesScreen: React.FC = () => {
  const navigation = useNavigation<BurnedCaloriesScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState<number | null>(null);

  // Treadmill inputs
  const [treadmillSpeed, setTreadmillSpeed] = useState('');
  const [treadmillTime, setTreadmillTime] = useState('');
  const [treadmillCalories, setTreadmillCalories] = useState<number | null>(null);

  // Cycling inputs
  const [cyclingSpeed, setCyclingSpeed] = useState('');
  const [cyclingTime, setCyclingTime] = useState('');
  const [cyclingCalories, setCyclingCalories] = useState<number | null>(null);

  // Load and save calorie entries
  const [calorieEntries, setCalorieEntries] = usePersistentState<CalorieEntry[]>('burned_calories_entries', []);

  // Load user weight from profile
  useEffect(() => {
    loadUserWeight();
  }, []);

  const loadUserWeight = async () => {
    try {
      setLoading(true);
      const profile = await fetchProfile();
      if (profile?.weight) {
        const weightNum = parseFloat(profile.weight);
        if (weightNum > 0) {
          setWeight(weightNum);
        } else {
          Alert.alert(
            'Weight Not Found',
            'Please add your weight in the Profile section to calculate burned calories.',
            [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]
          );
        }
      } else {
        Alert.alert(
          'Weight Not Found',
          'Please add your weight in the Profile section to calculate burned calories.',
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error loading weight:', error);
      Alert.alert('Error', 'Failed to load your weight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Treadmill calories
  // Formula: Calories = 0.1 × speed(km/h) × weight(kg) × time(hours)
  const calculateTreadmill = async () => {
    if (!weight) {
      Alert.alert('Error', 'Weight is required. Please add your weight in Profile.');
      return;
    }

    const speed = parseFloat(treadmillSpeed);
    const timeMinutes = parseFloat(treadmillTime);

    if (isNaN(speed) || speed <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid speed (km/h).');
      return;
    }

    if (isNaN(timeMinutes) || timeMinutes <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid time (minutes).');
      return;
    }

    // Convert time from minutes to hours
    const timeHours = timeMinutes / 60;

    // Calculate calories
    const calories = 0.1 * speed * weight * timeHours;
    const roundedCalories = Math.round(calories * 100) / 100; // Round to 2 decimals
    setTreadmillCalories(roundedCalories);

    // Save to storage
    const newEntry: CalorieEntry = {
      id: `treadmill-${Date.now()}`,
      type: 'treadmill',
      calories: roundedCalories,
      timestamp: new Date().toISOString(),
    };
    await setCalorieEntries((prev) => {
      const updated = [newEntry, ...prev];
      console.log(`💾 Saving treadmill entry: ${roundedCalories} kcal, total entries: ${updated.length}`);
      return updated;
    });
  };

  // Calculate Cycling calories
  // Formula: Calories = 0.2 × speed(km/h) × weight(kg) × time(hours)
  const calculateCycling = async () => {
    if (!weight) {
      Alert.alert('Error', 'Weight is required. Please add your weight in Profile.');
      return;
    }

    const speed = parseFloat(cyclingSpeed);
    const timeMinutes = parseFloat(cyclingTime);

    if (isNaN(speed) || speed <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid speed (km/h).');
      return;
    }

    if (isNaN(timeMinutes) || timeMinutes <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid time (minutes).');
      return;
    }

    // Convert time from minutes to hours
    const timeHours = timeMinutes / 60;

    // Calculate calories
    const calories = 0.2 * speed * weight * timeHours;
    const roundedCalories = Math.round(calories * 100) / 100; // Round to 2 decimals
    setCyclingCalories(roundedCalories);

    // Save to storage
    const newEntry: CalorieEntry = {
      id: `cycling-${Date.now()}`,
      type: 'cycling',
      calories: roundedCalories,
      timestamp: new Date().toISOString(),
    };
    await setCalorieEntries((prev) => {
      const updated = [newEntry, ...prev];
      console.log(`💾 Saving cycling entry: ${roundedCalories} kcal, total entries: ${updated.length}`);
      return updated;
    });
  };

  // Calculate total burned calories
  const totalCalories = (treadmillCalories || 0) + (cyclingCalories || 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Burned Calories</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!weight) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Burned Calories</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Weight Not Found</Text>
          <Text style={styles.errorSubtext}>
            Please add your weight in the Profile section to calculate burned calories.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Burned Calories</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Info */}
        <View style={styles.weightInfo}>
          <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.weightText}>Your Weight: {weight} kg</Text>
        </View>

        {/* Treadmill Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="walk-outline" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Treadmill</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Speed (km/h)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter speed"
              placeholderTextColor={COLORS.textSecondary}
              value={treadmillSpeed}
              onChangeText={setTreadmillSpeed}
              keyboardType="numeric"
              accessibilityLabel="Treadmill speed input in kilometers per hour"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter time"
              placeholderTextColor={COLORS.textSecondary}
              value={treadmillTime}
              onChangeText={setTreadmillTime}
              keyboardType="numeric"
              accessibilityLabel="Treadmill time input in minutes"
            />
          </View>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculateTreadmill}
            accessibilityLabel="Calculate treadmill calories"
          >
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>

          {treadmillCalories !== null && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Burned Calories:</Text>
              <Text style={styles.resultValue}>{treadmillCalories} kcal</Text>
            </View>
          )}
        </View>

        {/* Cycling Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bicycle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Cycling</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Speed (km/h)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter speed"
              placeholderTextColor={COLORS.textSecondary}
              value={cyclingSpeed}
              onChangeText={setCyclingSpeed}
              keyboardType="numeric"
              accessibilityLabel="Cycling speed input in kilometers per hour"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter time"
              placeholderTextColor={COLORS.textSecondary}
              value={cyclingTime}
              onChangeText={setCyclingTime}
              keyboardType="numeric"
              accessibilityLabel="Cycling time input in minutes"
            />
          </View>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculateCycling}
            accessibilityLabel="Calculate cycling calories"
          >
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>

          {cyclingCalories !== null && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Burned Calories:</Text>
              <Text style={styles.resultValue}>{cyclingCalories} kcal</Text>
            </View>
          )}
        </View>

        {/* Total Calories */}
        {totalCalories > 0 && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Burned Calories</Text>
            <Text style={styles.totalValue}>{totalCalories.toFixed(2)} kcal</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
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
    color: COLORS.navy,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.error,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  weightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  weightText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 8,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.primaryBg,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  totalContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default BurnedCaloriesScreen;

