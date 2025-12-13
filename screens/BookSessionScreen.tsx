import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Coach } from './CoachScreen';

type BookSessionScreenRouteProp = RouteProp<RootStackParamList, 'BookSession'>;
type BookSessionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BookSession'>;

const BookSessionScreen: React.FC = () => {
  const navigation = useNavigation<BookSessionScreenNavigationProp>();
  const route = useRoute<BookSessionScreenRouteProp>();
  const { coach } = route.params;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Get date options
  const getDateOptions = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const formatDate = (date: Date, label: string) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        label,
        day: days[date.getDay()],
        date: `${date.getDate()} ${months[date.getMonth()]}`,
        value: date.toISOString().split('T')[0],
      };
    };

    return [
      formatDate(today, 'Today'),
      formatDate(tomorrow, 'Tomorrow'),
      formatDate(dayAfter, 'Day After Tomorrow'),
    ];
  };

  const dateOptions = getDateOptions();

  // Time slot options
  const timeSlots = [
    '6:00 AM',
    '7:00 AM',
    '8:00 AM',
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
    '7:00 PM',
    '8:00 PM',
  ];

  const duration = coach.duration || 45;

  const handleConfirmBooking = () => {
    if (selectedDate && selectedTime) {
      navigation.navigate('BookingConfirmation', {
        coach,
        date: selectedDate,
        time: selectedTime,
      });
    }
  };

  const isConfirmEnabled = selectedDate !== null && selectedTime !== null;

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
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Session</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Name */}
        <View style={styles.coachNameContainer}>
          <Text style={styles.coachNameLabel}>Booking with</Text>
          <Text style={styles.coachName}>{coach.name}</Text>
        </View>

        {/* Date Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <View style={styles.dateContainer}>
            {dateOptions.map((dateOption) => (
              <TouchableOpacity
                key={dateOption.value}
                style={[
                  styles.dateOption,
                  selectedDate === dateOption.value && styles.dateOptionSelected,
                ]}
                onPress={() => setSelectedDate(dateOption.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateLabel,
                    selectedDate === dateOption.value && styles.dateLabelSelected,
                  ]}
                >
                  {dateOption.label}
                </Text>
                <Text
                  style={[
                    styles.dateDay,
                    selectedDate === dateOption.value && styles.dateDaySelected,
                  ]}
                >
                  {dateOption.day}
                </Text>
                <Text
                  style={[
                    styles.dateValue,
                    selectedDate === dateOption.value && styles.dateValueSelected,
                  ]}
                >
                  {dateOption.date}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Slot Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          <View style={styles.timeContainer}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  selectedTime === time && styles.timeSlotSelected,
                ]}
                onPress={() => setSelectedTime(time)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    selectedTime === time && styles.timeSlotTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Session Summary */}
        {(selectedDate || selectedTime) && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Session Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Coach:</Text>
              <Text style={styles.summaryValue}>{coach.name}</Text>
            </View>
            {selectedDate && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>
                  {dateOptions.find(d => d.value === selectedDate)?.label || selectedDate}
                </Text>
              </View>
            )}
            {selectedTime && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>{duration} minutes</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirm Booking Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !isConfirmEnabled && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={!isConfirmEnabled}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.confirmButtonText,
            !isConfirmEnabled && styles.confirmButtonTextDisabled,
          ]}>
            Confirm Booking
          </Text>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: Platform.OS === 'android' ? 16 : 20,
    paddingBottom: Platform.OS === 'android' ? 16 : 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 22,
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 26 : 28,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: Platform.OS === 'android' ? 100 : 120,
  },
  coachNameContainer: {
    marginBottom: Platform.OS === 'android' ? 28 : 24,
    alignItems: 'center',
  },
  coachNameLabel: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#6F6F7B',
    marginBottom: 6,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  coachName: {
    fontSize: Platform.OS === 'android' ? 24 : 22,
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 30 : 28,
  },
  section: {
    marginBottom: Platform.OS === 'android' ? 28 : 24,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: Platform.OS === 'android' ? 16 : 14,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: Platform.OS === 'android' ? 16 : 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateOptionSelected: {
    backgroundColor: '#F7F5FF',
    borderColor: '#A992F6',
  },
  dateLabel: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    fontWeight: '600',

    color: '#6F6F7B',
    marginBottom: 4,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  dateLabelSelected: {
    color: '#A992F6',
  },
  dateDay: {
    fontSize: Platform.OS === 'android' ? 12 : 11,
    color: '#6F6F7B',
    marginBottom: 2,
    lineHeight: Platform.OS === 'android' ? 16 : 14,
  },
  dateDaySelected: {
    color: '#1E3A5F',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    color: '#6F6F7B',
    lineHeight: Platform.OS === 'android' ? 18 : 16,
  },
  dateValueSelected: {
    color: '#1E3A5F',
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: Platform.OS === 'android' ? 18 : 16,
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeSlotSelected: {
    backgroundColor: '#F7F5FF',
    borderColor: '#A992F6',
  },
  timeSlotText: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#1E3A5F',
    fontWeight: '500',
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  timeSlotTextSelected: {
    color: '#A992F6',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 20 : 18,
    marginTop: Platform.OS === 'android' ? 8 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: Platform.OS === 'android' ? 12 : 10,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'android' ? 8 : 6,
  },
  summaryLabel: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#6F6F7B',
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  summaryValue: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#1E3A5F',
    fontWeight: '600',
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingTop: Platform.OS === 'android' ? 16 : 14,
    paddingBottom: Platform.OS === 'android' ? 20 : 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  confirmButton: {
    backgroundColor: '#A992F6',
    paddingVertical: Platform.OS === 'android' ? 16 : 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: 'bold',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  confirmButtonTextDisabled: {
    color: '#9E9E9E',
  },
});

export default BookSessionScreen;

