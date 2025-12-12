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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAndGenerateReward, HealthSummary } from '../utils/rewardFlow';
import { loadJSON, fitcoinsKey, milestonesKey, todayKey, rewardStorageKey, getUserKey } from '../utils/storageUtils';
import { useHealthData } from '../contexts/HealthDataContext';
import { OPENAI_API_KEY } from '@env';
import { useAuth } from '../contexts/AuthContext';
import { loadDailyMissionStatus, calculateMissionStatus, saveDailyMissionStatus } from '../utils/dailyMissionManager';
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
  const { waterValue, burnedValue, nutritionValue, sleepValue } = useHealthData();
  const [canClaimReward, setCanClaimReward] = useState<boolean>(false);

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

  // Animation values for coin counter
  const coinAnimation = useRef(new Animated.Value(0)).current;
  const previousBalanceRef = useRef(0);

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
      const calculatedStatus = calculateMissionStatus(
        waterValue,
        burnedValue,
        nutritionValue,
        sleepValue
      );

      // Save the calculated status to AsyncStorage for persistence
      await saveDailyMissionStatus(user.id, calculatedStatus);

      // Update canClaimReward state immediately
      setCanClaimReward(calculatedStatus.canClaimReward);

      // Debug log to help troubleshoot
      if (__DEV__) {
        console.log('🎯 Mission status updated:', {
          completed: calculatedStatus.completedCount,
          canClaim: calculatedStatus.canClaimReward,
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
        });
      }
    } catch (error) {
      console.error('Error updating mission status:', error);
      setCanClaimReward(false);
    }
  }, [user?.id, waterValue, burnedValue, nutritionValue, sleepValue]);

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
    } catch (error) {
      console.error('Error loading reward data:', error);
      // On error, clear data to prevent showing wrong user's data
      if (!user?.id) {
        setFitcoinsBalance(0);
        setDisplayBalance(0);
        setRewardHistory([]);
        setMilestones([]);
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
    // First, check if user can claim reward (3+ missions completed)
    if (!canClaimReward) {
      Alert.alert(
        'Reward Locked',
        'Complete at least 3 daily missions to claim your reward.\n\nGo to Home to check your mission progress.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);

    try {
      // Recalculate mission status from current health values (most up-to-date)
      let canClaim = false;
      if (user?.id) {
        const calculatedStatus = calculateMissionStatus(
          waterValue,
          burnedValue,
          nutritionValue,
          sleepValue
        );
        canClaim = calculatedStatus.canClaimReward;
        
        // Save the latest status
        await saveDailyMissionStatus(user.id, calculatedStatus);
        setCanClaimReward(canClaim);
      }
      
      // Double-check after recalculation
      if (!canClaim) {
        Alert.alert(
          'Reward Locked',
          `Complete at least 3 daily missions to claim your reward.\n\nCurrent progress: ${calculateMissionStatus(waterValue, burnedValue, nutritionValue, sleepValue).completedCount}/4 missions completed.`,
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

      // New reward generated - show modal
      setCurrentReward(result.reward);
      setNewBalance(result.newBalance);
      
      // Animate coin counter
      if (result.newBalance !== undefined) {
        animateCoinCounter(previousBalanceRef.current, result.newBalance);
        previousBalanceRef.current = result.newBalance;
      }

      setRewardModalVisible(true);
      
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
    const isDisabled = loading || !canClaimReward;
    
    return (
      <TouchableOpacity
        style={[
          styles.claimButton,
          (loading || !canClaimReward) && styles.claimButtonDisabled,
        ]}
        onPress={handleClaimReward}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons 
              name={canClaimReward ? "gift" : "lock-closed"} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.claimButtonText}>
              {canClaimReward ? 'Claim Reward' : 'Reward Locked'}
            </Text>
          </>
        )}
      </TouchableOpacity>
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
        </View>

        {/* FitCoins Balance */}
        {renderFitCoinsHeader()}

        {/* Claim Reward Button */}
        {renderClaimButton()}

        {/* Milestone Badges */}
        {renderMilestoneBadges()}

        {/* Reward History */}
        {renderRewardHistory()}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Reward Modal */}
      {renderRewardModal()}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A5F',
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
  },
  claimButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
