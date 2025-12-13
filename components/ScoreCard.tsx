import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';

interface ScoreCardProps {
  score: number;
  description: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, description }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Score</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>
      <Text style={styles.description}>{description}</Text>
      <TouchableOpacity 
        style={styles.linkContainer}
        onPress={() => {
          const url = 'https://www.paddle.com/resources/customer-health-score';
          Linking.openURL(url).catch((err) => {
            console.error('Failed to open URL:', err);
            Alert.alert('Error', 'Could not open the website. Please try again later.');
          });
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.linkText}>Tell me more &gt;</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    flex: 1,
  },
  scoreBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F57C3B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F57C3B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#6F6F7B',
    lineHeight: 20,
    marginBottom: 12,
  },
  linkContainer: {
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 14,
    color: '#A992F6',
    fontWeight: '600',
  },
});

export default ScoreCard;

