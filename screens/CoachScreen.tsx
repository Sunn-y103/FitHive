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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

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

const CoachScreen: React.FC = () => {
  const navigation = useNavigation<CoachScreenNavigationProp>();

  const handleViewProfile = (coach: Coach) => {
    navigation.navigate('CoachProfile', { coach });
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
          contentContainerStyle={styles.scrollContent}
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
    paddingBottom: Platform.OS === 'android' ? 24 : 28,
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
});

export default CoachScreen;
