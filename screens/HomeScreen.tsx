import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MissionCard from '../components/MissionCard';
import HighlightCard from '../components/HighlightCard';
import ScoreCard from '../components/ScoreCard';

type RootStackParamList = {
  AllHealthData: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi Username!</Text>
          <TouchableOpacity style={styles.profileIcon}>
            <Ionicons name="person-outline" size={24} color="#1E3A5F" />
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {/* Daily Missions */}
        <MissionCard completed={4} total={10} />

        <View style={styles.separator} />

        {/* Highlights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <View style={styles.highlightsGrid}>
            <View style={styles.highlightItem}>
            <HighlightCard
              icon="water-outline"
              metric="Water Intake"
              value="6 Litre"
              updateTime="updated 15 min ago"
              backgroundColor="#A992F6"
            />
            </View>
            <View style={styles.highlightItem}>
            <HighlightCard
              icon="calendar-outline"
              metric="Cycle tracking"
              value="12 days before period"
              updateTime="updated 30m ago"
              backgroundColor="#C299F6"
            />
            </View>
            <View style={styles.highlightItem}>
            <HighlightCard
              icon="barbell-outline"
              metric="Workout"
              value="7 h 31 min"
              updateTime="updated a day ago"
              backgroundColor="#1E3A5F"
            />
            </View>
            <View style={styles.highlightItem}>
            <HighlightCard
              icon="restaurant-outline"
              metric="Nutrition"
              value="960 kcal"
              updateTime="updated 5 min ago"
              backgroundColor="#1AA6A6"
            />
            </View>
          </View>
        </View>

        {/* Overview Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <TouchableOpacity 
              style={styles.allDataButton}
              onPress={() => navigation.navigate('AllHealthData')}
            >
              <Text style={styles.allDataText}>All Data</Text>
            </TouchableOpacity>
          </View>
          <ScoreCard
            score={78}
            description="Based on your overview health tracking, your score is 78 and consider good.."
          />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 24,
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
  allDataButton: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  allDataText: {
    fontSize: 14,
    color: '#1AA6A6',
    fontWeight: '600',
  },
  highlightsGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
},

highlightItem: {
  width: '48%',       // 2 cards per row
  marginBottom: 16,

 },
});

export default HomeScreen;

