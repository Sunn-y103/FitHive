import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePersistentState, useImmediatePersistentState } from '../hooks/usePersistentState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types for sleep tracking
interface SleepSession {
  id: string;
  start: number; // timestamp
  end: number; // timestamp
  durationMs: number;
}

type TabType = 'Today' | 'Weekly' | 'Monthly';

// Helper function to format duration
const formatDuration = (ms: number): string => {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

// Helper function to format time
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Sample weekly sleep data (hours of sleep per day)
const weeklySleepData = [
  { day: 'Mon', sleep: 6.5, target: 8 },
  { day: 'Tue', sleep: 7.2, target: 8 },
  { day: 'Wed', sleep: 5.8, target: 8 },
  { day: 'Thu', sleep: 7.0, target: 8 },
  { day: 'Fri', sleep: 6.0, target: 8 },
  { day: 'Sat', sleep: 8.5, target: 8 },
  { day: 'Sun', sleep: 4.0, target: 8 },
];

const SleepScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('Weekly');
  
  // Persistent state - automatically saved and restored
  const [isSleeping, setIsSleeping] = usePersistentState<boolean>('sleep_is_sleeping', false);
  const [sleepStart, setSleepStart] = usePersistentState<number | null>('sleep_start_time', null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [sleepSessions, setSleepSessions] = usePersistentState<SleepSession[]>('sleep_sessions', []);
  const [bedtime, setBedtime] = usePersistentState<string>('sleep_bedtime', '22:00');
  const [wakeTime, setWakeTime] = usePersistentState<string>('sleep_wake_time', '07:30');

  // Live elapsed time update when sleeping
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isSleeping && sleepStart) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - sleepStart);
      }, 60000); // Update every minute
      
      // Initial update
      setElapsedTime(Date.now() - sleepStart);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSleeping, sleepStart]);

  // Handle sleep toggle
  const handleSleepToggle = useCallback(async () => {
    if (!isSleeping) {
      // Starting sleep
      if (sleepStart !== null) {
        Alert.alert('Sleep Active', 'A sleep session is already in progress.');
        return;
      }
      
      const now = Date.now();
      await setSleepStart(now);
      await setIsSleeping(true);
      setElapsedTime(0);
      
    } else {
      // Ending sleep
      if (sleepStart === null) {
        Alert.alert('No Session', 'No active sleep session to end.');
        return;
      }
      
      const now = Date.now();
      const durationMs = now - sleepStart;
      
      // Create new session entry
      const newSession: SleepSession = {
        id: Date.now().toString(),
        start: sleepStart,
        end: now,
        durationMs,
      };
      
      // Add to sessions list (prepend for most recent first)
      await setSleepSessions((prev) => [newSession, ...prev]);
      
      // Reset state
      await setSleepStart(null);
      await setIsSleeping(false);
      setElapsedTime(0);
    }
  }, [isSleeping, sleepStart, setIsSleeping, setSleepStart, setSleepSessions]);

  // Calculate average sleep time
  const getAverageSleep = (): string => {
    if (sleepSessions.length === 0) return '0h 0m';
    const totalMs = sleepSessions.reduce((sum, s) => sum + s.durationMs, 0);
    return formatDuration(totalMs / sleepSessions.length);
  };

  // Get last 3 sessions for display
  const recentSessions = sleepSessions.slice(0, 3);

  // Render bar chart
  const renderBarChart = () => {
    const maxHeight = 180;
    const barWidth = (SCREEN_WIDTH - 80) / 7 - 8;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {weeklySleepData.map((item, index) => {
            const sleepHeight = (item.sleep / 10) * maxHeight;
            const targetHeight = (item.target / 10) * maxHeight;

            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barColumn}>
                  {/* Target/background bar */}
                  <View
                    style={[
                      styles.targetBar,
                      { height: targetHeight, width: barWidth },
                    ]}
                  />
                  {/* Actual sleep bar (overlaid) */}
                  <View
                    style={[
                      styles.sleepBar,
                      {
                        height: sleepHeight,
                        width: barWidth * 0.5,
                        position: 'absolute',
                        bottom: 0,
                        left: barWidth * 0.25,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{item.day}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sleep</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sleep Toggle Button - Main Feature */}
        <TouchableOpacity
          style={[
            styles.sleepToggleButton,
            isSleeping && styles.sleepToggleButtonActive,
          ]}
          onPress={handleSleepToggle}
          activeOpacity={0.8}
        >
          <View style={styles.toggleIconContainer}>
            <Ionicons
              name={isSleeping ? 'moon' : 'sunny'}
              size={24}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.toggleButtonText}>
            {isSleeping ? 'Stop Sleeping' : 'Start Sleep'}
          </Text>
          <View
            style={[
              styles.toggleIndicator,
              isSleeping && styles.toggleIndicatorActive,
            ]}
          />
        </TouchableOpacity>

        {/* Current State Card */}
        <View style={styles.stateCard}>
          <View style={styles.stateHeader}>
            <View style={styles.stateIconContainer}>
              <Ionicons
                name={isSleeping ? 'moon' : 'sunny-outline'}
                size={20}
                color={isSleeping ? '#A992F6' : '#F5A623'}
              />
            </View>
            <Text style={styles.stateTitle}>
              {isSleeping ? 'Currently Sleeping' : 'Awake'}
            </Text>
          </View>
          
          {isSleeping && sleepStart ? (
            <View style={styles.stateDetails}>
              <Text style={styles.stateDetailLabel}>
                Started: {formatTime(sleepStart)}
              </Text>
              <Text style={styles.stateDetailValue}>
                Elapsed: {formatDuration(elapsedTime)}
              </Text>
            </View>
          ) : recentSessions.length > 0 ? (
            <View style={styles.stateDetails}>
              <Text style={styles.stateDetailLabel}>
                Last sleep: {formatDuration(recentSessions[0].durationMs)}
              </Text>
              <Text style={styles.stateDetailTime}>
                {formatTime(recentSessions[0].start)} - {formatTime(recentSessions[0].end)}
              </Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>No sleep data recorded yet</Text>
          )}
        </View>

        {/* Average Sleep Summary */}
        {/* <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>Your average time of</Text>
          <Text style={styles.summaryText}>
            sleep a day is{' '}
            <Text style={styles.summaryHighlight}>7h 31 min</Text>
          </Text>
        </View> */}

        {/* Tab Selector */}
        {/* <View style={styles.tabsContainer}>
          {(['Today', 'Weekly', 'Monthly'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Bar Chart */}
        {/* {renderBarChart()} */}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🌟</Text>
            <Text style={styles.statLabel}>Sleep rate</Text>
            <Text style={styles.statValue}>82%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>😴</Text>
            <Text style={styles.statLabel}>Deepsleep</Text>
            <Text style={styles.statValue}>1h 3min</Text>
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>Set your schedule</Text>
          <TouchableOpacity>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleCards}>
          <View style={[styles.scheduleCard, styles.bedtimeCard]}>
            <View style={styles.scheduleIconRow}>
              <Ionicons name="bed" size={18} color="#FFFFFF" />
              <Text style={styles.scheduleLabel}>Bedtime</Text>
            </View>
            <View style={styles.scheduleTimeRow}>
              <Text style={styles.scheduleTime}>{bedtime}</Text>
              <Text style={styles.schedulePeriod}> pm</Text>
            </View>
          </View>

          <View style={[styles.scheduleCard, styles.wakeCard]}>
            <View style={styles.scheduleIconRow}>
              <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              <Text style={styles.scheduleLabel}>Wake up</Text>
            </View>
            <View style={styles.scheduleTimeRow}>
              <Text style={styles.scheduleTime}>{wakeTime}</Text>
              <Text style={styles.schedulePeriod}> am</Text>
            </View>
          </View>
        </View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Recent Sleep Sessions</Text>
            {recentSessions.map((session) => (
              <View key={session.id} style={styles.sessionItem}>
                <View style={styles.sessionLeft}>
                  <View style={styles.sessionDot} />
                  <View>
                    <Text style={styles.sessionDuration}>
                      {formatDuration(session.durationMs)}
                    </Text>
                    <Text style={styles.sessionTime}>
                      {new Date(session.start).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sessionTimeRange}>
                  {formatTime(session.start)} - {formatTime(session.end)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ADDED: Daily Goal container - Fixed at the bottom of Sleep screen */}
        {/* This Goal container is STATIC (unchangeable by user) and stays at the bottom */}
        {/* The container is non-interactive (pointerEvents: 'none') to prevent any user editing */}
        <View style={styles.dailyGoalContainer}>
          <Text style={styles.dailyGoalLabel}>Daily Goal: 7 hours</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
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
  // Sleep Toggle Button
  sleepToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A992F6',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sleepToggleButtonActive: {
    backgroundColor: '#1E3A5F',
  },
  toggleIconContainer: {
    marginRight: 12,
  },
  toggleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  toggleIndicatorActive: {
    backgroundColor: '#4CAF50',
  },
  // State Card
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stateIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F7F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  stateDetails: {
    marginLeft: 46,
  },
  stateDetailLabel: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  stateDetailValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A992F6',
  },
  stateDetailTime: {
    fontSize: 13,
    color: '#6F6F7B',
  },
  noDataText: {
    fontSize: 14,
    color: '#6F6F7B',
    marginLeft: 46,
  },
  // Summary
  summaryContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  summaryHighlight: {
    color: '#5B6EF6',
    fontWeight: 'bold',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#1E3A5F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F6F7B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  // Chart
  chartContainer: {
    marginBottom: 24,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingHorizontal: 10,
  },
  barWrapper: {
    alignItems: 'center',
  },
  barColumn: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  targetBar: {
    backgroundColor: '#E8E8F0',
    borderRadius: 20,
  },
  sleepBar: {
    backgroundColor: '#A992F6',
    borderRadius: 12,
  },
  dayLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#6F6F7B',
    fontWeight: '500',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  // Schedule
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  editButton: {
    fontSize: 14,
    color: '#5B6EF6',
    fontWeight: '600',
  },
  scheduleCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  scheduleCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
  },
  bedtimeCard: {
    backgroundColor: '#A992F6',
  },
  wakeCard: {
    backgroundColor: '#63E5D4',
  },
  scheduleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 8,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scheduleTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  schedulePeriod: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  // Recent Sessions
  recentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A992F6',
    marginRight: 12,
  },
  sessionDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  sessionTime: {
    fontSize: 12,
    color: '#6F6F7B',
    marginTop: 2,
  },
  sessionTimeRange: {
    fontSize: 12,
    color: '#6F6F7B',
  },
  // ADDED: Daily Goal container styles
  // This container is STATIC and uneditable - it displays the daily sleep goal
  // It stays fixed at the bottom of the Sleep screen
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

export default SleepScreen;

