import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Modal,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useHealthData } from '../contexts/HealthDataContext';
import { getUserHealthSnapshot, UserHealthSnapshot } from '../utils/userHealthSnapshot';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Coach interface
export interface Coach {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  rating: number;
  image: string;
  price?: number; // Price per session in rupees
  duration?: number; // Session duration in minutes
  certifications?: string[]; // Array of certifications
  about?: string; // Detailed about text
}

type CoachScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeTabs'>;

// Static coach data
const COACHES: Coach[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    specialization: 'Weight Loss',
    experience: 8,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80',
    price: 499,
    duration: 45,
    certifications: ['Certified Personal Trainer', 'Nutrition Specialist', 'Weight Management Expert'],
    about: 'Sarah is a dedicated fitness professional with 8 years of experience helping clients achieve their weight loss goals. She specializes in creating personalized nutrition and workout plans that fit your lifestyle. Her holistic approach focuses on sustainable habits and long-term results.',
  },
  {
    id: '2',
    name: 'Michael Chen',
    specialization: 'Muscle Gain',
    experience: 12,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    price: 599,
    duration: 60,
    certifications: ['Certified Strength Coach', 'Bodybuilding Specialist', 'Sports Nutrition'],
    about: 'Michael is an expert in strength training and muscle development with over 12 years of experience. He has helped hundreds of clients build lean muscle mass through scientifically-backed training methods and proper nutrition guidance.',
  },
  {
    id: '3',
    name: 'Emma Williams',
    specialization: 'Yoga',
    experience: 6,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    price: 399,
    duration: 60,
    certifications: ['Yoga Alliance Certified', 'Meditation Instructor', 'Pilates Certified'],
    about: 'Emma brings a mindful approach to fitness through yoga and meditation. With 6 years of teaching experience, she helps clients improve flexibility, reduce stress, and achieve mental clarity through ancient practices adapted for modern life.',
  },
  {
    id: '4',
    name: 'David Martinez',
    specialization: 'Cardio',
    experience: 10,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    price: 449,
    duration: 45,
    certifications: ['Cardio Fitness Specialist', 'Running Coach', 'HIIT Certified'],
    about: 'David is a passionate cardio fitness coach with 10 years of experience. He specializes in high-intensity interval training (HIIT) and endurance training, helping clients improve cardiovascular health and build stamina.',
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    specialization: 'Weight Loss',
    experience: 7,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    price: 499,
    duration: 45,
    certifications: ['Certified Personal Trainer', 'Weight Loss Specialist', 'Behavioral Change Coach'],
    about: 'Lisa combines fitness expertise with behavioral psychology to help clients overcome weight loss challenges. With 7 years of experience, she creates supportive environments where clients can achieve sustainable lifestyle changes.',
  },
  {
    id: '6',
    name: 'James Wilson',
    specialization: 'Muscle Gain',
    experience: 9,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    price: 599,
    duration: 60,
    certifications: ['Certified Personal Trainer', 'Powerlifting Coach', 'Nutrition Specialist'],
    about: 'James is a results-driven fitness coach specializing in muscle building and strength training. With 9 years of experience, he uses progressive overload principles and personalized nutrition plans to help clients achieve their physique goals.',
  },
];

interface AIRecommendation {
  id: string;
  text: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
}

const CoachScreen: React.FC = () => {
  const navigation = useNavigation<CoachScreenNavigationProp>();
  const healthData = useHealthData();
  const insets = useSafeAreaInsets();
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [displayedMessages, setDisplayedMessages] = useState<AIRecommendation[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const typingDot1Anim = useRef(new Animated.Value(0.4)).current;
  const typingDot2Anim = useRef(new Animated.Value(0.4)).current;
  const typingDot3Anim = useRef(new Animated.Value(0.4)).current;

  // Calculate bottom padding for ScrollView to account for floating AI button
  // Floating button: 60px height + 100px from bottom + 20px margin + safe area bottom
  const FLOATING_BUTTON_HEIGHT = 60;
  const FLOATING_BUTTON_BOTTOM = 100;
  const EXTRA_SPACING = 20;
  const scrollViewBottomPadding = FLOATING_BUTTON_HEIGHT + FLOATING_BUTTON_BOTTOM + EXTRA_SPACING + insets.bottom;

  // Animate typing dots
  useEffect(() => {
    if (isLoadingRecommendations || displayedMessages.length < aiSuggestions.length) {
      const animateDots = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(typingDot1Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot2Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot3Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(typingDot1Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot2Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot3Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(typingDot1Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot2Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot3Anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(typingDot1Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot2Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(typingDot3Anim, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          if (isLoadingRecommendations || displayedMessages.length < aiSuggestions.length) {
            animateDots();
          }
        });
      };
      animateDots();
    } else {
      typingDot1Anim.setValue(0.4);
      typingDot2Anim.setValue(0.4);
      typingDot3Anim.setValue(0.4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingRecommendations, displayedMessages.length, aiSuggestions.length]);

  const handleViewProfile = (coach: Coach) => {
    navigation.navigate('CoachProfile', { coach });
  };

  /**
   * Generate AI-like personalized health recommendations based on user health data
   * Uses simple conditional rules (if-else logic) - fully frontend-only
   */
  const generateAIRecommendations = async (): Promise<AIRecommendation[]> => {
    setIsLoadingRecommendations(true);
    
    try {
      // Get user health snapshot
      const snapshot = await getUserHealthSnapshot({
        totalBurnedCalories: healthData.totalBurnedCalories,
        nutritionValue: healthData.nutritionValue,
      });

      const recommendations: AIRecommendation[] = [];

      // Rule 1: Water Intake Recommendations
      const recommendedWater = snapshot.weight ? snapshot.weight * 0.033 : 2.5; // 33ml per kg body weight
      const actualWater = healthData.waterValue || 0;
      if (actualWater < recommendedWater) {
        const deficit = recommendedWater - actualWater;
        const glasses = Math.ceil((deficit * 1000) / 250); // Approximate glasses (250ml each)
        recommendations.push({
          id: 'water-1',
          text: `💧 You're slightly behind on water intake today. Try drinking ${glasses} more ${glasses === 1 ? 'glass' : 'glasses'} to stay hydrated!`,
          icon: 'water',
          priority: 'high',
        });
      } else if (actualWater >= recommendedWater) {
        recommendations.push({
          id: 'water-2',
          text: `💧 Awesome! You're meeting your daily water goal. Keep it up!`,
          icon: 'checkmark-circle',
          priority: 'low',
        });
      }

      // Rule 2: Sleep Recommendations
      if (snapshot.sleepHours !== null) {
        if (snapshot.sleepHours < 6) {
          recommendations.push({
            id: 'sleep-1',
            text: `😴 Sleep duration looks low. Aim for at least 7 hours tonight for better recovery and energy tomorrow!`,
            icon: 'moon',
            priority: 'high',
          });
        } else if (snapshot.sleepHours < 7) {
          recommendations.push({
            id: 'sleep-2',
            text: `😴 You're close! Try to get 7-8 hours of sleep tonight for optimal recovery.`,
            icon: 'moon',
            priority: 'medium',
          });
        } else if (snapshot.sleepHours >= 7 && snapshot.sleepHours <= 9) {
          recommendations.push({
            id: 'sleep-3',
            text: `😴 Perfect! Your sleep duration is in the ideal range. Keep it up!`,
            icon: 'checkmark-circle',
            priority: 'low',
          });
        } else if (snapshot.sleepHours > 9) {
          recommendations.push({
            id: 'sleep-4',
            text: `☀️ You're getting plenty of rest! A morning workout could boost your energy even more.`,
            icon: 'sunny',
            priority: 'low',
          });
        }
      } else {
        recommendations.push({
          id: 'sleep-5',
          text: `😴 Track your sleep to get personalized recommendations for better recovery!`,
          icon: 'moon',
          priority: 'medium',
        });
      }

      // Rule 3: Workout/Burned Calories Recommendations
      const dailyCalorieGoal = 300; // kcal
      if (snapshot.burnedCalories < dailyCalorieGoal * 0.5) {
        recommendations.push({
          id: 'workout-1',
          text: `💪 A short workout today can boost your energy levels and help you reach your goals!`,
          icon: 'fitness',
          priority: 'high',
        });
      } else if (snapshot.burnedCalories < dailyCalorieGoal) {
        recommendations.push({
          id: 'workout-2',
          text: `🏃 Great job on activity! A light stretch session or short walk is recommended.`,
          icon: 'fitness',
          priority: 'medium',
        });
      } else {
        recommendations.push({
          id: 'workout-3',
          text: `🔥 Excellent! You've exceeded your daily calorie burn goal. Keep up the amazing work!`,
          icon: 'flame',
          priority: 'low',
        });
      }

      // Rule 4: BMI-Based Recommendations
      if (snapshot.bmi !== null) {
        if (snapshot.bmi < 18.5) {
          recommendations.push({
            id: 'bmi-1',
            text: `🏋️‍♀️ Your BMI suggests focusing on strength training and balanced nutrition for optimal health.`,
            icon: 'barbell',
            priority: 'medium',
          });
        } else if (snapshot.bmi >= 18.5 && snapshot.bmi <= 24.9) {
          recommendations.push({
            id: 'bmi-2',
            text: `📊 Your BMI is in the healthy range! Keep maintaining your current fitness routine.`,
            icon: 'checkmark-circle',
            priority: 'low',
          });
        } else if (snapshot.bmi >= 25 && snapshot.bmi <= 29.9) {
          recommendations.push({
            id: 'bmi-3',
            text: `🏃 Consider light cardio and mindful calorie control to maintain a healthy weight.`,
            icon: 'walk',
            priority: 'high',
          });
        } else if (snapshot.bmi >= 30) {
          recommendations.push({
            id: 'bmi-4',
            text: `🏋️‍♀️ Focus on regular cardio, strength training, and balanced nutrition for optimal health.`,
            icon: 'fitness',
            priority: 'high',
          });
        }
      } else {
        recommendations.push({
          id: 'bmi-5',
          text: `📏 Add your height and weight to get personalized BMI-based recommendations!`,
          icon: 'body',
          priority: 'medium',
        });
      }

      // Rule 5: Nutrition Recommendations
      const idealCalories = 2200; // kcal
      if (snapshot.nutritionSummary !== null) {
        const calorieDiff = Math.abs(snapshot.nutritionSummary - idealCalories);
        if (calorieDiff > 500) {
          if (snapshot.nutritionSummary < idealCalories) {
            recommendations.push({
              id: 'nutrition-1',
              text: `🥗 Your calorie intake is a bit low. Make sure you're eating enough to fuel your workouts!`,
              icon: 'restaurant',
              priority: 'medium',
            });
          } else {
            recommendations.push({
              id: 'nutrition-2',
              text: `🥗 Consider portion control and nutrient-dense foods to balance your calorie intake.`,
              icon: 'restaurant',
              priority: 'medium',
            });
          }
        } else if (calorieDiff <= 200) {
          recommendations.push({
            id: 'nutrition-3',
            text: `🎯 Perfect! Your nutrition is well-balanced. Keep up the great eating habits!`,
            icon: 'checkmark-circle',
            priority: 'low',
          });
        }
      } else {
        recommendations.push({
          id: 'nutrition-4',
          text: `🍎 Track your daily nutrition to get personalized meal recommendations!`,
          icon: 'restaurant',
          priority: 'medium',
        });
      }

      // Rule 6: Overall Activity Balance
      if (snapshot.burnedCalories > 0 && snapshot.nutritionSummary !== null) {
        const balance = snapshot.burnedCalories / snapshot.nutritionSummary;
        if (balance < 0.1) {
          recommendations.push({
            id: 'balance-1',
            text: `⚖️ Increase your daily activity to create a better calorie balance.`,
            icon: 'trending-up',
            priority: 'medium',
          });
        } else if (balance > 0.3) {
          recommendations.push({
            id: 'balance-2',
            text: `🥗 You're very active! Make sure to fuel your body with adequate nutrition.`,
            icon: 'restaurant',
            priority: 'medium',
          });
        }
      }

      // Sort recommendations by priority (high -> medium -> low)
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      // Limit to top 5-6 recommendations for better UX
      return recommendations.slice(0, 6);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return [
        {
          id: 'error-1',
          text: 'Unable to generate recommendations at the moment. Please try again later.',
          icon: 'alert-circle',
          priority: 'medium',
        },
      ];
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleOpenAIAssistant = async () => {
    setIsAIModalVisible(true);
    setDisplayedMessages([]);
    setIsLoadingRecommendations(true);
    
    // Animate modal slide up
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Generate recommendations when modal opens
    const recommendations = await generateAIRecommendations();
    setAiSuggestions(recommendations);

    // Simulate typing/loading effect - display messages one by one
    if (recommendations.length > 0) {
      // Start displaying messages after a short delay
      setTimeout(() => {
        recommendations.forEach((rec, index) => {
          setTimeout(() => {
            setDisplayedMessages(prev => [...prev, rec]);
            // Auto-scroll to bottom when new message appears
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }, (index + 1) * 800); // 800ms delay between each message
        });
      }, 500); // Small delay before starting to show messages
    }
  };

  const handleCloseAIAssistant = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsAIModalVisible(false);
      // Clear recommendations when modal closes
      setAiSuggestions([]);
      setDisplayedMessages([]);
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />
      );
    }

    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Personal Fitness Coaches</Text>
      </View>

      {/* Coach List */}
      {COACHES.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollViewBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {COACHES.map((coach) => (
            <View key={coach.id} style={styles.coachCard}>
              {/* Left: Profile Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: coach.image }}
                  style={styles.coachImage}
                  resizeMode="cover"
                />
              </View>

              {/* Right: Coach Info */}
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{coach.name}</Text>
                <Text style={styles.specialization}>{coach.specialization}</Text>
                <Text style={styles.experience}>
                  {coach.experience}+ years experience
                </Text>
                <View style={styles.ratingContainer}>
                  {renderStars(coach.rating)}
                  <Text style={styles.ratingText}>{coach.rating}</Text>
                </View>
              </View>

              {/* View Profile Button */}
              <TouchableOpacity
                style={styles.viewProfileButton}
                onPress={() => handleViewProfile(coach)}
                activeOpacity={0.8}
              >
                <Text style={styles.viewProfileButtonText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={64} color="#C0C0C0" />
          <Text style={styles.emptyStateText}>
            No coaches available at the moment.
          </Text>
        </View>
      )}

      {/* Floating AI Assistant Button */}
      <TouchableOpacity
        style={styles.floatingAIButton}
        onPress={handleOpenAIAssistant}
        activeOpacity={0.8}
        accessibilityLabel="Open AI Personal Health Assistant"
        accessibilityHint="Opens the AI Personal Health Assistant"
      >
        <Ionicons name="sparkles" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* AI Personal Health Assistant Modal */}
      <Modal
        visible={isAIModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseAIAssistant}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseAIAssistant}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_HEIGHT * 0.55, 0], // Slide up from 55% of screen
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalHeaderTitleContainer}>
                  <Ionicons name="sparkles" size={24} color="#A992F6" />
                  <View style={styles.modalHeaderTextContainer}>
                    <Text style={styles.modalTitle}>AI Personal Health Assistant</Text>
                    <Text style={styles.modalSubtitle}>Based on your daily health data</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleCloseAIAssistant}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#1E3A5F" />
              </TouchableOpacity>
            </View>

            {/* Modal Content - Chat Style */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingRecommendations ? (
                <View style={styles.typingIndicatorContainer}>
                  <View style={styles.typingBubble}>
                    <View style={styles.typingDots}>
                      <Animated.View
                        style={[
                          styles.typingDot,
                          {
                            opacity: typingDot1Anim,
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.typingDot,
                          {
                            opacity: typingDot2Anim,
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.typingDot,
                          {
                            opacity: typingDot3Anim,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.typingText}>AI is analyzing your data...</Text>
                  </View>
                </View>
              ) : displayedMessages.length > 0 ? (
                <>
                  {displayedMessages.map((recommendation) => (
                    <View
                      key={recommendation.id}
                      style={[
                        styles.chatMessageBubble,
                        styles.aiMessageBubble,
                      ]}
                    >
                      <View style={styles.chatMessageContent}>
                        <Text style={styles.chatMessageText}>
                          {recommendation.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {displayedMessages.length < aiSuggestions.length && (
                    <View style={styles.typingIndicatorContainer}>
                      <View style={styles.typingBubble}>
                        <View style={styles.typingDots}>
                          <Animated.View
                            style={[
                              styles.typingDot,
                              {
                                opacity: typingDot1Anim,
                              },
                            ]}
                          />
                          <Animated.View
                            style={[
                              styles.typingDot,
                              {
                                opacity: typingDot2Anim,
                              },
                            ]}
                          />
                          <Animated.View
                            style={[
                              styles.typingDot,
                              {
                                opacity: typingDot3Anim,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.typingText}>AI is thinking...</Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.modalPlaceholder}>
                  <Ionicons name="sparkles" size={64} color="#A992F6" />
                  <Text style={styles.modalPlaceholderText}>
                    AI Personal Health Assistant
                  </Text>
                  <Text style={styles.modalPlaceholderSubtext}>
                    No recommendations available. Please add your health data to get personalized suggestions.
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: Platform.OS === 'android' ? 16 : 20,
    paddingBottom: Platform.OS === 'android' ? 20 : 24,
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 26 : 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 32 : 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    // paddingBottom is set dynamically to account for floating AI button
  },
  coachCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    marginRight: 16,
  },
  coachImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E8E8F0',
  },
  coachInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  coachName: {
    fontSize: Platform.OS === 'android' ? 18 : 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
  },
  specialization: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#6F6F7B',
    marginBottom: 6,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  experience: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    color: '#6F6F7B',
    marginBottom: 8,
    lineHeight: Platform.OS === 'android' ? 18 : 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    fontWeight: '600',
    color: '#1E3A5F',
    marginLeft: 6,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  viewProfileButton: {
    backgroundColor: '#A992F6',
    paddingHorizontal: Platform.OS === 'android' ? 16 : 14,
    paddingVertical: Platform.OS === 'android' ? 10 : 8,
    borderRadius: 12,
    marginLeft: 12,
  },
  viewProfileButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 13 : 12,
    fontWeight: '600',
    lineHeight: Platform.OS === 'android' ? 18 : 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    color: '#6F6F7B',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  // Floating AI Button
  floatingAIButton: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 100 : 100, // Above bottom tab bar (80px height + 20px margin)
    right: Platform.OS === 'android' ? 20 : 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A992F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.55, // Fixed height at 55% of screen
    maxHeight: SCREEN_HEIGHT * 0.6, // Maximum 60% of screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: Platform.OS === 'android' ? 16 : 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalHeaderContent: {
    flex: 1,
    marginRight: 12,
  },
  modalHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modalHeaderTextContainer: {
    flex: 1,
    marginLeft: Platform.OS === 'android' ? 10 : 12,
  },
  modalTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 22,
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 26 : 28,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#6F6F7B',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
    minHeight: 200, // Ensure minimum height for content visibility
  },
  modalContent: {
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: Platform.OS === 'android' ? 12 : 16, // Reduced top padding to minimize gap
    paddingBottom: Platform.OS === 'android' ? 40 : 44,
  },
  // Chat Message Bubbles
  chatMessageBubble: {
    width: '90%', // Fixed width for uniform size
    maxWidth: '90%',
    marginBottom: Platform.OS === 'android' ? 16 : 14,
    alignSelf: 'flex-start',
  },
  aiMessageBubble: {
    backgroundColor: '#F7F5FF',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Platform.OS === 'android' ? 18 : 20,
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: Platform.OS === 'android' ? 48 : 50, // Minimum height for consistency
  },
  chatMessageContent: {
    flex: 1,
    width: '100%',
  },
  chatMessageText: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 22 : 24,
    flexWrap: 'wrap', // Ensure text wraps properly
  },
  // Typing Indicator
  typingIndicatorContainer: {
    marginTop: 0, // No top margin to minimize gap from header
    marginBottom: Platform.OS === 'android' ? 16 : 14,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#F7F5FF',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 18,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A992F6',
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    color: '#6F6F7B',
    fontStyle: 'italic',
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
  modalPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 60 : 80,
  },
  modalPlaceholderText: {
    fontSize: Platform.OS === 'android' ? 22 : 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginTop: Platform.OS === 'android' ? 20 : 24,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
    lineHeight: Platform.OS === 'android' ? 28 : 30,
  },
  modalPlaceholderSubtext: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#6F6F7B',
    textAlign: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    lineHeight: Platform.OS === 'android' ? 22 : 24,
  },
});

export default CoachScreen;
