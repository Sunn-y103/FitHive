import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useChallenges } from '../contexts/ChallengeContext';

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
};

type RootStackParamList = {
  HomeTabs: undefined;
  CreateChallenge: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const CreateChallengeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { addChallenge } = useChallenges();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);

  // Handle image picker
  const handlePickImage = async () => {
    try {
      setPickingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        console.log('📷 Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a challenge title.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a challenge description.');
      return;
    }

    // Parse rules from multi-line text
    const rules = rulesText
      .split('\n')
      .map(rule => rule.trim())
      .filter(rule => rule.length > 0);

    if (rules.length === 0) {
      Alert.alert('Required Field', 'Please add at least one challenge rule.');
      return;
    }

    // Create challenge in context
    addChallenge({
      title: title.trim(),
      description: description.trim(),
      rules: rules,
      maxParticipants: maxParticipants,
      location: location.trim() || 'Not specified',
      time: time.trim() || 'TBD',
      image: selectedImage,
    });

    Alert.alert('Success', 'Challenge created successfully!', [
      {
        text: 'OK',
        onPress: () => {
          // Reset form
          setTitle('');
          setDescription('');
          setRulesText('');
          setLocation('');
          setTime('');
          setMaxParticipants(100);
          setSelectedImage(null);
          // Navigate back
          navigation.goBack();
        },
      },
    ]);
  };

  const isFormValid = title.trim().length > 0 && description.trim().length > 0 && rulesText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
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

        {/* Challenge Rules */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Challenge Rules <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hintText}>Enter each rule on a new line</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Rule 1&#10;Rule 2&#10;Rule 3"
            placeholderTextColor={COLORS.textSecondary}
            value={rulesText}
            onChangeText={setRulesText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Max Participants */}
        <View style={styles.section}>
          <Text style={styles.label}>Max Participants</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>{maxParticipants}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={500}
              value={maxParticipants}
              onValueChange={setMaxParticipants}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
              step={1}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1</Text>
              <Text style={styles.sliderLabel}>500</Text>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter location"
            placeholderTextColor={COLORS.textSecondary}
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter time (e.g., Jan 14 - Feb 14)"
            placeholderTextColor={COLORS.textSecondary}
            value={time}
            onChangeText={setTime}
            maxLength={100}
          />
        </View>

        {/* Challenge Banner Image */}
        <View style={styles.section}>
          <Text style={styles.label}>Challenge Banner Image</Text>
          {selectedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
                accessibilityLabel="Remove image"
              >
                <Ionicons name="close-circle" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadImageButton}
              onPress={handlePickImage}
              disabled={pickingImage}
              activeOpacity={0.7}
            >
              {pickingImage ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.uploadImageText}>Upload Image</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid || pickingImage) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || pickingImage}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Create Challenge</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 18,
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
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  hintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.navy,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 20,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  uploadImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 20,
    gap: 8,
    marginTop: 8,
  },
  uploadImageText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
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
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default CreateChallengeScreen;