import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// App color palette
const COLORS = {
  primary: '#A992F6',
  primaryLight: '#C299F6',
  primaryBg: '#F7F5FF',
  navy: '#1E3A5F',
  background: '#F7F7FA',
  white: '#FFFFFF',
  textPrimary: '#1E3A5F',
  textSecondary: '#6F6F7B',
  border: '#E8E8F0',
};


 

const AI_CHAT_URL = "https://skqcggiuulwrjiclaibw.supabase.co/functions/v1/ai-chat";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcWNnZ2l1dWx3cmppY2xhaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODk2OTksImV4cCI6MjA4MDA2NTY5OX0.rXJ7poOAkYh77rHt4AfLpN1wumhy5mrBEBGnhjLlAcg";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const AIChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your FitHive AI assistant. How can I help you with your fitness journey today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    console.log('🚀 SEND PRESSED, MESSAGE:', text);

    // 1. Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      console.log('📡 CALLING SUPABASE URL:', AI_CHAT_URL);

      // 2. Call Supabase Edge Function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const res = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('✅ SUPABASE RESPONSE STATUS:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ HTTP ERROR:', res.status, errorText);
        
        throw new Error(
          res.status === 404
            ? 'AI service not found. Please deploy the Edge Function.'
            : res.status === 500
            ? 'AI service error. Check if GEMINI_API_KEY is set.'
            : `HTTP ${res.status}: ${errorText}`
        );
      }

      const data = await res.json();
      console.log('✅ SUPABASE RESPONSE DATA:', JSON.stringify(data).substring(0, 200));

      const replyText =
        data.replyText ||
        data.error ||
        "Sorry, I'm having trouble replying right now. Please try again.";

      // 3. Add AI reply to chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('❌ ERROR calling ai-chat:', error);
      
      let errorMessage = 'Oops, something went wrong. ';
      
      if (error.name === 'AbortError') {
        errorMessage += 'The request took too long. Please try again.';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage += 'Network error. Check your internet connection.';
      } else if (error.message?.includes('not found')) {
        errorMessage += 'AI service not deployed. Run: supabase functions deploy ai-chat';
      } else if (error.message?.includes('AI service error')) {
        errorMessage += 'AI configuration error. Check if GEMINI_API_KEY is set.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiIconContainer}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.white} />
          </View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
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
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              {!message.isUser && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                </View>
              )}
              <View
                style={[
                  styles.messageContent,
                  message.isUser
                    ? styles.userMessageContent
                    : styles.aiMessageContent,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser
                      ? styles.userMessageText
                      : styles.aiMessageText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            </View>
          ))}
          
          {/* Typing Indicator */}
          {isLoading && (
            <View style={[styles.messageBubble, styles.aiMessage]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
              </View>
              <View style={[styles.messageContent, styles.aiMessageContent, styles.typingIndicator]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={[styles.messageText, styles.aiMessageText, styles.typingText]}>
                  AI is thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder={isLoading ? "Waiting for AI..." : "Ask me anything about fitness..."}
              placeholderTextColor={COLORS.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? COLORS.white : COLORS.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  headerSpacer: {
    width: 40,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessageContent: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  aiMessageContent: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: COLORS.white,
  },
  aiMessageText: {
    color: COLORS.navy,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.navy,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  typingText: {
    marginLeft: 8,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

export default AIChatScreen;

