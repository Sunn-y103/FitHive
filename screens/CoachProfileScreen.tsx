import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Coach } from './CoachScreen';

type CoachProfileScreenRouteProp = RouteProp<RootStackParamList, 'CoachProfile'>;
type CoachProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CoachProfile'>;

const CoachProfileScreen: React.FC = () => {
  const navigation = useNavigation<CoachProfileScreenNavigationProp>();
  const route = useRoute<CoachProfileScreenRouteProp>();
  const { coach } = route.params;

  // Default values if not provided
  const price = coach.price || 499;
  const duration = coach.duration || 45;
  const certifications = coach.certifications || ['Certified Personal Trainer'];
  const aboutText = coach.about || `${coach.name} is a certified fitness coach with ${coach.experience} years of experience in ${coach.specialization.toLowerCase()}. They are dedicated to helping clients achieve their fitness goals through personalized training programs and expert guidance.`;

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={20} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={20} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={20} color="#FFD700" />
      );
    }

    return stars;
  };

  const handleBookSession = () => {
    navigation.navigate('BookSession', { coach });
  };

  const handleChatWithCoach = () => {
    navigation.navigate('CoachChat', { coach });
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: coach.image }}
            style={styles.coachImage}
            resizeMode="cover"
          />
        </View>

        {/* Coach Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.coachName}>{coach.name}</Text>
          <Text style={styles.specialization}>{coach.specialization}</Text>
          
          <View style={styles.ratingContainer}>
            {renderStars(coach.rating)}
            <Text style={styles.ratingText}>{coach.rating}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#A992F6" />
            <Text style={styles.detailText}>
              {coach.experience}+ years of professional experience
            </Text>
          </View>
        </View>

        {/* About Coach Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About Coach</Text>
          <Text style={styles.sectionText}>
            {aboutText}
          </Text>
        </View>

        {/* Certifications Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          <View style={styles.certificationsContainer}>
            {certifications.map((cert, index) => (
              <View key={index} style={styles.certificationTag}>
                <Ionicons name="checkmark-circle" size={16} color="#A992F6" />
                <Text style={styles.certificationText}>{cert}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Session Information Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Session Information</Text>
          <View style={styles.sessionInfoRow}>
            <View style={styles.sessionInfoItem}>
              <Ionicons name="cash-outline" size={24} color="#A992F6" />
              <Text style={styles.sessionInfoLabel}>Price per session</Text>
              <Text style={styles.sessionInfoValue}>₹{price} / session</Text>
            </View>
            <View style={styles.sessionInfoDivider} />
            <View style={styles.sessionInfoItem}>
              <Ionicons name="time-outline" size={24} color="#A992F6" />
              <Text style={styles.sessionInfoLabel}>Session duration</Text>
              <Text style={styles.sessionInfoValue}>{duration} minutes</Text>
            </View>
          </View>
        </View>

        {/* Spacer for fixed buttons */}
        <View style={styles.buttonSpacer} />
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={styles.fixedButtonsContainer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookSession}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
          <Text style={styles.bookButtonText}>Book Session</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatWithCoach}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          <Text style={styles.chatButtonText}>Chat with Coach</Text>
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
    paddingBottom: Platform.OS === 'android' ? 100 : 120,
  },
  imageContainer: {
    width: '100%',
    height: Platform.OS === 'android' ? 300 : 280,
    backgroundColor: '#E8E8F0',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  coachImage: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: Platform.OS === 'android' ? 24 : 20,
    marginTop: -40,
    marginHorizontal: Platform.OS === 'android' ? 20 : 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  coachName: {
    fontSize: Platform.OS === 'android' ? 26 : 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 8,
    lineHeight: Platform.OS === 'android' ? 32 : 30,
  },
  specialization: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    color: '#6F6F7B',
    marginBottom: 12,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingText: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: '600',
    color: '#1E3A5F',
    marginLeft: 8,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  detailText: {
    fontSize: Platform.OS === 'android' ? 15 : 14,
    color: '#1E3A5F',
    marginLeft: 12,
    lineHeight: Platform.OS === 'android' ? 21 : 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: Platform.OS === 'android' ? 24 : 20,
    marginHorizontal: Platform.OS === 'android' ? 20 : 24,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 12,
    lineHeight: Platform.OS === 'android' ? 26 : 24,
  },
  sectionText: {
    fontSize: Platform.OS === 'android' ? 15 : 14,
    color: '#6F6F7B',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  certificationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  certificationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FF',
    paddingHorizontal: Platform.OS === 'android' ? 14 : 12,
    paddingVertical: Platform.OS === 'android' ? 8 : 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  certificationText: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    color: '#1E3A5F',
    marginLeft: 6,
    fontWeight: '500',
    lineHeight: Platform.OS === 'android' ? 18 : 16,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sessionInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  sessionInfoDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  sessionInfoLabel: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    color: '#6F6F7B',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: Platform.OS === 'android' ? 18 : 16,
  },
  sessionInfoValue: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: 'bold',
    color: '#1E3A5F',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  buttonSpacer: {
    height: 20,
  },
  fixedButtonsContainer: {
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
  bookButton: {
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
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: 'bold',
    marginLeft: 8,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  chatButton: {
    backgroundColor: '#1E3A5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 16 : 14,
    borderRadius: 12,
    shadowColor: '#1E3A5F',
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
});

export default CoachProfileScreen;
