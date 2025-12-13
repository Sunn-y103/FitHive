import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Coach } from './CoachScreen';
import { useAuth } from '../contexts/AuthContext';

type CoachChatScreenRouteProp = RouteProp<RootStackParamList, 'CoachChat'>;
type CoachChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CoachChat'>;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
  isCard?: boolean;
  cardData?: {
    title: string;
    items: string[];
  };
}

const CoachChatScreen: React.FC = () => {
  const navigation = useNavigation<CoachChatScreenNavigationProp>();
  const route = useRoute<CoachChatScreenRouteProp>();
  const { coach } = route.params;
  const { user } = useAuth();

  const scrollViewRef = useRef<ScrollView>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  // Quick action chips
  const quickActions = [
    'Workout Plan',
    'Diet Advice',
    'Next Session',
    'Recovery Tips',
  ];

  // Get user name from email or use default
  const getUserName = () => {
    if (user?.email) {
      return user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1);
    }
    return 'Champion';
  };

  const userName = getUserName();

  // Generate smart welcome message on mount
  useEffect(() => {
    const welcomeMessages: Message[] = [
      {
        id: 'welcome-1',
        text: `Hi ${userName}! 👋 I'm ${coach.name.split(' ')[0]}, your personal fitness coach.`,
        isUser: false,
        timestamp: new Date(),
      },
      {
        id: 'welcome-2',
        text: `I'm here to guide you through your fitness journey and help you achieve your goals. Let's make every day count! 💪`,
        isUser: false,
        timestamp: new Date(),
      },
    ];
    setMessages(welcomeMessages);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  // Context-based coach response logic
  const generateCoachResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Workout-related responses
    if (lowerMessage.includes('workout') || lowerMessage.includes('exercise') || lowerMessage.includes('training')) {
      const workoutResponses = [
        "Great! Let's create a personalized workout plan for you. Start with 3-4 sessions per week, focusing on compound movements like squats, deadlifts, and push-ups.",
        "I'll design a workout routine that fits your schedule. Remember: consistency beats intensity. Let's build strength progressively!",
        "Perfect timing! For optimal results, I recommend a mix of strength training and cardio. We'll track your progress together.",
      ];
      return workoutResponses[Math.floor(Math.random() * workoutResponses.length)];
    }

    // Diet/Nutrition responses
    if (lowerMessage.includes('diet') || lowerMessage.includes('food') || lowerMessage.includes('nutrition') || lowerMessage.includes('meal')) {
      const dietResponses = [
        "Nutrition is key! Focus on whole foods, lean proteins, and plenty of vegetables. Stay hydrated and aim for balanced meals throughout the day.",
        "Let's optimize your nutrition! I recommend eating protein with every meal, staying hydrated, and avoiding processed foods. Small changes lead to big results!",
        "Great question! A balanced diet with adequate protein, healthy fats, and complex carbs will fuel your workouts and recovery.",
      ];
      return dietResponses[Math.floor(Math.random() * dietResponses.length)];
    }

    // Recovery/Rest responses
    if (lowerMessage.includes('tired') || lowerMessage.includes('rest') || lowerMessage.includes('recovery') || lowerMessage.includes('sleep')) {
      const recoveryResponses = [
        "Recovery is just as important as training! Make sure you're getting 7-9 hours of sleep, staying hydrated, and taking rest days. Your body needs time to rebuild!",
        "Listen to your body! If you're feeling tired, take a rest day or do light stretching. Recovery prevents injury and improves performance.",
        "Rest days are essential for progress! Use them for active recovery like walking or yoga. Quality sleep and proper nutrition will help you bounce back stronger.",
      ];
      return recoveryResponses[Math.floor(Math.random() * recoveryResponses.length)];
    }

    // Session-related responses
    if (lowerMessage.includes('session') || lowerMessage.includes('next') || lowerMessage.includes('schedule')) {
      const sessionResponses = [
        "I'm excited for our next session! We'll focus on building strength and improving form. Come prepared and let's make it count!",
        "Our next session is going to be great! I'll have a personalized plan ready. Remember to warm up before we start.",
        "Looking forward to our session! We'll track your progress and adjust the plan as needed. You're doing amazing!",
      ];
      return sessionResponses[Math.floor(Math.random() * sessionResponses.length)];
    }

    // Default motivational responses
    const defaultResponses = [
      "That's great to hear! I'm here to support you every step of the way. What specific area would you like to focus on?",
      "I understand. Let's work together to overcome any challenges. Remember, progress takes time and consistency!",
      "Thanks for sharing! I'm here to help you achieve your goals. Together, we'll make it happen! 💪",
      "You're doing amazing! Keep up the great work. If you have any questions, I'm here to help.",
      "I appreciate you sharing that with me. Let's create a plan that works for you and your lifestyle.",
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  // Generate session summary card (occasionally)
  const generateSessionSummaryCard = (): Message => {
    return {
      id: `card-${Date.now()}`,
      text: '',
      isUser: false,
      timestamp: new Date(),
      isCard: true,
      cardData: {
        title: "Today's Plan",
        items: [
          "30 minutes of strength training",
          "15 minutes of cardio",
          "Drink 2L of water",
          "Focus on proper form",
          "Track your progress",
        ],
      },
    };
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Show typing indicator
    setIsTyping(true);

    // Generate coach response after delay
    setTimeout(() => {
      setIsTyping(false);

      // Occasionally send a session summary card (20% chance)
      if (Math.random() < 0.2 && (text.toLowerCase().includes('plan') || text.toLowerCase().includes('today'))) {
        const cardMessage = generateSessionSummaryCard();
        setMessages(prev => [...prev, cardMessage]);
      } else {
        // Generate context-based response
        const coachResponse = generateCoachResponse(text);
        const coachMessage: Message = {
          id: `coach-${Date.now()}`,
          text: coachResponse,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, coachMessage]);
      }
    }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds delay
  };

  const handleQuickAction = (action: string) => {
    handleSend(action);
  };

  const handleVideoCall = () => {
    Alert.alert(
      'Video Call',
      'Video call feature coming soon 🚀',
      [{ text: 'OK' }]
    );
  };

  const renderMessage = (message: Message) => {
    // Session summary card
    if (message.isCard && message.cardData) {
      return (
        <View key={message.id} style={styles.cardContainer}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{message.cardData.title}</Text>
            {message.cardData.items.map((item, index) => (
              <View key={index} style={styles.cardItem}>
                <Ionicons name="checkmark-circle" size={18} color="#A992F6" />
                <Text style={styles.cardItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // Regular message bubble
    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          message.isUser ? styles.userMessage : styles.coachMessage,
        ]}
      >
        {!message.isUser && (
          <Image
            source={{ uri: coach.image }}
            style={styles.messageAvatar}
            resizeMode="cover"
          />
        )}
        <View
          style={[
            styles.messageContent,
            message.isUser
              ? styles.userMessageContent
              : styles.coachMessageContent,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              message.isUser
                ? styles.userMessageText
                : styles.coachMessageText,
            ]}
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: coach.image }}
            style={styles.coachAvatar}
            resizeMode="cover"
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{coach.name}</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleVideoCall}
          style={styles.videoCallButton}
        >
          <Ionicons name="videocam-outline" size={24} color="#1E3A5F" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageBubble, styles.coachMessage]}>
              <Image
                source={{ uri: coach.image }}
                style={styles.messageAvatar}
                resizeMode="cover"
              />
              <View style={[styles.messageContent, styles.coachMessageContent, styles.typingIndicator]}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
                <Text style={[styles.messageText, styles.coachMessageText, styles.typingText]}>
                  Coach is typing...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Action Chips */}
        {messages.length > 0 && !isTyping && (
          <View style={styles.quickActionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsContent}
            >
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionChip}
                  onPress={() => handleQuickAction(action)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickActionText}>{action}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Message Input Section */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9E9E9E"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? "#FFFFFF" : "#9E9E9E"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    }),
    ...(Platform.OS === 'android' && {
      elevation: 3,
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Platform.OS === 'android' ? 8 : 12,
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 2,
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
  headerSubtitle: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#4CAF50',
    lineHeight: Platform.OS === 'android' ? 16 : 18,
  },
  videoCallButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Platform.OS === 'android' ? 16 : 20,
    paddingBottom: Platform.OS === 'android' ? 8 : 12,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: Platform.OS === 'android' ? 16 : 14,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  coachMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '75%',
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    borderRadius: 20,
  },
  userMessageContent: {
    backgroundColor: '#A992F6',
    borderBottomRightRadius: 4,
  },
  coachMessageContent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: Platform.OS === 'android' ? 15 : 14,
    lineHeight: Platform.OS === 'android' ? 21 : 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  coachMessageText: {
    color: '#1E3A5F',
  },
  // Typing Indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6F6F7B',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    fontStyle: 'italic',
    color: '#6F6F7B',
  },
  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickActionsContent: {
    paddingRight: 8,
  },
  quickActionChip: {
    backgroundColor: '#F7F5FF',
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8E0FF',
  },
  quickActionText: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    color: '#A992F6',
    fontWeight: '600',
  },
  // Session Summary Card
  cardContainer: {
    marginBottom: Platform.OS === 'android' ? 16 : 14,
    alignItems: 'flex-start',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 18 : 20,
    maxWidth: '85%',
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0E8FF',
  },
  cardTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 17,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: Platform.OS === 'android' ? 12 : 10,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 8 : 6,
  },
  cardItemText: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    color: '#6F6F7B',
    marginLeft: 8,
    flex: 1,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    }),
    ...(Platform.OS === 'android' && {
      elevation: 8,
    }),
  },
  input: {
    flex: 1,
    backgroundColor: '#F7F7FA',
    borderRadius: 20,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 18,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    fontSize: Platform.OS === 'android' ? 15 : 14,
    color: '#1E3A5F',
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default CoachChatScreen;
