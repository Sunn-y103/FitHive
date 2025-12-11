import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePersistentState } from '../hooks/usePersistentState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface Milestone {
  id: string;
  days: number;
  label: string;
  achieved: boolean;
  reward: string;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  category: 'discount' | 'treat' | 'premium';
  icon: keyof typeof Ionicons.glyphMap;
  unlocked: boolean;
  streakRequired: number;
  discount?: string;
  color: string;
}

// =====================================================
// MOCK DATA
// =====================================================

const MILESTONES: Milestone[] = [
  { id: '1', days: 7, label: '7 Days', achieved: true, reward: '10% Off' },
  { id: '2', days: 14, label: '14 Days', achieved: true, reward: '20% Off' },
  { id: '3', days: 30, label: '30 Days', achieved: false, reward: '30% Off' },
  { id: '4', days: 60, label: '60 Days', achieved: false, reward: 'Premium' },
  { id: '5', days: 90, label: '90 Days', achieved: false, reward: 'VIP' },
];

const REWARDS: Reward[] = [
  {
    id: '1',
    title: 'Nike Store Discount',
    description: '20% off on all fitness gear',
    category: 'discount',
    icon: 'fitness-outline',
    unlocked: true,
    streakRequired: 14,
    discount: '20%',
    color: '#FF6B6B',
  },
  {
    id: '2',
    title: 'Guilt-Free Dessert',
    description: 'Free dessert at partner cafes',
    category: 'treat',
    icon: 'ice-cream-outline',
    unlocked: true,
    streakRequired: 7,
    color: '#FFB84D',
  },
  {
    id: '3',
    title: 'Adidas Voucher',
    description: '15% off on sports apparel',
    category: 'discount',
    icon: 'shirt-outline',
    unlocked: false,
    streakRequired: 21,
    discount: '15%',
    color: '#4ECDC4',
  },
  {
    id: '4',
    title: 'Premium Meal Plan',
    description: '1 week free meal planning',
    category: 'premium',
    icon: 'restaurant-outline',
    unlocked: false,
    streakRequired: 30,
    color: '#A992F6',
  },
  {
    id: '5',
    title: 'Spa Day Pass',
    description: 'Relaxation session voucher',
    category: 'treat',
    icon: 'sparkles-outline',
    unlocked: false,
    streakRequired: 45,
    color: '#FF9FF3',
  },
  {
    id: '6',
    title: 'Protein Shake Bundle',
    description: 'Free protein supplements',
    category: 'discount',
    icon: 'flask-outline',
    unlocked: false,
    streakRequired: 60,
    discount: '100%',
    color: '#95E1D3',
  },
];

// =====================================================
// COMPONENT
// =====================================================

const RewardsScreen: React.FC = () => {
  // Mock streak data - in production, fetch from your data source
  const [currentStreak, setCurrentStreak] = usePersistentState<number>('currentStreak', 12);
  const [totalDays, setTotalDays] = usePersistentState<number>('totalDays', 45);

  // Calculate next milestone
  const nextMilestone = MILESTONES.find(m => !m.achieved) || MILESTONES[MILESTONES.length - 1];
  const progressToNext = nextMilestone
    ? Math.min((currentStreak / nextMilestone.days) * 100, 100)
    : 100;

  // Filter rewards based on streak
  const availableRewards = REWARDS.filter(
    reward => reward.unlocked || currentStreak >= reward.streakRequired
  );
  const lockedRewards = REWARDS.filter(
    reward => !reward.unlocked && currentStreak < reward.streakRequired
  );

  // Get reward icon color based on category
  const getRewardIconColor = (category: Reward['category']) => {
    switch (category) {
      case 'discount':
        return '#FF6B6B';
      case 'treat':
        return '#FFB84D';
      case 'premium':
        return '#A992F6';
      default:
        return '#6F6F7B';
    }
  };

  // Render milestone tracker
  const renderMilestoneTracker = () => {
    return (
      <View style={styles.milestoneContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.milestoneScrollContent}
        >
          {MILESTONES.map((milestone, index) => {
            const isActive = currentStreak >= milestone.days;
            const isNext = !milestone.achieved && currentStreak < milestone.days;
            const progress = Math.min((currentStreak / milestone.days) * 100, 100);

            return (
              <View key={milestone.id} style={styles.milestoneItem}>
                <View style={styles.milestoneContent}>
                  {/* Milestone Circle */}
                  <View
                    style={[
                      styles.milestoneCircle,
                      isActive && styles.milestoneCircleActive,
                      isNext && styles.milestoneCircleNext,
                    ]}
                  >
                    {isActive ? (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.milestoneDays}>{milestone.days}</Text>
                    )}
                  </View>

                  {/* Milestone Label */}
                  <Text
                    style={[
                      styles.milestoneLabel,
                      isActive && styles.milestoneLabelActive,
                    ]}
                  >
                    {milestone.label}
                  </Text>

                  {/* Milestone Reward */}
                  <Text
                    style={[
                      styles.milestoneReward,
                      isActive && styles.milestoneRewardActive,
                    ]}
                  >
                    {milestone.reward}
                  </Text>

                  {/* Progress Bar (only for next milestone) */}
                  {isNext && (
                    <View style={styles.milestoneProgressBar}>
                      <View
                        style={[
                          styles.milestoneProgressFill,
                          { width: `${progress}%` },
                        ]}
                      />
                    </View>
                  )}
                </View>

                {/* Connector Line */}
                {index < MILESTONES.length - 1 && (
                  <View
                    style={[
                      styles.milestoneConnector,
                      isActive && styles.milestoneConnectorActive,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Render reward card
  const renderRewardCard = (reward: Reward) => {
    const isUnlocked = reward.unlocked || currentStreak >= reward.streakRequired;
    const iconColor = getRewardIconColor(reward.category);

    return (
      <TouchableOpacity
        key={reward.id}
        style={[
          styles.rewardCard,
          !isUnlocked && styles.rewardCardLocked,
        ]}
        activeOpacity={0.7}
        disabled={!isUnlocked}
      >
        <View style={styles.rewardCardContent}>
          {/* Icon */}
          <View
            style={[
              styles.rewardIconContainer,
              { backgroundColor: `${iconColor}15` },
            ]}
          >
            <Ionicons
              name={reward.icon}
              size={32}
              color={isUnlocked ? iconColor : '#C0C0C0'}
            />
          </View>

          {/* Lock Icon for locked rewards */}
          {!isUnlocked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            </View>
          )}

          {/* Content */}
          <View style={styles.rewardCardText}>
            <View style={styles.rewardHeader}>
              <Text
                style={[
                  styles.rewardTitle,
                  !isUnlocked && styles.rewardTitleLocked,
                ]}
              >
                {reward.title}
              </Text>
              {reward.discount && isUnlocked && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{reward.discount}</Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.rewardDescription,
                !isUnlocked && styles.rewardDescriptionLocked,
              ]}
            >
              {reward.description}
            </Text>

            {!isUnlocked && (
              <View style={styles.streakRequirement}>
                <Ionicons name="flame" size={14} color="#FFB84D" />
                <Text style={styles.streakRequirementText}>
                  {reward.streakRequired} day streak required
                </Text>
              </View>
            )}
          </View>

          {/* Arrow */}
          {isUnlocked && (
            <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="gift-outline" size={24} color="#1E3A5F" />
          </TouchableOpacity>
        </View>

        {/* Streak Display Card */}
        <View style={styles.streakCard}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakGradient}
          >
            <View style={styles.streakContent}>
              <View style={styles.streakIconContainer}>
                <Ionicons name="flame" size={40} color="#FFFFFF" />
              </View>
              <View style={styles.streakTextContainer}>
                <Text style={styles.streakLabel}>Current Streak</Text>
                <Text style={styles.streakValue}>{currentStreak}</Text>
                <Text style={styles.streakSubtext}>days in a row!</Text>
              </View>
              <View style={styles.streakStats}>
                <Text style={styles.streakStatsLabel}>Total Days</Text>
                <Text style={styles.streakStatsValue}>{totalDays}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Progress to Next Milestone */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Next Milestone</Text>
            <Text style={styles.progressSubtitle}>
              {nextMilestone.days} Day Streak
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressToNext}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentStreak} / {nextMilestone.days} days
            </Text>
          </View>
        </View>

        {/* Milestone Tracker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {renderMilestoneTracker()}
        </View>

        {/* Available Rewards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Rewards</Text>
            <Text style={styles.sectionSubtitle}>
              {availableRewards.length} unlocked
            </Text>
          </View>
          {availableRewards.map(reward => renderRewardCard(reward))}
        </View>

        {/* Locked Rewards */}
        {lockedRewards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Coming Soon</Text>
              <Text style={styles.sectionSubtitle}>
                Keep your streak going!
              </Text>
            </View>
            {lockedRewards.map(reward => renderRewardCard(reward))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Streak Card
  streakCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  streakGradient: {
    padding: 24,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  streakTextContainer: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    fontWeight: '600',
  },
  streakValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  streakSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  streakStats: {
    alignItems: 'flex-end',
  },
  streakStatsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  streakStatsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Progress Card
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#6F6F7B',
    fontWeight: '600',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6F6F7B',
    textAlign: 'right',
  },
  // Section
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6F6F7B',
    fontWeight: '600',
  },
  // Milestone Tracker
  milestoneContainer: {
    marginTop: 8,
  },
  milestoneScrollContent: {
    paddingRight: 20,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  milestoneContent: {
    alignItems: 'center',
    minWidth: 80,
  },
  milestoneCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneCircleActive: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  milestoneCircleNext: {
    backgroundColor: '#A992F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  milestoneDays: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6F6F7B',
  },
  milestoneLabel: {
    fontSize: 12,
    color: '#6F6F7B',
    marginBottom: 4,
    fontWeight: '600',
  },
  milestoneLabelActive: {
    color: '#1E3A5F',
    fontWeight: 'bold',
  },
  milestoneReward: {
    fontSize: 11,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  milestoneRewardActive: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  milestoneProgressBar: {
    width: 56,
    height: 4,
    backgroundColor: '#E8E8F0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    backgroundColor: '#A992F6',
    borderRadius: 2,
  },
  milestoneConnector: {
    width: 40,
    height: 2,
    backgroundColor: '#E8E8F0',
    marginHorizontal: 4,
  },
  milestoneConnectorActive: {
    backgroundColor: '#FFD700',
  },
  // Reward Card
  rewardCard: {
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
  rewardCardLocked: {
    opacity: 0.6,
  },
  rewardCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6F6F7B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  rewardCardText: {
    flex: 1,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    flex: 1,
  },
  rewardTitleLocked: {
    color: '#A0A0A0',
  },
  discountBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rewardDescription: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 8,
  },
  rewardDescriptionLocked: {
    color: '#C0C0C0',
  },
  streakRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  streakRequirementText: {
    fontSize: 12,
    color: '#FFB84D',
    marginLeft: 4,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default RewardsScreen;
