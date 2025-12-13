import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MissionCardProps {
  completed: number;
  total: number;
}

const MissionCard: React.FC<MissionCardProps> = ({ completed, total }) => {
  const progress = total > 0 ? completed / total : 0;

  return (
    <LinearGradient
      colors={['#A992F6', '#C299F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Daily Missions</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
              <View style={styles.progressSlider} />
            </View>
          </View>
          <Text style={styles.progressText}>{completed}/{total}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 25,
    padding: Platform.OS === 'android' ? 22 : 20, // Slightly more padding on Android
    marginBottom: Platform.OS === 'android' ? 24 : 20, // More spacing on Android
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#A992F6',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 10, // Increased for better visibility on Android
    }),
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: Platform.OS === 'android' ? 17 : 18, // Slightly smaller on Android
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: Platform.OS === 'android' ? 18 : 16, // More spacing on Android
    lineHeight: Platform.OS === 'android' ? 22 : 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  progressSlider: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 4, // Increased for better visibility
    }),
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    minWidth: 40,
  },
});

export default MissionCard;

