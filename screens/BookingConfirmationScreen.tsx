import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Coach } from './CoachScreen';

type BookingConfirmationScreenRouteProp = RouteProp<RootStackParamList, 'BookingConfirmation'>;
type BookingConfirmationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BookingConfirmation'>;

const BookingConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<BookingConfirmationScreenNavigationProp>();
  const route = useRoute<BookingConfirmationScreenRouteProp>();
  const { coach, date, time } = route.params;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const selectedDate = new Date(dateString);
    
    if (selectedDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (selectedDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (selectedDate.toDateString() === dayAfter.toDateString()) {
      return 'Day After Tomorrow';
    } else {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${days[selectedDate.getDay()]}, ${months[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
    }
  };

  const duration = coach.duration || 45;

  const handleChatWithCoach = () => {
    navigation.navigate('CoachChat', { coach });
  };

  const handleBackToCoachList = () => {
    // Navigate back to Coach List by navigating to HomeTabs with Coach screen
    navigation.navigate('HomeTabs', { screen: 'Coach' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={64} color="#FFFFFF" />
          </View>
        </View>

        {/* Confirmation Text */}
        <Text style={styles.successTitle}>Session Booked Successfully</Text>

        {/* Booking Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Coach:</Text>
            <Text style={styles.detailValue}>{coach.name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDate(date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{time}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{duration} minutes</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChatWithCoach}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
            <Text style={styles.chatButtonText}>Chat with Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToCoachList}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back-outline" size={20} color="#1E3A5F" />
            <Text style={styles.backButtonText}>Back to Coach List</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 24 : 28,
    paddingVertical: Platform.OS === 'android' ? 40 : 36,
  },
  successIconContainer: {
    marginBottom: Platform.OS === 'android' ? 32 : 28,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontSize: Platform.OS === 'android' ? 28 : 26,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: Platform.OS === 'android' ? 40 : 36,
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 36 : 34,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 24 : 20,
    marginBottom: Platform.OS === 'android' ? 40 : 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 16 : 14,
    paddingBottom: Platform.OS === 'android' ? 16 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    color: '#6F6F7B',
    fontWeight: '500',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  detailValue: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    color: '#1E3A5F',
    fontWeight: '600',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  chatButton: {
    backgroundColor: '#A992F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 16 : 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: 'bold',
    marginLeft: 8,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 16 : 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    color: '#1E3A5F',
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: '600',
    marginLeft: 8,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
});

export default BookingConfirmationScreen;

