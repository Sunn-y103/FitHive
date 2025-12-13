import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Animated,
  Share,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useChallenges, Challenge } from '../contexts/ChallengeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// APP COLOR PALETTE (exact match with rest of app)
// ============================================
const COLORS = {
  // Primary colors
  primary: '#A992F6',           // Main accent (buttons, links, avatars)
  primaryLight: '#C299F6',      // Gradient secondary
  primaryBg: '#F7F5FF',         // Light purple background for selections
  
  // Navy - used for all headings and primary text
  navy: '#1E3A5F',
  
  // Background colors
  background: '#F7F7FA',        // Main app background
  white: '#FFFFFF',
  
  // Text colors
  textPrimary: '#1E3A5F',       // Headings, titles
  textSecondary: '#6F6F7B',     // Body text, descriptions, placeholders
  
  // Border colors
  border: '#E8E8F0',            // Input borders, dividers
  borderLight: '#F0F0F0',       // Light separators
  separator: '#E0E0E0',         // Section separators
  
  // Status colors
  error: '#FF6B6B',             // Delete, logout, errors
  success: '#4CAF50',            // Success/green
  orange: '#F57C3B',            // Score badge
};

type RootStackParamList = {
  ChallengeDetails: {
    challengeId: string;
  };
};

type ChallengeDetailsRouteProp = RouteProp<RootStackParamList, 'ChallengeDetails'>;
type ChallengeDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'ChallengeDetails'>;

const ChallengeDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ChallengeDetailsNavigationProp>();
  const route = useRoute<ChallengeDetailsRouteProp>();
  const { challengeId } = route.params;
  const { challenges, joinChallenge, leaveChallenge } = useChallenges();

  // Find challenge from context
  const challenge = challenges.find((c: Challenge) => c.id === challengeId);

  // State management
  const [isJoined, setIsJoined] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  // If challenge not found, show error and go back
  useEffect(() => {
    if (!challenge) {
      Alert.alert('Error', 'Challenge not found', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [challenge, navigation]);

  if (!challenge) {
    return null;
  }

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;

  // Handle Join Challenge
  const handleJoinChallenge = () => {
    // Check if challenge is full
    if (challenge.participants >= challenge.maxParticipants) {
      Alert.alert('Challenge Full', 'This challenge has reached its maximum number of participants.');
      return;
    }

    // Start animations
    Animated.parallel([
      // Expanding circle animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Confetti fade in/out
      Animated.sequence([
        Animated.timing(confettiOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(confettiOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Checkmark scale animation
      Animated.sequence([
        Animated.delay(400),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Opacity fade
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After animation completes
      setIsJoined(true);
      joinChallenge(challengeId);
      
      // Reset animation values for next time
      setTimeout(() => {
        scaleAnim.setValue(0);
        opacityAnim.setValue(0);
        checkmarkScale.setValue(0);
        confettiOpacity.setValue(0);
      }, 2000);
    });
  };

  // Handle Share Challenge
  const handleShareChallenge = async () => {
    try {
      const shareText = `I just joined the ${challenge.title} on FitHive! Join me too! 🏋️‍♀️💪`;
      
      const result = await Share.share({
        message: shareText,
        title: challenge.title,
      });

      if (result.action === Share.sharedAction) {
        console.log('✅ Challenge shared successfully');
      }
    } catch (error) {
      console.error('❌ Error sharing challenge:', error);
      Alert.alert('Error', 'Failed to share challenge. Please try again.');
    }
  };

  // Handle End Challenge
  const handleEndChallenge = () => {
    setShowEndModal(true);
  };

  // Confirm End Challenge
  const confirmEndChallenge = () => {
    setIsJoined(false);
    leaveChallenge(challengeId);
    setShowEndModal(false);
    
    // Reset animations
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    checkmarkScale.setValue(0);
    confettiOpacity.setValue(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge Banner Image */}
        <View style={styles.bannerContainer}>
          {challenge.image ? (
            <Image
              source={{ uri: challenge.image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
              <Ionicons name="trophy" size={64} color={COLORS.primary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(30, 58, 95, 0.3)']}
            style={styles.bannerOverlay}
          />
        </View>

        {/* Challenge Title */}
        <View style={styles.titleSection}>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.dateRange}>{challenge.time}</Text>
        </View>

        {/* Participants Count */}
        <View style={styles.participantsSection}>
          <Ionicons name="people" size={20} color={COLORS.primary} />
          <Text style={styles.participantsText}>
            {challenge.participants.toLocaleString()} / {challenge.maxParticipants} challengers joined
          </Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionTitle}>About This Challenge</Text>
          <Text style={styles.descriptionText}>{challenge.description}</Text>
        </View>

        {/* Location */}
        {challenge.location && (
          <View style={styles.locationSection}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <Text style={styles.locationText}>{challenge.location}</Text>
          </View>
        )}

        {/* Challenge Rules */}
        <View style={styles.rulesSection}>
          <Text style={styles.rulesTitle}>Challenge Rules</Text>
          {challenge.rules.map((rule: string, index: number) => (
            <View key={index} style={styles.ruleItem}>
              <View style={styles.ruleBullet} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* Spacer for bottom button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Animation Overlay */}
      {!isJoined && (
        <Animated.View
          style={[
            styles.animationOverlay,
            {
              opacity: opacityAnim,
            },
          ]}
          pointerEvents="none"
        >
          {/* Expanding Circle */}
          <Animated.View
            style={[
              styles.expandingCircle,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />

          {/* Confetti Effect */}
          <Animated.View
            style={[
              styles.confettiContainer,
              {
                opacity: confettiOpacity,
              },
            ]}
          >
            {[...Array(20)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.confetti,
                  {
                    left: `${(i * 5) % 100}%`,
                    top: `${(i * 7) % 100}%`,
                    backgroundColor:
                      i % 4 === 0
                        ? COLORS.primary
                        : i % 4 === 1
                        ? COLORS.success
                        : i % 4 === 2
                        ? COLORS.orange
                        : COLORS.primaryLight,
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Checkmark */}
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{ scale: checkmarkScale }],
              },
            ]}
          >
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={48} color={COLORS.white} />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        {!isJoined ? (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinChallenge}
            activeOpacity={0.8}
            accessibilityLabel="Join challenge"
          >
            <Text style={styles.joinButtonText}>Join Challenge</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.joinedActions}>
            {/* Challenge Started Indicator */}
            <View style={styles.startedIndicator}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.startedText}>Challenge Started</Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={handleShareChallenge}
                activeOpacity={0.8}
                accessibilityLabel="Share challenge"
              >
                <Ionicons name="share-social" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Share Challenge</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.endButton]}
                onPress={handleEndChallenge}
                activeOpacity={0.8}
                accessibilityLabel="End challenge"
              >
                <Ionicons name="stop-circle" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>End Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* End Challenge Confirmation Modal */}
      <Modal
        visible={showEndModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEndModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>End Challenge?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to end this challenge?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowEndModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmEndChallenge}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Yes, End Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: Platform.OS === 'android' ? 18 : 16, // More padding on Android
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
    fontSize: Platform.OS === 'android' ? 17 : 18, // Slightly smaller on Android
    fontWeight: 'bold',
    color: COLORS.navy,
    lineHeight: Platform.OS === 'android' ? 22 : 24,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 8 : 0, // Add top padding on Android
    paddingBottom: Platform.OS === 'android' ? 130 : 120, // More bottom padding on Android
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: 250,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  titleSection: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 8,
  },
  dateRange: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  participantsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  participantsText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 8,
    fontWeight: '500',
  },
  descriptionSection: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  locationText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 8,
    fontWeight: '500',
  },
  rulesSection: {
    padding: 20,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ruleBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 12,
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 20,
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1000,
  },
  expandingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  checkmarkContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  joinButton: {
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
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  joinedActions: {
    gap: 12,
  },
  startedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  startedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 8,
  },
  shareButton: {
    backgroundColor: COLORS.primary,
  },
  endButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.error,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ChallengeDetailsScreen;