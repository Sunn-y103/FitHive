import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// App color palette
const COLORS = {
  primary: '#A992F6',
  white: '#FFFFFF',
};

type RootStackParamList = {
  AIChat: undefined;
};

type FloatingAIButtonNavigationProp = StackNavigationProp<RootStackParamList>;

const FloatingAIButton: React.FC = () => {
  const navigation = useNavigation<FloatingAIButtonNavigationProp>();

  const handlePress = () => {
    navigation.navigate('AIChat');
  };

  return (
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel="Open AI Assistant"
      accessibilityHint="Opens the AI chat assistant"
    >
      <Ionicons name="chatbubbles" size={28} color={COLORS.white} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 90,                    // Above the bottom tab bar (70px height + 20px margin)
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,                  // Ensure it's always on top
  },
});

export default FloatingAIButton;

