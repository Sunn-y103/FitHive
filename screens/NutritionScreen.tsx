import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchProfile, updateHealthFields } from '../services/profileService';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getUserKey } from '../utils/userStorageUtils';

type NutritionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Nutrition'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// App color palette
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

// Meal types
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

interface MealCalories {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
}

const NutritionScreen: React.FC = () => {
  const navigation = useNavigation<NutritionScreenNavigationProp>();
  const [meals, setMeals] = useState<MealCalories>({
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
  });
  const [errors, setErrors] = useState<Partial<MealCalories>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved calories and goal
  useEffect(() => {
    loadCalories();
    loadCalorieGoal();
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const loadCalories = async () => {
    try {
      // Try to load from AsyncStorage first (user-specific)
      // Get user ID from auth context
      const { data: { user } } = await supabase.auth.getUser();
      const nutritionKey = getUserKey('daily_calories', user?.id);
      const saved = await AsyncStorage.getItem(nutritionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMeals(parsed);
      }

      // Also check if user is authenticated
      const profile = await fetchProfile();
      if (profile) {
        setIsAuthenticated(true);
        // TODO: If you have a calories field in profile, load it here
        // const profileCalories = profile.calories;
        // if (profileCalories) setMeals(profileCalories);
      }
    } catch (error) {
      console.error('❌ Error loading calories:', error);
    }
  };

  const loadCalorieGoal = async () => {
    try {
      const profile = await fetchProfile();
      // TODO: If you have a daily_calorie_goal field in profile, load it here
      // For now, we'll use a default or calculate based on weight
      if (profile?.weight) {
        const weight = parseFloat(profile.weight);
        if (weight > 0) {
          // Rough estimate: 25-30 kcal per kg for maintenance
          // Using 27.5 as average
          const estimatedGoal = Math.round(weight * 27.5);
          setDailyCalorieGoal(estimatedGoal);
        }
      }
    } catch (error) {
      console.error('❌ Error loading calorie goal:', error);
    }
  };

  // Validate input
  const validateInput = (value: string): boolean => {
    if (!value.trim()) return true; // Empty is valid (will be cleared)
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0;
  };

  // Handle input change
  const handleInputChange = (mealType: MealType, value: string) => {
    // Remove non-numeric characters except empty string
    const cleaned = value.replace(/[^0-9]/g, '');
    
    setMeals(prev => ({ ...prev, [mealType]: cleaned }));
    
    // Clear error for this field
    if (errors[mealType]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[mealType];
        return newErrors;
      });
    }

    // Auto-save after a short delay
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveCalories();
    }, 1000);
  };

  // Handle input blur
  const handleInputBlur = (mealType: MealType) => {
    const value = meals[mealType];
    
    if (value && !validateInput(value)) {
      setErrors(prev => ({
        ...prev,
        [mealType]: 'Enter a valid calorie amount',
      }));
    } else {
      // Save on blur
      saveCalories();
    }
  };

  // Save calories
  const saveCalories = async () => {
    try {
      setSaving(true);
      
      // Save to AsyncStorage (user-specific)
      const { data: { user } } = await supabase.auth.getUser();
      const nutritionKey = getUserKey('daily_calories', user?.id);
      await AsyncStorage.setItem(nutritionKey, JSON.stringify(meals));
      
      // TODO: If you have a backend API, save to user profile here:
      // const profile = await fetchProfile();
      // if (profile) {
      //   await updateHealthFields({ calories: meals });
      //   // Or use your user update endpoint: PATCH /users/{id}
      // }

      setSaveMessage('Calories saved');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('❌ Error saving calories:', error);
      setSaveMessage('Could not save — retry');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Calculate total calories
  const calculateTotal = (): number => {
    return Object.values(meals).reduce((sum, val) => {
      const num = parseInt(val, 10) || 0;
      return sum + num;
    }, 0);
  };

  // Calculate remaining calories
  const calculateRemaining = (): number | null => {
    if (!dailyCalorieGoal) return null;
    return Math.max(0, dailyCalorieGoal - calculateTotal());
  };


  const totalCalories = calculateTotal();
  const remainingCalories = calculateRemaining();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Save Message Toast */}
        {saveMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{saveMessage}</Text>
          </View>
        )}

        {/* Helper Text for Unauthenticated Users */}
        {!isAuthenticated && (
          <View style={styles.helperContainer}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.helperText}>Sign in to sync your data</Text>
          </View>
        )}

        {/* Calorie Inputs Section */}
        <View style={styles.inputsCard}>
          <Text style={styles.sectionTitle}>Daily Calories</Text>
          
          {/* Breakfast */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Breakfast</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.breakfast && styles.inputError]}
                placeholder="Calories (kcal)"
                placeholderTextColor={COLORS.textSecondary}
                value={meals.breakfast}
                onChangeText={(value) => handleInputChange('breakfast', value)}
                onBlur={() => handleInputBlur('breakfast')}
                keyboardType="number-pad"
                accessibilityLabel="Breakfast calories input"
                accessibilityHint="Enter calories consumed for breakfast"
              />
              {errors.breakfast && (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {errors.breakfast}
                </Text>
              )}
            </View>
          </View>

          {/* Lunch */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Lunch</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.lunch && styles.inputError]}
                placeholder="Calories (kcal)"
                placeholderTextColor={COLORS.textSecondary}
                value={meals.lunch}
                onChangeText={(value) => handleInputChange('lunch', value)}
                onBlur={() => handleInputBlur('lunch')}
                keyboardType="number-pad"
                accessibilityLabel="Lunch calories input"
                accessibilityHint="Enter calories consumed for lunch"
              />
              {errors.lunch && (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {errors.lunch}
                </Text>
              )}
            </View>
          </View>

          {/* Dinner */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Dinner</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.dinner && styles.inputError]}
                placeholder="Calories (kcal)"
                placeholderTextColor={COLORS.textSecondary}
                value={meals.dinner}
                onChangeText={(value) => handleInputChange('dinner', value)}
                onBlur={() => handleInputBlur('dinner')}
                keyboardType="number-pad"
                accessibilityLabel="Dinner calories input"
                accessibilityHint="Enter calories consumed for dinner"
              />
              {errors.dinner && (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {errors.dinner}
                </Text>
              )}
            </View>
          </View>

          {/* Snacks */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Snacks</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.snacks && styles.inputError]}
                placeholder="Calories (kcal)"
                placeholderTextColor={COLORS.textSecondary}
                value={meals.snacks}
                onChangeText={(value) => handleInputChange('snacks', value)}
                onBlur={() => handleInputBlur('snacks')}
                keyboardType="number-pad"
                accessibilityLabel="Snacks calories input"
                accessibilityHint="Enter calories consumed for snacks"
              />
              {errors.snacks && (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {errors.snacks}
                </Text>
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveCalories}
            disabled={saving}
            accessibilityLabel="Save calories"
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Section */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total today:</Text>
            <Text style={styles.summaryValue} accessibilityLabel={`Total calories today: ${totalCalories} kilocalories`}>
              {totalCalories} kcal
            </Text>
          </View>
          {remainingCalories !== null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining:</Text>
              <Text
                style={[styles.summaryValue, remainingCalories < 0 && styles.summaryValueOver]}
                accessibilityLabel={`Remaining calories: ${remainingCalories} kilocalories`}
              >
                {remainingCalories} kcal
              </Text>
            </View>
          )}
        </View>

        {/* ADDED: Daily Goal container - Fixed at the bottom of Nutrition screen */}
        {/* This Goal container is STATIC (unchangeable by user) and stays at the bottom */}
        {/* The container is non-interactive (pointerEvents: 'none') to prevent any user editing */}
        <View style={styles.dailyGoalContainer}>
          <Text style={styles.dailyGoalLabel}>Daily Goal: 2200 kcal</Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  toastContainer: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  toastText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  inputsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 20,
  },
  inputRow: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.navy,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryValueOver: {
    color: COLORS.error,
  },
  // ADDED: Daily Goal container styles
  // This container is STATIC and uneditable - it displays the daily nutrition goal
  // It stays fixed at the bottom of the Nutrition screen
  // The container is non-interactive (pointerEvents: 'none') to prevent any user editing
  dailyGoalContainer: {
    backgroundColor: '#E8F4F8',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D0E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    // Make it non-interactive (no touch events) - user cannot edit or interact with this
    pointerEvents: 'none',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  dailyGoalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1AA6A6',
    letterSpacing: 0.3,
  },
});

export default NutritionScreen;

