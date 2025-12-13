import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateHealthFields } from '../services/profileService';
import { RootStackParamList } from '../navigation/AppNavigator';

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

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
};

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  // Gender options
  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  // Validation
  const validateInputs = (): boolean => {
    if (!height.trim()) {
      Alert.alert('Required Field', 'Please enter your height');
      return false;
    }
    if (isNaN(Number(height)) || Number(height) <= 0 || Number(height) > 300) {
      Alert.alert('Invalid Height', 'Please enter a valid height in cm (e.g., 175)');
      return false;
    }
    if (!weight.trim()) {
      Alert.alert('Required Field', 'Please enter your weight');
      return false;
    }
    if (isNaN(Number(weight)) || Number(weight) <= 0 || Number(weight) > 500) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kg (e.g., 70)');
      return false;
    }
    if (!gender) {
      Alert.alert('Required Field', 'Please select your gender');
      return false;
    }
    if (!age.trim()) {
      Alert.alert('Required Field', 'Please enter your age');
      return false;
    }
    if (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 150) {
      Alert.alert('Invalid Age', 'Please enter a valid age');
      return false;
    }
    return true;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      // Save health fields to Supabase profile
      const { error } = await updateHealthFields({
        height: height.trim(),
        weight: weight.trim(),
        gender: gender,
        // Note: Age is not in the profile schema, but we'll save it if possible
        // For now, we'll save it as a string in a custom way or skip it
      });

      if (error) {
        console.error('❌ Error saving profile:', error);
        Alert.alert(
          'Error',
          'Failed to save your information. Please try again.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Store age separately in AsyncStorage (since it's not in profile schema)
      try {
        await AsyncStorage.setItem('user_age', age.trim());
        console.log('✅ Age saved to AsyncStorage');
      } catch (storageError) {
        console.warn('⚠️ Failed to save age to AsyncStorage:', storageError);
        // Continue anyway - age storage is not critical
      }

      console.log('✅ Profile updated successfully');
      
      // Navigate to homepage
      navigation.replace('HomeTabs');
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome to FitHive!</Text>
              <Text style={styles.subtitle}>
                Let's set up your profile to get started
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Height Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Height (cm)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="resize-outline" 
                    size={20} 
                    color={COLORS.textSecondary} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your height (e.g., 175)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Weight Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Weight (kg)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="scale-outline" 
                    size={20} 
                    color={COLORS.textSecondary} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your weight (e.g., 70)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Gender Selection */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderContainer}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.genderOption,
                        gender === option && styles.genderOptionSelected,
                      ]}
                      onPress={() => setGender(option)}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          gender === option && styles.genderOptionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Age Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Age</Text>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={COLORS.textSecondary} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your age"
                    placeholderTextColor={COLORS.textSecondary}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityLabel="Submit profile information"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    // Android-specific: Add padding top to account for status bar
    ...(Platform.OS === 'android' && {
      paddingTop: StatusBar.currentHeight || 0,
    }),
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 44 : 40, // More padding on Android
    paddingBottom: Platform.OS === 'android' ? 44 : 40, // More padding on Android
  },
  content: {
    width: '100%',
  },
  header: {
    marginBottom: Platform.OS === 'android' ? 44 : 40, // More spacing on Android
    alignItems: 'center',
  },
  title: {
    fontSize: Platform.OS === 'android' ? 30 : 32, // Slightly smaller on Android
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 36 : 38,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    marginBottom: 32,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.navy,
    padding: 0,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  genderOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginBottom: 12,
  },
  genderOptionSelected: {
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.primary,
  },
  genderOptionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  genderOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;

