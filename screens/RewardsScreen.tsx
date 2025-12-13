/**
 * Rewards Screen
 * 
 * This screen reads local reward data from AsyncStorage:
 * - fitcoins_balance: Current FitCoins balance
 * - reward_history OR reward_YYYY-MM-DD: Past rewards (tries reward_history first, then scans reward_ keys)
 * - milestones_awarded: Array of milestone records { streak, awardedAt, coins }
 * 
 * If you pass onClaim prop, the component will call it to generate rewards.
 * Otherwise, it uses the local checkAndGenerateReward flow.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
  Alert,
  ViewStyle,
  TextStyle,
  Linking,
  Image,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAndGenerateReward, HealthSummary } from '../utils/rewardFlow';
import { loadJSON, saveJSON, fitcoinsKey, milestonesKey, todayKey, rewardStorageKey, getUserKey } from '../utils/storageUtils';
import { useHealthData } from '../contexts/HealthDataContext';
import { OPENAI_API_KEY } from '@env';
import { useAuth } from '../contexts/AuthContext';
import { 
  loadDailyMissionStatus, 
  calculateMissionStatus, 
  saveDailyMissionStatus,
  getRewardStateForToday,
  markRewardClaimedToday,
  RewardStateForToday,
} from '../utils/dailyMissionManager';
import { useFocusEffect } from '@react-navigation/native';

// ============================================================================
// TYPES
// ============================================================================

interface Reward {
  date: string;
  message: string;
  badge: string;
  coins: number;
  generatedAt?: string;
}

interface MilestoneRecord {
  streak: number;
  awardedAt: string;
  coins?: number;
}

interface RewardsScreenProps {
  onClaim?: () => Promise<{ reward: Reward; newBalance?: number; fromCache?: boolean; blocked?: boolean; reason?: string }>;
}

// ============================================================================
// COMPONENT
// ============================================================================

const RewardsScreen: React.FC<RewardsScreenProps> = ({ onClaim }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { waterValue, burnedValue, nutritionValue, sleepValue, totalBurnedCalories } = useHealthData();
  const [canClaimReward, setCanClaimReward] = useState<boolean>(false);
  const [rewardState, setRewardState] = useState<RewardStateForToday>({
    completedCount: 0,
    unlocked: false,
    claimedToday: false,
    canClaim: false,
  });

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  const [fitcoinsBalance, setFitcoinsBalance] = useState<number>(0);
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const [rewardHistory, setRewardHistory] = useState<Reward[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const [newBalance, setNewBalance] = useState<number | undefined>(undefined);
  const [streak, setStreak] = useState<number>(0);
  const [sliderWidth, setSliderWidth] = useState<number>(0);
  
  // Reward Offers state
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [offerModalVisible, setOfferModalVisible] = useState<boolean>(false);
  const offerModalAnimation = useRef(new Animated.Value(0)).current;
  
  // FitCoins Redeemable Offers state
  const [selectedRedeemableOffer, setSelectedRedeemableOffer] = useState<any>(null);
  const [redeemableOfferModalVisible, setRedeemableOfferModalVisible] = useState<boolean>(false);
  const redeemableOfferModalAnimation = useRef(new Animated.Value(0)).current;
  
  // Gift Drawer state
  const [giftDrawerVisible, setGiftDrawerVisible] = useState<boolean>(false);
  const giftDrawerAnimation = useRef(new Animated.Value(0)).current;

  // Animation values for coin counter
  const coinAnimation = useRef(new Animated.Value(0)).current;
  const previousBalanceRef = useRef(0);
  
  // Animation values for streak indicator
  const streakIndicatorPosition = useRef(new Animated.Value(0)).current;
  const streakIndicatorPulse = useRef(new Animated.Value(1)).current;
  
  // Animation value for streak indicator
  const streakIndicatorAnimation = useRef(new Animated.Value(0)).current;

  /**
   * Calculate and update mission status from current health values
   * This ensures real-time updates when missions are completed
   * Reward is only available when 3+ missions are completed
   * 
   * IMPORTANT: This calculates from live health values, not just from storage.
   * This ensures the unlock status updates immediately when user completes missions.
   */
  const updateMissionStatus = useCallback(async () => {
    if (!user?.id) {
      setCanClaimReward(false);
      return;
    }

    try {
      // Calculate mission status from current health values (real-time)
      // This is the same calculation used in HomeScreen, ensuring consistency
      // Use totalBurnedCalories (treadmill + cycling) instead of burnedValue (average)
      // totalBurnedCalories is always a number (defaults to 0), so pass null if 0 for mission check
      const calculatedStatus = calculateMissionStatus(
        waterValue,
        totalBurnedCalories > 0 ? totalBurnedCalories : null, // Use totalBurnedCalories instead of burnedValue
        nutritionValue,
        sleepValue
      );

      // Save the calculated status to AsyncStorage for persistence
      await saveDailyMissionStatus(user.id, calculatedStatus);

      // Update canClaimReward state immediately
      setCanClaimReward(calculatedStatus.canClaimReward);

      // Get complete reward state (including claim status)
      const fullRewardState = await getRewardStateForToday(
        user.id,
        calculatedStatus,
        waterValue,
        totalBurnedCalories > 0 ? totalBurnedCalories : null, // Use totalBurnedCalories instead of burnedValue
        nutritionValue,
        sleepValue
      );
      setRewardState(fullRewardState);

      // Debug log to help troubleshoot
      if (__DEV__) {
        console.log('🎯 Mission status updated:', {
          completed: calculatedStatus.completedCount,
          canClaim: calculatedStatus.canClaimReward,
          rewardState: fullRewardState,
          missions: {
            water: calculatedStatus.waterDone,
            burned: calculatedStatus.burnedDone,
            nutrition: calculatedStatus.nutritionDone,
            sleep: calculatedStatus.sleepDone,
          },
          values: {
            water: waterValue,
            burned: burnedValue,
            nutrition: nutritionValue,
            sleep: sleepValue,
          },
          goals: {
            water: '3L',
            burned: '300 kcal',
            nutrition: '2200 kcal',
            sleep: '7 hours',
          },
        });
      }
    } catch (error) {
      console.error('Error updating mission status:', error);
      setCanClaimReward(false);
    }
  }, [user?.id, waterValue, totalBurnedCalories, nutritionValue, sleepValue]);

  // ========================================================================
  // LOAD DATA FROM ASYNCSTORAGE
  // ========================================================================
  // This function reads all reward-related data from AsyncStorage
  useEffect(() => {
    loadRewardData();
  }, []);

  // Reload mission status and reward data when user changes
  useEffect(() => {
    if (user?.id) {
      updateMissionStatus();
      loadRewardData(); // Reload all reward data when user changes
    }
  }, [user?.id, updateMissionStatus]);

  // Reload mission status when screen comes into focus
  // This ensures the unlock status updates when user completes missions
  useFocusEffect(
    useCallback(() => {
      updateMissionStatus();
    }, [updateMissionStatus])
  );

  // Update mission status reactively when health values change
  // This ensures canClaimReward updates immediately when missions are completed
  useEffect(() => {
    updateMissionStatus();
  }, [updateMissionStatus]);

  // Pulse animation for streak indicator
  useEffect(() => {
    if (streak > 0) {
      // Continuous pulse animation (breathing effect)
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(streakIndicatorPulse, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(streakIndicatorPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      
      return () => {
        pulseAnimation.stop();
      };
    } else {
      streakIndicatorPulse.setValue(1);
    }
  }, [streak]);

  // Update marker position animation when streak or slider width changes
  useEffect(() => {
    if (sliderWidth > 0) {
      const maxStreak = 30;
      const currentStreak = Math.min(streak, maxStreak);
      
      Animated.spring(streakIndicatorPosition, {
        toValue: currentStreak,
        useNativeDriver: false, // We need to animate 'left' which requires layout
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [streak, sliderWidth]);

  const loadRewardData = async () => {
    try {
      if (!user?.id) {
        // No user - clear all data and show zero balance
        setFitcoinsBalance(0);
        setDisplayBalance(0);
        previousBalanceRef.current = 0;
        setRewardHistory([]);
        setMilestones([]);
        return;
      }

      // ========================================================================
      // LOAD FITCOINS BALANCE (USER-SPECIFIC)
      // ========================================================================
      // Each user has their own balance stored at: fitcoins_balance_<userId>
      // New users start at 0 by default
      const userFitcoinsKey = getUserKey(fitcoinsKey, user.id);
      const balance = await loadJSON(userFitcoinsKey);
      
      if (typeof balance === 'number' && balance >= 0) {
        setFitcoinsBalance(balance);
        setDisplayBalance(balance);
        previousBalanceRef.current = balance;
      } else {
        // New user - initialize to 0
        setFitcoinsBalance(0);
        setDisplayBalance(0);
        previousBalanceRef.current = 0;
      }

      // ========================================================================
      // LOAD REWARD HISTORY (USER-SPECIFIC)
      // ========================================================================
      // Each user has their own reward history stored at: reward_history_<userId>
      let rewards: Reward[] = [];
      
      // Try user-specific reward_history array first
      const userHistoryKey = getUserKey('reward_history', user.id);
      const historyArray = await loadJSON(userHistoryKey);
      
      if (Array.isArray(historyArray) && historyArray.length > 0) {
        rewards = historyArray;
      } else {
        // Fallback: Scan all keys for user-specific reward entries
        // Format: reward_YYYY-MM-DD_<userId>
        const allKeys = await AsyncStorage.getAllKeys();
        const userRewardSuffix = `_${user.id}`;
        
        // Filter for user-specific reward keys
        const rewardKeys = allKeys.filter(key => {
          if (!key.startsWith('reward_') || key === 'reward_history') return false;
          // Only include keys that end with this user's ID
          return key.endsWith(userRewardSuffix);
        });
        
        // Load all reward objects
        const rewardPromises = rewardKeys.map(key => loadJSON(key));
        const rewardResults = await Promise.all(rewardPromises);
        
        // Filter out nulls and ensure valid structure
        rewards = rewardResults
          .filter((r): r is Reward => {
            if (r === null || typeof r !== 'object') return false;
            const reward = r as any;
            return (
              typeof reward.date === 'string' &&
              typeof reward.message === 'string' &&
              typeof reward.badge === 'string' &&
              typeof reward.coins === 'number'
            );
          });
      }

      // Sort by date (most recent first)
      rewards.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Descending order
      });

      setRewardHistory(rewards);

      // ========================================================================
      // LOAD MILESTONES (USER-SPECIFIC)
      // ========================================================================
      // Each user has their own milestones stored at: milestones_awarded_<userId>
      const userMilestonesKey = getUserKey(milestonesKey, user.id);
      const milestonesData = await loadJSON(userMilestonesKey);
      
      if (Array.isArray(milestonesData)) {
        setMilestones(milestonesData);
      } else {
        // New user - no milestones yet
        setMilestones([]);
      }

      // ========================================================================
      // LOAD STREAK (USER-SPECIFIC)
      // ========================================================================
      // Each user has their own streak stored at: current_streak_<userId>
      const userStreakKey = getUserKey('current_streak', user.id);
      const streakData = await loadJSON(userStreakKey);
      
      if (typeof streakData === 'number' && streakData >= 0) {
        setStreak(streakData);
      } else {
        // New user - start at 0
        setStreak(0);
      }
    } catch (error) {
      console.error('Error loading reward data:', error);
      // On error, clear data to prevent showing wrong user's data
      if (!user?.id) {
        setFitcoinsBalance(0);
        setDisplayBalance(0);
        setRewardHistory([]);
        setMilestones([]);
        setStreak(0);
      }
    }
  };

  // ========================================================================
  // CLAIM REWARD HANDLER
  // ========================================================================
  // This handles the "Claim Reward" button click
  // If onClaim prop is provided, use it; otherwise use local flow
  // 
  // IMPORTANT: Reward is only available when user completes 3+ daily missions
  const handleClaimReward = async () => {
    // First, check if user can claim reward (3+ missions completed and not already claimed)
    // Use rewardState.canClaim which is the most accurate (unlocked && !claimedToday)
    if (!rewardState.canClaim) {
      if (!rewardState.unlocked) {
        Alert.alert(
          'Reward Locked',
          `Complete at least 3 daily missions to claim your reward.\n\nCurrent progress: ${rewardState.completedCount}/4 missions completed.\n\nGo to Home to check your mission progress.`,
          [{ text: 'OK' }]
        );
      } else if (rewardState.claimedToday) {
        Alert.alert(
          'Reward Already Claimed',
          'You have already claimed your reward for today. Come back tomorrow for a new reward!',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    setLoading(true);

    try {
      // Recalculate mission status from current health values (most up-to-date)
      if (user?.id) {
        // Use totalBurnedCalories (treadmill + cycling) instead of burnedValue (average)
        // This matches HomeScreen's mission calculation logic
        const calculatedStatus = calculateMissionStatus(
          waterValue,
          totalBurnedCalories > 0 ? totalBurnedCalories : null, // Use totalBurnedCalories instead of burnedValue
          nutritionValue,
          sleepValue
        );
        
        // Save the latest status
        await saveDailyMissionStatus(user.id, calculatedStatus);
        setCanClaimReward(calculatedStatus.canClaimReward);
        
        // Update reward state to get the latest claim status
        const updatedRewardState = await getRewardStateForToday(
          user.id,
          calculatedStatus,
          waterValue,
          totalBurnedCalories > 0 ? totalBurnedCalories : null, // Use totalBurnedCalories instead of burnedValue
          nutritionValue,
          sleepValue
        );
        setRewardState(updatedRewardState);
        
        // Double-check after recalculation - use rewardState.canClaim for accuracy
        if (!updatedRewardState.canClaim) {
          if (!updatedRewardState.unlocked) {
            Alert.alert(
              'Reward Locked',
              `Complete at least 3 daily missions to claim your reward.\n\nCurrent progress: ${calculatedStatus.completedCount}/4 missions completed.`,
              [{ text: 'OK' }]
            );
          } else if (updatedRewardState.claimedToday) {
            Alert.alert(
              'Reward Already Claimed',
              'You have already claimed your reward for today. Come back tomorrow for a new reward!',
              [{ text: 'OK' }]
            );
          }
          setLoading(false);
          return;
        }
      } else {
        Alert.alert(
          'Error',
          'User not authenticated. Please log in again.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      let result;

      if (onClaim) {
        // Use provided onClaim function
        result = await onClaim();
      } else {
        // Use local reward flow
        // Get health summary from context
        const summary: HealthSummary = {
          water: waterValue,
          burned: burnedValue,
          nutrition: nutritionValue,
          sleep: sleepValue,
          streak: 0, // TODO: Get from streak tracker
          canClaimReward: true, // We've already verified this above
        };

        // Check if API key is available (you may want to get this from env or context)
        const apiKey = OPENAI_API_KEY; // TODO: Get from environment or context
        
        if (!apiKey) {
          Alert.alert(
            'API Key Missing',
            'OpenAI API key is required to generate rewards.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        result = await checkAndGenerateReward({
          apiKey,
          summary,
          userId: user?.id, // Pass user ID for user-specific reward storage
        });
      }

      // Check if reward was blocked (missions incomplete)
      if (result.blocked === true) {
        Alert.alert(
          'Reward Locked',
          result.reason || 'Complete at least 3 daily missions to claim your reward.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Check if reward was already claimed today (idempotency)
      if (result.fromCache === true) {
        Alert.alert(
          'Reward Already Claimed',
          `You've already claimed your reward for today!\n\nBadge: ${result.reward.badge}\nCoins: ${result.reward.coins}`,
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Mark reward as claimed for today
      if (user?.id) {
        await markRewardClaimedToday(user.id);
      }

      // New reward generated - show modal
      setCurrentReward(result.reward);
      setNewBalance(result.newBalance);
      
      // Animate coin counter
      if (result.newBalance !== undefined) {
        animateCoinCounter(previousBalanceRef.current, result.newBalance);
        previousBalanceRef.current = result.newBalance;
      }

      setRewardModalVisible(true);
      
      // Update reward state to reflect that it's been claimed
      if (user?.id) {
        // Use totalBurnedCalories (treadmill + cycling) instead of burnedValue (average)
        // This matches HomeScreen's mission calculation logic
        const calculatedStatus = calculateMissionStatus(
          waterValue,
          totalBurnedCalories > 0 ? totalBurnedCalories : null, // Use totalBurnedCalories instead of burnedValue
          nutritionValue,
          sleepValue
        );
        const updatedState = await getRewardStateForToday(
          user.id,
          calculatedStatus,
          waterValue,
          totalBurnedCalories > 0 ? totalBurnedCalories : null, // Use totalBurnedCalories instead of burnedValue
          nutritionValue,
          sleepValue
        );
        setRewardState(updatedState);
      }
      
      // Reload data to update UI
      await loadRewardData();
    } catch (error) {
      console.error('Error claiming reward:', error);
      
      // Check if it's a quota error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                          errorMessage.toLowerCase().includes('billing') ||
                          errorMessage.toLowerCase().includes('exceeded');
      
      if (isQuotaError) {
        Alert.alert(
          'API Quota Exceeded',
          'OpenAI API quota has been exceeded. You still received a fallback reward! Check your OpenAI billing plan to restore AI-generated rewards.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Reward Generated',
          'A reward has been generated for you! (Note: AI generation failed, but you still received a reward.)',
          [{ text: 'OK' }]
        );
      }
      
      // Reload data to show the fallback reward
      await loadRewardData();
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // COIN ANIMATION
  // ========================================================================
  // Animates the coin counter from previous balance to new balance
  const animateCoinCounter = (from: number, to: number) => {
    coinAnimation.setValue(0);
    const anim = Animated.timing(coinAnimation, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    });
    
    anim.start(({ finished }) => {
      if (finished) {
        setDisplayBalance(to);
      }
    });
    
    // Update display balance during animation
    coinAnimation.addListener(({ value }) => {
      const currentValue = from + (to - from) * value;
      setDisplayBalance(Math.round(currentValue));
    });
  };

  // ========================================================================
  // MILESTONE HELPERS
  // ========================================================================
  // Check if a milestone is achieved
  const isMilestoneAchieved = (streak: number): boolean => {
    return milestones.some(m => m.streak === streak);
  };

  // Get milestone coins
  const getMilestoneCoins = (streak: number): number => {
    const milestone = milestones.find(m => m.streak === streak);
    return milestone?.coins || 0;
  };

  // ========================================================================
  // RENDER FUNCTIONS
  // ========================================================================

  const renderFitCoinsHeader = () => (
    <View style={styles.fitcoinsHeader}>
      <View style={styles.fitcoinsContainer}>
        <Ionicons name="star" size={32} color="#FFD700" />
        <View style={styles.fitcoinsTextContainer}>
          <Text style={styles.fitcoinsLabel}>FitCoins Balance</Text>
          <Text style={styles.fitcoinsValue}>
            {displayBalance || fitcoinsBalance}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderClaimButton = () => {
    // Determine button state based on rewardState
    // CONDITION 1: LOCKED - fewer than 3 missions
    const isLocked = !rewardState.unlocked;
    // CONDITION 3: ALREADY CLAIMED - reward claimed today
    const isClaimed = rewardState.claimedToday;
    // CONDITION 2: READY TO CLAIM - unlocked and not claimed
    const isReady = rewardState.unlocked && !rewardState.claimedToday;

    // Button is disabled if locked, claimed, or loading
    const isDisabled = loading || isLocked || isClaimed;

    // Determine button text and icon based on state
    let buttonText = 'Claim Reward';
    let buttonIcon: any = 'gift';
    let buttonStyle: ViewStyle | ViewStyle[] = styles.claimButton;
    let buttonTextStyle: TextStyle | TextStyle[] = styles.claimButtonText;

    if (isLocked) {
      // CONDITION 1: LOCKED
      buttonText = 'Reward Locked';
      buttonIcon = 'lock-closed';
      buttonStyle = [styles.claimButton, styles.claimButtonDisabled] as ViewStyle[];
      buttonTextStyle = [styles.claimButtonText, styles.claimButtonTextDisabled] as TextStyle[];
    } else if (isClaimed) {
      // CONDITION 3: ALREADY CLAIMED
      buttonText = 'Already Claimed';
      buttonIcon = 'checkmark-circle';
      buttonStyle = [styles.claimButton, styles.claimButtonDisabled] as ViewStyle[];
      buttonTextStyle = [styles.claimButtonText, styles.claimButtonTextDisabled] as TextStyle[];
    } else if (isReady) {
      // CONDITION 2: READY TO CLAIM
      buttonText = 'Claim Reward';
      buttonIcon = 'gift';
      buttonStyle = styles.claimButton;
      buttonTextStyle = styles.claimButtonText;
    }

            return (
      <View>
        <TouchableOpacity
          style={buttonStyle}
          onPress={handleClaimReward}
          disabled={isDisabled}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={buttonIcon as any}
                size={24}
                color="#FFFFFF"
                style={styles.claimButtonIcon}
              />
              <Text style={buttonTextStyle}>
                {buttonText}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Tooltip/Message below button */}
        {isLocked && (
          <Text style={styles.claimButtonTooltip}>
            Complete at least 3 missions to unlock today's reward.
                  </Text>
        )}
        {isClaimed && (
          <Text style={styles.claimButtonTooltip}>
            Come back tomorrow for a new reward.
          </Text>
                    )}
                  </View>
    );
  };

  const renderStreakSlider = () => {
    // Maximum streak for slider (30 days, matching milestone)
    const maxStreak = 30;
    const currentStreak = Math.min(streak, maxStreak); // Cap at max (0-30)
    const progressPercentage = (currentStreak / maxStreak) * 100;

    // Marker size for position calculation
    const markerSize = 20; // Circle diameter
    const markerRadius = markerSize / 2;

    // Animated marker position (smooth transition when streak changes)
    // Interpolate from streak value (0-30) to pixel position (0 to sliderWidth - markerSize)
    const animatedMarkerLeft = streakIndicatorPosition.interpolate({
      inputRange: [0, maxStreak],
      outputRange: sliderWidth > 0 
        ? [0, Math.max(0, sliderWidth - markerSize)]
        : [0, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.streakContainer}>
        <Text style={styles.streakLabel}>
          Daily Streak: {streak === 1 ? '1 Day' : `${streak} Days`}
                  </Text>

        {/* Slider Track Container */}
        <View 
          style={styles.streakSliderContainer}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width > 0 && width !== sliderWidth) {
              setSliderWidth(width);
            }
          }}
        >
          {/* Background Track (gray) - represents 0-30 day range */}
          <View style={styles.streakTrack}>
            {/* Active Progress (purple) from 0 to current streak */}
                      <View
                        style={[
                styles.streakProgress,
                { width: `${progressPercentage}%` }
              ]}
            />
            
            {/* Current Streak Indicator Circle (Animated) */}
            {/* Positioned at: (currentStreak / 30) * sliderWidth */}
            {sliderWidth > 0 && (
              <Animated.View
                    style={[
                  styles.streakIndicator,
                  {
                    left: animatedMarkerLeft,
                    transform: [{ scale: streakIndicatorPulse }],
                  }
                    ]}
                  />
                )}
              </View>
        </View>
      </View>
    );
  };

  // Reward Offers Data
  const rewardOffers = [
    {
      id: 'nike',
      title: 'Nike Running Shoes',
      subtitle: 'Exclusive FitHive Discount',
      coupon: 'NIKE-FIT10',
      link: 'https://www.nike.com',
      description: 'Premium lightweight shoes for daily running. Get 10% off on your next purchase with this exclusive FitHive coupon.',
      image: require('../assets/images/nike2.png'), // Placeholder - replace with require('../assets/rewards/nikeShoes.png') when image is available
    },
   
    {
      id: 'muesli',
      title: 'Pintola Muesli',
      subtitle: 'Protein-Packed Crunch',
      coupon: 'PINTOLA-FIT20',
      link: 'https://pintola.in',
      description: 'Delicious muesli blend with nuts and protein. Get 20% off on this healthy breakfast option.',
      image: require('../assets/images/pintola.jpg'), // Placeholder - replace with require('../assets/rewards/muesli.png') when image is available
    },
    {
      id: 'oats',
      title: 'MyFitness Oats',
      subtitle: 'Healthy Breakfast Boost',
      coupon: 'OATS-FIT15',
      link: 'https://myfitness.com',
      description: 'High-fiber oats to fuel your mornings. Enjoy 15% discount on premium quality oats.',
      image: require('../assets/images/myp-removebg-preview.png'), // Placeholder - replace with require('../assets/rewards/oats.png') when image is available
    },
    {
      id: 'energy',
      title: 'Healthy Energy Drink',
      subtitle: 'Natural Energy Boost',
      coupon: 'ENERGY-FIT12',
      link: 'https://example.com/energy',
      description: 'Natural energy drink with no artificial additives. Perfect for pre-workout or mid-day boost. 12% discount available.',
      image: require('../assets/images/health.jpg'), // Placeholder - replace with require('../assets/rewards/energy.png') when image is available
    },
  ];

  // FitCoins Redeemable Offers Data
  const fitcoinsRedeemableOffers = [
    {
      id: 'wellcore-gym',
      title: 'WellCore Gym Membership',
      subtitle: 'Membership Discount Offer',
      description: 'Get exclusive access to premium gym facilities with our special membership discount. Perfect for your fitness journey!',
      requiredFitCoins: 150,
      link: 'https://wavesgym.com',
      image: require('../assets/images/gym2.jpg'), // Placeholder - replace with actual image
    },
    {
      id: 'muscleblaze-protein',
      title: 'MuscleBlaze Protein Powder',
      subtitle: 'Discount on Protein Powder',
      description: 'High-quality protein powder to fuel your workouts and recovery. Get a special discount when you redeem with FitCoins.',
      requiredFitCoins: 10,
      link: 'https://muscleblaze.com',
      image: require('../assets/images/mbpowder.avif'), // Placeholder - replace with actual image
    },
    {
      id: 'puma-combo',
      title: 'Puma T-Shirt + Shorts',
      subtitle: 'Combo with Discount',
      description: 'Complete your workout wardrobe with this stylish Puma combo. Comfortable and durable for all your fitness activities.',
      requiredFitCoins: 100,
      link: 'https://puma.com',
      image: require('../assets/images/puma.jpg'), // Placeholder - replace with actual image
    },
    {
      id: 'adidas-shoes',
      title: 'Adidas Running Shoes',
      subtitle: 'Discount on Running Shoes',
      description: 'Premium running shoes designed for performance and comfort. Perfect for your daily runs and training sessions.',
      requiredFitCoins: 180,
      link: 'https://adidas.com',
      image: require('../assets/images/ad-removebg-preview.png'), // Placeholder - replace with actual image
    },
  ];

  const renderRewardOffers = () => {
    return (
      <View style={styles.rewardOffersSection}>
        <Text style={styles.sectionTitle}>Reward Offers</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offersScroll}
        >
          {rewardOffers.map((offer) => (
            <TouchableOpacity
              key={offer.id}
              style={styles.offerCard}
              onPress={() => {
                setSelectedOffer(offer);
                setOfferModalVisible(true);
                // Animate modal slide-up
                Animated.spring(offerModalAnimation, {
                  toValue: 1,
                  useNativeDriver: true,
                  tension: 50,
                  friction: 7,
                }).start();
              }}
              activeOpacity={0.8}
            >
              {/* Product Image */}
              <View style={styles.offerCardImageContainer}>
                {offer.image ? (
                  <Image
                    source={offer.image}
                    style={styles.offerCardImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.offerCardImagePlaceholder}>
                    <Ionicons
                      name={offer.id === 'nike' ? 'football' : offer.id === 'oats' ? 'nutrition' : offer.id === 'muesli' ? 'leaf' : 'battery-charging'}
                      size={50}
                      color="#A992F6"
                    />
                  </View>
                )}
              </View>
              
              {/* Card Content */}
              <View style={styles.offerCardContent}>
                <Text style={styles.offerCardTitle} numberOfLines={2}>
                  {offer.title}
                </Text>
                <Text style={styles.offerCardSubtitle} numberOfLines={1}>
                  {offer.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFitCoinsRedeemableOffers = () => {
    return (
      <View style={styles.fitcoinsRedeemableSection}>
        <Text style={styles.sectionTitle}>FitCoins Redeemable Offers</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offersScroll}
        >
          {fitcoinsRedeemableOffers.map((offer) => (
            <TouchableOpacity
              key={offer.id}
              style={styles.redeemableOfferCard}
              onPress={() => {
                setSelectedRedeemableOffer(offer);
                setRedeemableOfferModalVisible(true);
                // Animate modal slide-up
                Animated.spring(redeemableOfferModalAnimation, {
                  toValue: 1,
                  useNativeDriver: true,
                  tension: 50,
                  friction: 7,
                }).start();
              }}
              activeOpacity={0.8}
            >
              {/* Product Image */}
              <View style={styles.redeemableOfferCardImageContainer}>
                {offer.image ? (
                  <Image
                    source={offer.image}
                    style={styles.redeemableOfferCardImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.redeemableOfferCardImagePlaceholder}>
                    <Ionicons
                      name={offer.id === 'wellcore-gym' ? 'barbell' : offer.id === 'muscleblaze-protein' ? 'fitness' : offer.id === 'puma-combo' ? 'shirt' : 'walk'}
                      size={50}
                      color="#A992F6"
                    />
                  </View>
                )}
              </View>
              
              {/* FitCoins Badge */}
              <View style={styles.redeemableOfferBadge}>
                <Ionicons name="logo-bitcoin" size={14} color="#A992F6" />
                <Text style={styles.redeemableOfferBadgeText}>Redeem with FitCoins</Text>
              </View>
              
              {/* Card Content */}
              <View style={styles.redeemableOfferCardContent}>
                <Text style={styles.redeemableOfferCardTitle} numberOfLines={2}>
                  {offer.title}
                </Text>
                <Text style={styles.redeemableOfferCardSubtitle} numberOfLines={1}>
                  {offer.subtitle}
                </Text>
                <View style={styles.redeemableOfferCoinsContainer}>
                  <Ionicons name="logo-bitcoin" size={16} color="#A992F6" />
                  <Text style={styles.redeemableOfferCoinsText}>{offer.requiredFitCoins} FitCoins</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const handleRedeemWithFitCoins = async () => {
    if (!selectedRedeemableOffer || !user?.id) return;

    const requiredCoins = selectedRedeemableOffer.requiredFitCoins;
    
    if (fitcoinsBalance < requiredCoins) {
      Alert.alert(
        'Insufficient FitCoins',
        `You need ${requiredCoins} FitCoins to redeem this offer. You currently have ${fitcoinsBalance} FitCoins.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirm redemption
    Alert.alert(
      'Confirm Redemption',
      `Are you sure you want to redeem ${requiredCoins} FitCoins for ${selectedRedeemableOffer.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            try {
              const newBalance = fitcoinsBalance - requiredCoins;
              
              // Save new balance to AsyncStorage
              const userFitcoinsKey = getUserKey(fitcoinsKey, user.id);
              await saveJSON(userFitcoinsKey, newBalance);
              
              // Update state
              setFitcoinsBalance(newBalance);
              setDisplayBalance(newBalance);
              previousBalanceRef.current = newBalance;
              
              // Close modal
              Animated.timing(redeemableOfferModalAnimation, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }).start(() => {
                setRedeemableOfferModalVisible(false);
                setSelectedRedeemableOffer(null);
              });
              
              Alert.alert(
                'Redemption Successful!',
                `You have successfully redeemed ${requiredCoins} FitCoins for ${selectedRedeemableOffer.title}. Your new balance is ${newBalance} FitCoins.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error redeeming FitCoins:', error);
              Alert.alert('Error', 'Failed to redeem FitCoins. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderRedeemableOfferModal = () => {
    if (!selectedRedeemableOffer) return null;

    const screenHeight = Dimensions.get('window').height;
    const modalHeight = screenHeight * 0.75; // 75% of screen height

    const slideUp = redeemableOfferModalAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [modalHeight, 0],
    });

    const backdropOpacity = redeemableOfferModalAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    });

    const hasEnoughCoins = fitcoinsBalance >= selectedRedeemableOffer.requiredFitCoins;

    return (
      <Modal
        visible={redeemableOfferModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => {
          Animated.timing(redeemableOfferModalAnimation, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setRedeemableOfferModalVisible(false);
            setSelectedRedeemableOffer(null);
          });
        }}
      >
        <TouchableOpacity
          style={styles.offerModalBackdrop}
          activeOpacity={1}
          onPress={() => {
            Animated.timing(redeemableOfferModalAnimation, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              setRedeemableOfferModalVisible(false);
              setSelectedRedeemableOffer(null);
            });
          }}
        >
          <Animated.View
            style={[
              styles.offerModalBackdropOverlay,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.offerModalContainer,
            {
              height: modalHeight,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          <View style={styles.offerModalHeader}>
            <Text style={styles.offerModalTitle}>Redeem with FitCoins</Text>
            <TouchableOpacity
              onPress={() => {
                Animated.timing(redeemableOfferModalAnimation, {
                  toValue: 0,
                  duration: 250,
                  useNativeDriver: true,
                }).start(() => {
                  setRedeemableOfferModalVisible(false);
                  setSelectedRedeemableOffer(null);
                });
              }}
              style={styles.offerModalCloseButton}
            >
              <Ionicons name="close" size={24} color="#1E3A5F" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.offerModalContent}
            contentContainerStyle={styles.offerModalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Product Image/Icon */}
            <View style={styles.offerModalImageContainer}>
              {selectedRedeemableOffer.image ? (
                <Image
                  source={selectedRedeemableOffer.image}
                  style={styles.offerModalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.offerModalImagePlaceholder}>
                  <Ionicons
                    name={selectedRedeemableOffer.id === 'wellcore-gym' ? 'barbell' : selectedRedeemableOffer.id === 'muscleblaze-protein' ? 'fitness' : selectedRedeemableOffer.id === 'puma-combo' ? 'shirt' : 'walk'}
                    size={60}
                    color="#A992F6"
                  />
                </View>
              )}
            </View>

            {/* Product Title & Subtitle */}
            <Text style={styles.offerModalProductTitle}>
              {selectedRedeemableOffer.title}
            </Text>
            <Text style={styles.offerModalProductSubtitle}>
              {selectedRedeemableOffer.subtitle}
            </Text>

            {/* Product Description */}
            <Text style={styles.offerModalDescription}>
              {selectedRedeemableOffer.description}
            </Text>

            {/* Required FitCoins */}
            <View style={styles.redeemableOfferFitCoinsContainer}>
              <View style={styles.redeemableOfferFitCoinsBox}>
                <Ionicons name="logo-bitcoin" size={24} color="#A992F6" />
                <View style={styles.redeemableOfferFitCoinsTextContainer}>
                  <Text style={styles.redeemableOfferFitCoinsLabel}>Required FitCoins</Text>
                  <Text style={styles.redeemableOfferFitCoinsValue}>
                    {selectedRedeemableOffer.requiredFitCoins} FitCoins
                  </Text>
                </View>
              </View>
              {!hasEnoughCoins && (
                <Text style={styles.redeemableOfferInsufficientText}>
                  You need {selectedRedeemableOffer.requiredFitCoins - fitcoinsBalance} more FitCoins
                </Text>
              )}
            </View>

            {/* Redeem with FitCoins Button */}
            <TouchableOpacity
              style={[
                styles.redeemableOfferRedeemButton,
                !hasEnoughCoins && styles.redeemableOfferRedeemButtonDisabled,
              ]}
              onPress={handleRedeemWithFitCoins}
              disabled={!hasEnoughCoins}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-bitcoin" size={20} color="#FFFFFF" />
              <Text style={styles.redeemableOfferRedeemButtonText}>
                Redeem with FitCoins
              </Text>
            </TouchableOpacity>

            {/* Buy on Website Button */}
            <TouchableOpacity
              style={styles.redeemableOfferBuyButton}
              onPress={() => {
                Linking.openURL(selectedRedeemableOffer.link).catch((err) => {
                  console.error('Failed to open URL:', err);
                  Alert.alert('Error', 'Could not open the website. Please try again later.');
                });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={20} color="#1E3A5F" />
              <Text style={styles.redeemableOfferBuyButtonText}>Buy on Website</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  const renderOfferModal = () => {
    if (!selectedOffer) return null;

    const screenHeight = Dimensions.get('window').height;
    const modalHeight = screenHeight * 0.75; // 75% of screen height for better visibility

    const slideUp = offerModalAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [modalHeight, 0],
    });

    const backdropOpacity = offerModalAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    });

    return (
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => {
          Animated.timing(offerModalAnimation, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setOfferModalVisible(false);
            setSelectedOffer(null);
          });
        }}
      >
        <TouchableOpacity
          style={styles.offerModalBackdrop}
          activeOpacity={1}
          onPress={() => {
            Animated.timing(offerModalAnimation, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              setOfferModalVisible(false);
              setSelectedOffer(null);
            });
          }}
        >
          <Animated.View
            style={[
              styles.offerModalBackdropOverlay,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.offerModalContainer,
            {
              height: modalHeight,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          <View style={styles.offerModalHeader}>
            <Text style={styles.offerModalTitle}>Reward Offer</Text>
            <TouchableOpacity
              onPress={() => {
                Animated.timing(offerModalAnimation, {
                  toValue: 0,
                  duration: 250,
                  useNativeDriver: true,
                }).start(() => {
                  setOfferModalVisible(false);
                  setSelectedOffer(null);
                });
              }}
              style={styles.offerModalCloseButton}
            >
              <Ionicons name="close" size={24} color="#1E3A5F" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.offerModalContent}
            contentContainerStyle={styles.offerModalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Product Image/Icon */}
            <View style={styles.offerModalImageContainer}>
              {selectedOffer.image ? (
                <Image
                  source={selectedOffer.image}
                  style={styles.offerModalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.offerModalImagePlaceholder}>
                  <Ionicons
                    name={selectedOffer.id === 'nike' ? 'football' : selectedOffer.id === 'oats' ? 'nutrition' : selectedOffer.id === 'muesli' ? 'leaf' : 'battery-charging'}
                    size={60}
                    color="#A992F6"
                  />
                </View>
              )}
            </View>

            {/* Product Title & Subtitle */}
            <Text style={styles.offerModalProductTitle}>
              {selectedOffer.title}
            </Text>
            <Text style={styles.offerModalProductSubtitle}>
              {selectedOffer.subtitle}
            </Text>

            {/* Product Description */}
            <Text style={styles.offerModalDescription}>
              {selectedOffer.description}
            </Text>

            {/* Coupon Code */}
            <View style={styles.offerModalCouponContainer}>
              <Text style={styles.offerModalCouponLabel}>Coupon Code</Text>
              <View style={styles.offerModalCouponCode}>
                <Text style={styles.offerModalCouponCodeText}>
                  {selectedOffer.coupon}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    // Copy to clipboard (optional enhancement)
                    Alert.alert('Copied!', `Coupon code ${selectedOffer.coupon} copied to clipboard.`);
                  }}
                  style={styles.offerModalCopyButton}
                >
                  <Ionicons name="copy-outline" size={18} color="#A992F6" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Visit Website Button */}
            <TouchableOpacity
              style={styles.offerModalVisitButton}
              onPress={() => {
                Linking.openURL(selectedOffer.link).catch((err) => {
                  console.error('Failed to open URL:', err);
                  Alert.alert('Error', 'Could not open the website. Please try again later.');
                });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={20} color="#FFFFFF" />
              <Text style={styles.offerModalVisitButtonText}>
                Visit Website
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  const renderMilestoneBadges = () => {
    const milestoneThresholds = [7, 14, 30];
    const milestoneCoins = [50, 120, 300];

    return (
      <View style={styles.milestonesSection}>
        <Text style={styles.sectionTitle}>Milestone Badges</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.milestonesScroll}
        >
          {milestoneThresholds.map((streak, index) => {
            const achieved = isMilestoneAchieved(streak);
            const coins = milestoneCoins[index];

            return (
              <View key={streak} style={styles.milestoneBadge}>
          <View
            style={[
                    styles.milestoneBadgeIcon,
                    achieved && styles.milestoneBadgeIconAchieved,
            ]}
          >
            <Ionicons
                    name={achieved ? 'trophy' : 'trophy-outline'}
              size={32}
                    color={achieved ? '#FFD700' : '#C0C0C0'}
            />
          </View>
                <Text style={styles.milestoneBadgeStreak}>{streak} Days</Text>
                <Text style={styles.milestoneBadgeCoins}>{coins} Coins</Text>
                {achieved && (
                  <View style={styles.milestoneBadgeCheck}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </View>
          )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderRewardHistory = () => {
    if (rewardHistory.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={64} color="#C0C0C0" />
          <Text style={styles.emptyStateText}>
            No rewards yet. Complete your daily missions to earn FitCoins!
              </Text>
                </View>
      );
    }

    return (
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Reward History</Text>
        {rewardHistory.map((reward, index) => (
          <View key={`${reward.date}-${index}`} style={styles.rewardHistoryItem}>
            <View style={styles.rewardHistoryLeft}>
              <View style={styles.rewardHistoryBadge}>
                <Text style={styles.rewardHistoryBadgeText}>
                  {reward.badge.charAt(0)}
                </Text>
            </View>
              <View style={styles.rewardHistoryContent}>
                <Text style={styles.rewardHistoryBadgeName}>{reward.badge}</Text>
                <Text style={styles.rewardHistoryMessage}>{reward.message}</Text>
                <Text style={styles.rewardHistoryDate}>
                  {new Date(reward.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.rewardHistoryCoins}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.rewardHistoryCoinsText}>+{reward.coins}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderGiftDrawer = () => {
    const screenHeight = Dimensions.get('window').height;
    const drawerHeight = screenHeight * 0.65; // 65% of screen height

    const slideUp = giftDrawerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [drawerHeight, 0],
    });

    const backdropOpacity = giftDrawerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    });

    const closeDrawer = () => {
      Animated.timing(giftDrawerAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setGiftDrawerVisible(false);
      });
    };

    return (
      <Modal
        visible={giftDrawerVisible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <TouchableOpacity
          style={styles.giftDrawerBackdrop}
          activeOpacity={1}
          onPress={closeDrawer}
        >
          <Animated.View
            style={[
              styles.giftDrawerBackdropOverlay,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.giftDrawerContainer,
            {
              height: drawerHeight,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          <View style={styles.giftDrawerHeader}>
            <Text style={styles.giftDrawerTitle}>Your Achievements</Text>
            <TouchableOpacity
              onPress={closeDrawer}
              style={styles.giftDrawerCloseButton}
            >
              <Ionicons name="close" size={24} color="#1E3A5F" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.giftDrawerContent}
            contentContainerStyle={styles.giftDrawerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Daily Streak Slider */}
            {renderStreakSlider()}

            {/* Milestone Badges */}
            {renderMilestoneBadges()}
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  const renderRewardModal = () => (
    <Modal
      visible={rewardModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setRewardModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRewardModalVisible(false)}
        />
        <View style={styles.modalContent}>
          {currentReward && (
            <>
              {/* Badge */}
              <View style={styles.modalBadgeContainer}>
                <View style={styles.modalBadgeIcon}>
                  <Ionicons name="trophy" size={64} color="#FFD700" />
                </View>
                <Text style={styles.modalBadgeName}>{currentReward.badge}</Text>
          </View>

              {/* Message */}
              <Text style={styles.modalMessage}>{currentReward.message}</Text>

              {/* Coins Earned */}
              <View style={styles.modalCoinsContainer}>
                <Text style={styles.modalCoinsLabel}>Coins Earned</Text>
                <View style={styles.modalCoinsValueContainer}>
                  <Ionicons name="add-circle" size={32} color="#4CAF50" />
                  <Text style={styles.modalCoinsValue}>+{currentReward.coins}</Text>
              </View>
          </View>

              {/* New Balance */}
              {newBalance !== undefined && (
                <View style={styles.modalBalanceContainer}>
                  <Text style={styles.modalBalanceLabel}>New Balance</Text>
                  <Text style={styles.modalBalanceValue}>{newBalance} FitCoins</Text>
        </View>
              )}

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => {
                    setRewardModalVisible(false);
                    // Scroll to history (if needed)
                  }}
                >
                  <Text style={styles.modalButtonSecondaryText}>View History</Text>
      </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={() => setRewardModalVisible(false)}
                >
                  <Text style={styles.modalButtonPrimaryText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
            )}
          </View>
        </View>
    </Modal>
    );

  // ========================================================================
  // MAIN RENDER
  // ========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards</Text>
          <TouchableOpacity
            style={styles.headerGiftButton}
            onPress={() => {
              setGiftDrawerVisible(true);
              // Animate drawer slide-up
              Animated.spring(giftDrawerAnimation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
              }).start();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="gift" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* FitCoins Balance */}
        {renderFitCoinsHeader()}

        {/* Claim Reward Button */}
        {renderClaimButton()}

        {/* Reward Offers */}
        {renderRewardOffers()}

        {/* FitCoins Redeemable Offers */}
        {renderFitCoinsRedeemableOffers()}

        {/* Reward History */}
        {renderRewardHistory()}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Reward Modal */}
      {renderRewardModal()}
      
      {/* Offer Modal */}
      {renderOfferModal()}
      
      {/* FitCoins Redeemable Offer Modal */}
      {renderRedeemableOfferModal()}
      
      {/* Gift Drawer */}
      {renderGiftDrawer()}
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

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
    paddingBottom: Platform.OS === 'android' ? 50 : 40, // More bottom padding on Android
  },
  header: {
    marginBottom: Platform.OS === 'android' ? 28 : 24, // More spacing on Android
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 30 : 32, // Slightly smaller on Android
    fontWeight: 'bold',
    color: '#1E3A5F',
    flex: 1,
    lineHeight: Platform.OS === 'android' ? 36 : 38,
  },
  headerGiftButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B', // Light red color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // FitCoins Header
  fitcoinsHeader: {
    marginBottom: 24,
  },
  fitcoinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fitcoinsTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  fitcoinsLabel: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  fitcoinsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  // Claim Button
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A992F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 32,
    gap: 8,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  claimButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#9E9E9E', // Grey background for disabled state
  },
  claimButtonIcon: {
    marginRight: 8,
  },
  claimButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  claimButtonTextDisabled: {
    opacity: 0.8,
  },
  claimButtonTooltip: {
    fontSize: 12,
    color: '#6F6F7B',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  // Daily Streak Slider
  streakContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  streakLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 16,
    textAlign: 'center',
  },
  streakSliderContainer: {
    width: '100%',
    marginBottom: 8,
  },
  streakTrack: {
    width: '100%',
    height: 12,
    backgroundColor: '#E4E4EC',
    borderRadius: 6,
    position: 'relative',
    overflow: 'visible',
  },
  streakProgress: {
    height: '100%',
    backgroundColor: '#A992F6',
    borderRadius: 6,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  streakIndicator: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#A992F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginLeft: -10, // Center the indicator
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  // Milestones
  milestonesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  // Reward Offers
  rewardOffersSection: {
    marginBottom: 32,
  },
  offersScroll: {
    paddingRight: 20,
  },
  offerCard: {
    width: 240,
    height: 260,
    backgroundColor: '#FFFFFF', // White background
    borderRadius: 20,
    marginRight: 20,
    overflow: 'hidden', // Ensure card corners remain rounded and content doesn't overflow
    borderWidth: Platform.OS === 'android' ? 1 : 1.5, // Subtle border for card separation
    borderColor: '#B3B3F5', // Slightly darker purple border
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 5,
    }),
  },
  offerCardImageContainer: {
    width: '100%',
    height: 150, // Fixed height for consistent card layout
    backgroundColor: '#F5F5F5', // Light background for image container
    overflow: 'hidden', // Prevent image overflow
    justifyContent: 'center', // Center image vertically
    alignItems: 'center', // Center image horizontally
    padding: Platform.OS === 'android' ? 12 : 10, // Padding to ensure images fit within container
  },
  offerCardImage: {
    width: '100%',
    height: '100%',
    // Images will be contained within the container with proper aspect ratio
  },
  offerCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  offerCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 6,
    lineHeight: 22,
  },
  offerCardSubtitle: {
    fontSize: 13,
    color: '#6F6F7B',
    lineHeight: 18,
  },
  // Offer Modal
  offerModalBackdrop: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  offerModalBackdropOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  offerModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  offerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4EC',
  },
  offerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  offerModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerModalContent: {
    flex: 1,
  },
  offerModalContentContainer: {
    padding: Platform.OS === 'android' ? 24 : 20, // More padding on Android
    paddingBottom: Platform.OS === 'android' ? 32 : 28, // Extra bottom padding for button visibility
  },
  offerModalImageContainer: {
    width: '100%',
    height: Platform.OS === 'android' ? 220 : 200, // Increased height for better image visibility
    marginBottom: Platform.OS === 'android' ? 24 : 20, // More spacing on Android
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#F5F5F5', // Background for image container
    justifyContent: 'center', // Center image vertically
    alignItems: 'center', // Center image horizontally
    padding: Platform.OS === 'android' ? 16 : 12, // Padding to ensure images fit within container
  },
  offerModalImage: {
    width: '100%',
    height: '100%',
    // Image will be contained with proper aspect ratio
  },
  offerModalImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerModalProductTitle: {
    fontSize: Platform.OS === 'android' ? 24 : 22, // Slightly larger on Android
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 12 : 8, // More spacing on Android
    lineHeight: Platform.OS === 'android' ? 30 : 28,
  },
  offerModalProductSubtitle: {
    fontSize: Platform.OS === 'android' ? 15 : 14, // Slightly larger on Android
    color: '#6F6F7B',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 20 : 16, // More spacing on Android
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  offerModalDescription: {
    fontSize: Platform.OS === 'android' ? 15 : 14, // Slightly larger on Android
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 22 : 20, // Better line height on Android
    marginBottom: Platform.OS === 'android' ? 28 : 24, // More spacing on Android
    textAlign: 'center',
  },
  offerModalCouponContainer: {
    marginBottom: Platform.OS === 'android' ? 28 : 24, // More spacing on Android
  },
  offerModalCouponLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
    textAlign: 'center',
  },
  offerModalCouponCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EDFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  offerModalCouponCodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A992F6',
    letterSpacing: 1,
    marginRight: 8,
  },
  offerModalCopyButton: {
    padding: 4,
  },
  offerModalVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A992F6',
    borderRadius: 12,
    paddingVertical: Platform.OS === 'android' ? 18 : 16, // More padding on Android
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'android' ? 12 : 8, // More spacing on Android
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#A992F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 4, // Better visibility on Android
    }),
  },
  offerModalVisitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // FitCoins Redeemable Offers Section
  fitcoinsRedeemableSection: {
    marginBottom: Platform.OS === 'android' ? 36 : 32, // More spacing on Android
  },
  redeemableOfferCard: {
    width: 260, // Slightly larger than standard offer cards
    height: 300, // Taller to accommodate badge and coins info
    backgroundColor: '#FFFFFF', // White background
    borderRadius: 20,
    marginRight: 20,
    overflow: 'hidden', // Ensure card corners remain rounded
    borderWidth: Platform.OS === 'android' ? 1 : 1.5, // Subtle border for card separation
    borderColor: '#B3B3F5', // Slightly darker purple border
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 6, // Higher elevation for distinction
    }),
  },
  redeemableOfferCardImageContainer: {
    width: '100%',
    height: 160, // Larger image area
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 12 : 10,
  },
  redeemableOfferCardImage: {
    width: '100%',
    height: '100%',
  },
  redeemableOfferCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemableOfferBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  redeemableOfferBadgeText: {
    fontSize: Platform.OS === 'android' ? 11 : 10,
    fontWeight: '600',
    color: '#A992F6',
    marginLeft: 4,
  },
  redeemableOfferCardContent: {
    flex: 1,
    padding: Platform.OS === 'android' ? 18 : 16,
    justifyContent: 'space-between',
  },
  redeemableOfferCardTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 6,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
  },
  redeemableOfferCardSubtitle: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#6F6F7B',
    marginBottom: Platform.OS === 'android' ? 12 : 10,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  redeemableOfferCoinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  redeemableOfferCoinsText: {
    fontSize: Platform.OS === 'android' ? 15 : 14,
    fontWeight: 'bold',
    color: '#A992F6',
    marginLeft: 6,
  },
  // FitCoins Redeemable Offer Modal Styles
  redeemableOfferFitCoinsContainer: {
    marginBottom: Platform.OS === 'android' ? 28 : 24,
    alignItems: 'center',
  },
  redeemableOfferFitCoinsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 20 : 18,
    width: '100%',
    marginBottom: Platform.OS === 'android' ? 12 : 8,
  },
  redeemableOfferFitCoinsTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  redeemableOfferFitCoinsLabel: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  redeemableOfferFitCoinsValue: {
    fontSize: Platform.OS === 'android' ? 24 : 22,
    fontWeight: 'bold',
    color: '#A992F6',
    lineHeight: Platform.OS === 'android' ? 30 : 28,
  },
  redeemableOfferInsufficientText: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: Platform.OS === 'android' ? 18 : 16,
  },
  redeemableOfferRedeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A992F6',
    borderRadius: 12,
    paddingVertical: Platform.OS === 'android' ? 18 : 16,
    paddingHorizontal: 24,
    marginBottom: Platform.OS === 'android' ? 16 : 12,
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#A992F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 4,
    }),
  },
  redeemableOfferRedeemButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  redeemableOfferRedeemButtonText: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  redeemableOfferBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#A992F6',
    borderRadius: 12,
    paddingVertical: Platform.OS === 'android' ? 18 : 16,
    paddingHorizontal: 24,
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 2,
    }),
  },
  redeemableOfferBuyButtonText: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: '600',
    color: '#1E3A5F',
    marginLeft: 8,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  // Gift Drawer
  giftDrawerBackdrop: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  giftDrawerBackdropOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  giftDrawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  giftDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4EC',
  },
  giftDrawerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  giftDrawerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftDrawerContent: {
    flex: 1,
  },
  giftDrawerScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  milestonesScroll: {
    paddingRight: 20,
  },
  milestoneBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  milestoneBadgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneBadgeIconAchieved: {
    backgroundColor: '#FFF9E6',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  milestoneBadgeStreak: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  milestoneBadgeCoins: {
    fontSize: 12,
    color: '#6F6F7B',
  },
  milestoneBadgeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Reward History
  historySection: {
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6F6F7B',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
  },
  rewardHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rewardHistoryBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardHistoryBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rewardHistoryContent: {
    flex: 1,
  },
  rewardHistoryBadgeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  rewardHistoryMessage: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  rewardHistoryDate: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  rewardHistoryCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardHistoryCoinsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadgeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  modalBadgeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6F6F7B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalCoinsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCoinsLabel: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 8,
  },
  modalCoinsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCoinsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalBalanceContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    width: '100%',
  },
  modalBalanceLabel: {
    fontSize: 12,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  modalBalanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#A992F6',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default RewardsScreen;
