import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    padding: 16,
    margin: 6,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    marginBottom: 8,
  },
  metric: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
});

export default HighlightCard;

