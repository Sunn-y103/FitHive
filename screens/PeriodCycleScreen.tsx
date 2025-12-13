import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePersistentState } from '../hooks/usePersistentState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Days of week abbreviations
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Helper to get week dates starting from Monday
const getWeekDates = (baseDate: Date): { day: string; date: number; fullDate: Date }[] => {
  const dates: { day: string; date: number; fullDate: Date }[] = [];
  const startOfWeek = new Date(baseDate);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    dates.push({
      day: WEEKDAYS[i],
      date: currentDate.getDate(),
      fullDate: currentDate,
    });
  }
  return dates;
};

// Calculate days until next period
const calculateDaysUntilPeriod = (lastPeriodDate: Date, cycleLength: number): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastPeriod = new Date(lastPeriodDate);
  lastPeriod.setHours(0, 0, 0, 0);
  
  const daysSinceLastPeriod = Math.floor(
    (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const daysUntilNext = cycleLength - (daysSinceLastPeriod % cycleLength);
  return daysUntilNext === cycleLength ? 0 : daysUntilNext;
};

// Get fertility status based on cycle day
const getFertilityStatus = (daysUntilPeriod: number, cycleLength: number): string => {
  const cycleDay = cycleLength - daysUntilPeriod;
  
  // Ovulation typically occurs around day 14 of a 28-day cycle
  const ovulationDay = Math.round(cycleLength / 2);
  const fertileDaysStart = ovulationDay - 5;
  const fertileDaysEnd = ovulationDay + 1;
  
  if (cycleDay >= fertileDaysStart && cycleDay <= fertileDaysEnd) {
    return 'High chance of getting pregnant';
  } else if (cycleDay >= fertileDaysStart - 3 && cycleDay < fertileDaysStart) {
    return 'Medium chance of getting pregnant';
  }
  return 'Low chance of getting pregnant';
};

const PeriodCycleScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Persistent state - automatically saved and restored
  const [selectedDateIndex, setSelectedDateIndex] = usePersistentState<number>('period_cycle_selected_date', 5);
  const [lastPeriodDateISO, setLastPeriodDateISO] = usePersistentState<string>(
    'period_cycle_last_date',
    new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [cycleLength, setCycleLength] = usePersistentState<number>('period_cycle_length', 28);
  
  // Convert ISO string to Date for calculations
  const lastPeriodDate = useMemo(() => new Date(lastPeriodDateISO), [lastPeriodDateISO]);
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempLastPeriodDay, setTempLastPeriodDay] = useState('');
  const [tempLastPeriodMonth, setTempLastPeriodMonth] = useState('');
  const [tempCycleLength, setTempCycleLength] = useState('');
  
  // Get current week dates
  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  
  // Calculate days until period
  const daysUntilPeriod = useMemo(
    () => calculateDaysUntilPeriod(lastPeriodDate, cycleLength),
    [lastPeriodDate, cycleLength]
  );
  
  // Get fertility status
  const fertilityStatus = useMemo(
    () => getFertilityStatus(daysUntilPeriod, cycleLength),
    [daysUntilPeriod, cycleLength]
  );
  
  // Open modal with current values
  const handleOpenModal = () => {
    setTempLastPeriodDay(lastPeriodDate.getDate().toString());
    setTempLastPeriodMonth((lastPeriodDate.getMonth() + 1).toString());
    setTempCycleLength(cycleLength.toString());
    setIsModalVisible(true);
  };
  
  // Save modal values
  const handleSaveModal = async () => {
    const day = parseInt(tempLastPeriodDay, 10);
    const month = parseInt(tempLastPeriodMonth, 10);
    const newCycleLength = parseInt(tempCycleLength, 10);
    
    if (day > 0 && day <= 31 && month > 0 && month <= 12 && newCycleLength > 0) {
      const newDate = new Date();
      newDate.setMonth(month - 1);
      newDate.setDate(day);
      
      // If the date is in the future, use previous year
      if (newDate > new Date()) {
        newDate.setFullYear(newDate.getFullYear() - 1);
      }
      
      await setLastPeriodDateISO(newDate.toISOString());
      await setCycleLength(newCycleLength);
      setIsModalVisible(false);
    }
  };

  // Menstrual health articles data
  const articles = [
    {
      id: '1',
      title: "Craving sweets on your period? Here's why & what to do about it",
      color: '#E8D4F0',
    },
    {
      id: '2',
      title: 'Is birth control for your menstrual health?',
      color: '#F5D4C8',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cycle tracking</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week Date Selector */}
        <View style={styles.weekSelector}>
          {weekDates.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dateItem}
              onPress={() => setSelectedDateIndex(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.dayText}>{item.day}</Text>
              <View
                style={[
                  styles.dateCircle,
                  selectedDateIndex === index && styles.dateCircleSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dateText,
                    selectedDateIndex === index && styles.dateTextSelected,
                  ]}
                >
                  {item.date.toString().padStart(2, '0')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Period Circle */}
        <View style={styles.circleContainer}>
          <View style={styles.mainCircle}>
            <Text style={styles.periodLabel}>Period in</Text>
            <Text style={styles.periodDays}>{daysUntilPeriod} days</Text>
            <Text style={styles.fertilityText}>{fertilityStatus}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleOpenModal}
            >
              <Text style={styles.editButtonText}>Edit period dates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How are you feeling section */}
        <Text style={styles.sectionTitle}>How are you feeling today?</Text>
        <View style={styles.feelingCards}>
          <TouchableOpacity style={styles.feelingCard}>
            <View style={styles.feelingIconContainer}>
              <Ionicons name="bookmark-outline" size={24} color="#1E3A5F" />
            </View>
            <Text style={styles.feelingCardText}>Share your symtoms</Text>
            <Text style={styles.feelingCardText}>with us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.feelingCard}>
            <View style={[styles.feelingIconContainer, styles.feelingIconOrange]}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#F5A623" />
            </View>
            <Text style={styles.feelingCardText}>Here's your daily</Text>
            <Text style={styles.feelingCardText}>insights</Text>
          </TouchableOpacity>
        </View>

        {/* Menstrual Health Section */}
        <View style={styles.menstrualHeader}>
          <Text style={styles.menstrualTitle}>Menstrual health</Text>
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>View more</Text>
            <Ionicons name="chevron-forward" size={16} color="#6F6F7B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.articlesContainer}
        >
          {articles.map((article) => (
            <TouchableOpacity key={article.id} style={styles.articleCard}>
              <View
                style={[styles.articleImage, { backgroundColor: article.color }]}
              >
                <Ionicons
                  name={article.id === '1' ? 'ice-cream-outline' : 'medical-outline'}
                  size={40}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.articleTitle} numberOfLines={3}>
                {article.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cycle Info Card */}
        <View style={styles.cycleInfoCard}>
          <View style={styles.cycleInfoRow}>
            <View style={styles.cycleInfoItem}>
              <Text style={styles.cycleInfoLabel}>Cycle Length</Text>
              <Text style={styles.cycleInfoValue}>{cycleLength} days</Text>
            </View>
            <View style={styles.cycleInfoDivider} />
            <View style={styles.cycleInfoItem}>
              <Text style={styles.cycleInfoLabel}>Last Period</Text>
              <Text style={styles.cycleInfoValue}>
                {lastPeriodDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Period Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Period Dates</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1E3A5F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Last Period Date</Text>
            <View style={styles.dateInputRow}>
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="DD"
                  placeholderTextColor="#A0A0A0"
                  value={tempLastPeriodDay}
                  onChangeText={setTempLastPeriodDay}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.dateInputLabel}>Day</Text>
              </View>
              <Text style={styles.dateSeparator}>/</Text>
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="MM"
                  placeholderTextColor="#A0A0A0"
                  value={tempLastPeriodMonth}
                  onChangeText={setTempLastPeriodMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.dateInputLabel}>Month</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Cycle Length (days)</Text>
            <TextInput
              style={styles.cycleLengthInput}
              placeholder="28"
              placeholderTextColor="#A0A0A0"
              value={tempCycleLength}
              onChangeText={setTempCycleLength}
              keyboardType="number-pad"
              maxLength={2}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveModal}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
    // Android-specific: Add padding top to account for status bar
    ...(Platform.OS === 'android' && {
      paddingTop: StatusBar.currentHeight || 0,
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 18 : 16, // More padding on Android
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 19 : 20, // Slightly smaller on Android
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 24 : 26,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 0, // Add top padding on Android
    paddingBottom: Platform.OS === 'android' ? 50 : 40, // More bottom padding on Android
  },
  // Week Selector
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  dateItem: {
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dateCircleSelected: {
    backgroundColor: '#7B8CDE',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  // Main Circle
  circleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainCircle: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    borderRadius: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  periodLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  periodDays: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  fertilityText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.85,
    marginBottom: 20,
  },
  editButton: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  // Feeling Cards
  feelingCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  feelingCard: {
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
  feelingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  feelingIconOrange: {
    backgroundColor: '#FFF0E0',
  },
  feelingCardText: {
    fontSize: 13,
    color: '#6F6F7B',
    textAlign: 'center',
  },
  // Menstrual Health Section
  menstrualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menstrualTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#6F6F7B',
    marginRight: 4,
  },
  // Articles
  articlesContainer: {
    paddingRight: 20,
    marginBottom: 24,
  },
  articleCard: {
    width: SCREEN_WIDTH * 0.55,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  articleImage: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    padding: 12,
    lineHeight: 20,
  },
  // Cycle Info Card
  cycleInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cycleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cycleInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  cycleInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E8E8F0',
  },
  cycleInfoLabel: {
    fontSize: 13,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  cycleInfoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateInputContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateInput: {
    width: '100%',
    height: 56,
    backgroundColor: '#F7F7FA',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E8E8F0',
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#6F6F7B',
    marginTop: 4,
  },
  dateSeparator: {
    fontSize: 24,
    color: '#6F6F7B',
    marginHorizontal: 12,
  },
  cycleLengthInput: {
    height: 56,
    backgroundColor: '#F7F7FA',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E8E8F0',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#A992F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PeriodCycleScreen;

