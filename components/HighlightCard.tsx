import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HighlightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  metric: string;
  value: string;
  updateTime: string;
  backgroundColor: string;
}

const HighlightCard: React.FC<HighlightCardProps> = ({
  icon,
  metric,
  value,
  updateTime,
  backgroundColor,
}) => {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Ionicons name={icon} size={32} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.metric}>{metric}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.updateTime}>{updateTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 25,
    padding: Platform.OS === 'android' ? 18 : 16, // More padding on Android
    margin: Platform.OS === 'android' ? 4 : 6, // Adjusted margin for Android
    minHeight: Platform.OS === 'android' ? 150 : 140, // Slightly taller on Android
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 6, // Increased for better visibility on Android
    }),
  },
  icon: {
    marginBottom: 8,
  },
  metric: {
    fontSize: Platform.OS === 'android' ? 13 : 14, // Slightly smaller on Android
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: Platform.OS === 'android' ? 10 : 8, // More spacing on Android
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  value: {
    fontSize: Platform.OS === 'android' ? 19 : 20, // Slightly smaller on Android
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: Platform.OS === 'android' ? 6 : 4, // More spacing on Android
    lineHeight: Platform.OS === 'android' ? 24 : 26,
  },
  updateTime: {
    fontSize: Platform.OS === 'android' ? 11 : 12, // Slightly smaller on Android
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: Platform.OS === 'android' ? 16 : 18,
  },
});

export default HighlightCard;

