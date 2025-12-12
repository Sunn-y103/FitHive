/**
 * Claim Reward Button Component
 * 
 * This component demonstrates how to use the reward flow utilities to:
 * - Check if a reward exists for today (idempotency)
 * - Generate a new reward using OpenAI
 * - Display the reward to the user
 * - Update FitCoins balance
 * 
 * USAGE EXAMPLE:
 * ```tsx
 * import { OPENAI_API_KEY } from '@env';
 * import ClaimRewardButton from './components/ClaimRewardButton';
 * 
 * const summary = {
 *   water: 2.5,
 *   burned: 350,
 *   nutrition: 2200,
 *   sleep: 7.5,
 *   streak: 5,
 *   completedAll: true // All missions completed
 * };
 * 
 * <ClaimRewardButton
 *   apiKey={OPENAI_API_KEY}
 *   summary={summary}
 *   autoClaim={true}
 *   onReward={(reward, newBalance) => {
 *     console.log('Reward claimed!', reward);
 *     console.log('New balance:', newBalance);
 *   }}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkAndGenerateReward } from '../utils/rewardFlow';
import { loadJSON, fitcoinsKey } from '../utils/storageUtils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Health summary with completion status
 */
export interface RewardSummary {
  water: number | null;
  burned: number | null;
  nutrition: number | null;
  sleep: number | null;
  streak: number;
  completedAll?: boolean; // Optional flag to indicate all missions completed
}

/**
 * Reward object structure
 */
export interface Reward {
  date: string;
  message: string;
  badge: string;
  coins: number;
  generatedAt?: string;
}

/**
 * Component props
 */
export interface ClaimRewardButtonProps {
  apiKey: string;
  summary: RewardSummary;
  autoClaim?: boolean;
  onReward?: (reward: Reward, newBalance?: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ClaimRewardButton: React.FC<ClaimRewardButtonProps> = ({
  apiKey,
  summary,
  autoClaim = false,
  onReward,
}) => {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  const [loading, setLoading] = useState(false);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const [newBalance, setNewBalance] = useState<number | undefined>(undefined);
  const [isFromCache, setIsFromCache] = useState(false);
  const [fitcoinsBalance, setFitcoinsBalance] = useState<number>(0);

  // ========================================================================
  // LOAD FITCOINS BALANCE
  // ========================================================================
  // Load and display the current FitCoins balance from AsyncStorage
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const balance = await loadJSON(fitcoinsKey);
        if (typeof balance === 'number' && balance >= 0) {
          setFitcoinsBalance(balance);
        }
      } catch (error) {
        console.error('Error loading FitCoins balance:', error);
      }
    };

    loadBalance();
  }, []);

  // ========================================================================
  // AUTO-CLAIM BEHAVIOR
  // ========================================================================
  // If autoClaim is true and all missions are completed, automatically
  // trigger the reward flow when component mounts or summary changes
  useEffect(() => {
    if (autoClaim && summary.completedAll) {
      handleClaimReward();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClaim, summary.completedAll]);

  // ========================================================================
  // CLAIM REWARD HANDLER
  // ========================================================================
  // This is the main function that calls the reward flow
  // It handles all the logic: idempotency, OpenAI call, parsing, saving
  const handleClaimReward = async () => {
    // Check if all missions are completed
    if (!summary.completedAll) {
      Alert.alert(
        'Complete All Missions',
        'Please complete all daily missions to claim your reward!',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      Alert.alert(
        'API Key Missing',
        'OpenAI API key is required to generate rewards.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Set loading state (disables button and shows spinner)
    setLoading(true);

    try {
      // Call the reward flow function
      // This handles: idempotency check, OpenAI call, parsing, saving, balance update
      const result = await checkAndGenerateReward({
        apiKey,
        summary: {
          water: summary.water,
          burned: summary.burned,
          nutrition: summary.nutrition,
          sleep: summary.sleep,
          streak: summary.streak,
        },
      });

      // Update state with reward data
      setCurrentReward(result.reward);
      setIsFromCache(result.fromCache);

      // Update balance if new reward was generated
      if (result.newBalance !== undefined) {
        setNewBalance(result.newBalance);
        setFitcoinsBalance(result.newBalance);
      } else if (result.fromCache) {
        // If from cache, load current balance to display
        const balance = await loadJSON(fitcoinsKey);
        if (typeof balance === 'number') {
          setFitcoinsBalance(balance);
        }
      }

      // Show appropriate UI based on whether reward was cached or new
      if (result.fromCache) {
        // Reward already claimed today - show alert
        Alert.alert(
          'Reward Already Claimed',
          `You've already claimed your reward for today!\n\nBadge: ${result.reward.badge}\nCoins: ${result.reward.coins}`,
          [{ text: 'OK' }]
        );
      } else {
        // New reward generated - show modal
        setRewardModalVisible(true);
      }

      // Call parent callback if provided
      if (onReward) {
        onReward(result.reward, result.newBalance);
      }
    } catch (error) {
      // Handle errors gracefully
      // The reward flow should never throw (it uses fallback), but just in case
      console.error('Error claiming reward:', error);
      Alert.alert(
        'Error',
        'Failed to generate reward. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      // Always re-enable button after operation completes
      setLoading(false);
    }
  };

  // ========================================================================
  // MODAL CLOSE HANDLER
  // ========================================================================
  const handleCloseModal = () => {
    setRewardModalVisible(false);
    setCurrentReward(null);
    setNewBalance(undefined);
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <View style={styles.container}>
      {/* FitCoins Balance Display */}
      <View style={styles.balanceContainer}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={styles.balanceText}>
          Balance: {fitcoinsBalance} FitCoins
        </Text>
      </View>

      {/* Claim Reward Button */}
      {!autoClaim && (
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleClaimReward}
          disabled={loading}
          accessibilityLabel="Claim daily reward"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="gift" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Claim Reward</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Loading Indicator for Auto-Claim */}
      {autoClaim && loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#A992F6" />
          <Text style={styles.loadingText}>Generating your reward...</Text>
        </View>
      )}

      {/* Reward Modal */}
      <Modal
        visible={rewardModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <Ionicons name="close" size={24} color="#1E3A5F" />
            </TouchableOpacity>

            {currentReward && (
              <>
                {/* Badge Display */}
                <View style={styles.badgeContainer}>
                  <View style={styles.badgeIcon}>
                    <Ionicons name="trophy" size={48} color="#FFD700" />
                  </View>
                  <Text style={styles.badgeName}>{currentReward.badge}</Text>
                </View>

                {/* Message */}
                <Text style={styles.message}>{currentReward.message}</Text>

                {/* Coins Earned */}
                <View style={styles.coinsContainer}>
                  <Text style={styles.coinsLabel}>Coins Earned</Text>
                  <View style={styles.coinsValueContainer}>
                    <Text style={styles.coinsValue}>+{currentReward.coins}</Text>
                    <Ionicons name="add-circle" size={24} color="#4CAF50" />
                  </View>
                </View>

                {/* New Balance (if available) */}
                {newBalance !== undefined && (
                  <View style={styles.balanceDisplay}>
                    <Text style={styles.balanceLabel}>New Balance</Text>
                    <Text style={styles.balanceValue}>{newBalance} FitCoins</Text>
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginLeft: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A992F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 180,
    gap: 8,
    shadowColor: '#A992F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6F6F7B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  badgeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  badgeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6F6F7B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  coinsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  coinsLabel: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 8,
  },
  coinsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  balanceDisplay: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    width: '100%',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  modalCloseButton: {
    backgroundColor: '#A992F6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ClaimRewardButton;

