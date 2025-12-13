/**
 * Create Challenge Screen
 * 
 * UI-only screen for creating challenges (frontend-only, no backend).
 * Used for demo and hackathon purposes.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { setPendingChallenge, ChallengeData } from '../utils/challengeStore';

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

type RootStackParamList = {
  CreateChallenge: undefined;
  Community: undefined;
};

type CreateChallengeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateChallenge'>;

const CreateChallengeScreen: React.FC = () => {
  const navigation = useNavigation<CreateChallengeScreenNavigationProp>();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [location, setLocation] = useState('');

  // Validate form - all fields must be filled
  const isFormValid = 
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    numberOfPeople.trim().length > 0 &&
    location.trim().length > 0;

  // Handle participate button press
  const handleParticipate = () => {
    // Validate all fields
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a challenge title.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a challenge description.');
      return;
    }

    if (!numberOfPeople.trim() || isNaN(Number(numberOfPeople)) || Number(numberOfPeople) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of people.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Required Field', 'Please enter a location.');
      return;
    }

    // Default challenge image (using one of the featured challenge images)
    const defaultChallengeImages = [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
      'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&q=80',
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
    ];
    // Randomly select an image from the default set
    const randomImage = defaultChallengeImages[Math.floor(Math.random() * defaultChallengeImages.length)];

    // Create challenge object
    const newChallenge: ChallengeData = {
      id: `challenge-${Date.now()}`, // Generate unique ID
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(), // Current timestamp
      numberOfPeople: Number(numberOfPeople) || 0, // Store number of people
      location: location.trim() || 'Not specified', // Store location
      image: randomImage, // Assign default featured challenge image
    };

    // Store challenge in in-memory store to be picked up by CommunityScreen
    setPendingChallenge(newChallenge);

    // Show success alert
    Alert.alert(
      'Success!',
      `Challenge "${title}" created successfully!`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setTitle('');
            setDescription('');
            setNumberOfPeople('');
            setLocation('');
            // Navigate back - CommunityScreen will pick up the challenge via useFocusEffect
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Challenge</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Challenge Title */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Challenge Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter challenge title"
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Short Description */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Short Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the challenge..."
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Number of People */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Number of People <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter number of people"
              placeholderTextColor={COLORS.textSecondary}
              value={numberOfPeople}
              onChangeText={setNumberOfPeople}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Location <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter location"
              placeholderTextColor={COLORS.textSecondary}
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
          </View>

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Participate Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.participateButton,
              !isFormValid && styles.participateButtonDisabled,
            ]}
            onPress={handleParticipate}
            disabled={!isFormValid}
            activeOpacity={0.8}
          >
            <Text style={styles.participateButtonText}>Participate</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 18 : 16,
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
    fontSize: Platform.OS === 'android' ? 20 : 22,
    fontWeight: 'bold',
    color: COLORS.navy,
    lineHeight: Platform.OS === 'android' ? 26 : 28,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'android' ? 22 : 20,
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  section: {
    marginBottom: Platform.OS === 'android' ? 24 : 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: Platform.OS === 'android' ? 20 : 18,
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 3,
    }),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 12,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 14 : 12,
    fontSize: 15,
    color: COLORS.navy,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  bottomSpacer: {
    height: 20,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 30 : 28,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  participateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: Platform.OS === 'android' ? 18 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  participateButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  participateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default CreateChallengeScreen;
