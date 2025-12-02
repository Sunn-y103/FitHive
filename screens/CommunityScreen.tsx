import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// APP COLOR PALETTE (exact match with rest of app)
// ============================================
// These colors are extracted from:
// - HomeScreen, ProfileScreen, LoginScreen, WaterIntakeScreen
// - MissionCard, HighlightCard, ScoreCard components
// ============================================
const COLORS = {
  // Primary colors
  primary: '#A992F6',           // Main accent (buttons, links, avatars)
  primaryLight: '#C299F6',      // Gradient secondary
  primaryBg: '#F7F5FF',         // Light purple background for selections
  
  // Navy - used for all headings and primary text
  navy: '#1E3A5F',
  
  
  // Background colors
  background: '#F7F7FA',        // Main app background
  white: '#FFFFFF',
  
  // Text colors
  textPrimary: '#1E3A5F',       // Headings, titles
  textSecondary: '#6F6F7B',     // Body text, descriptions, placeholders
  
  // Border colors
  border: '#E8E8F0',            // Input borders, dividers
  borderLight: '#F0F0F0',       // Light separators
  separator: '#E0E0E0',         // Section separators
  
  // Status colors
  error: '#FF6B6B',             // Delete, logout, errors
  orange: '#F57C3B',            // Score badge
  
  // Shadow color for cards with purple tint
  shadowPurple: '#A992F6',
};

// Mock data for posts
const MOCK_POSTS = [
  {
    id: '1',
    author: {
      id: 'user1',
      name: 'Ken Adams',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    timestamp: '12:42pm',
    content: "Went full beast mode today! I'm going all out this year",
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
    likes: 30200,
    comments: 20100,
    shares: 8500,
    isOwner: false,
  },
  {
    id: '2',
    author: {
      id: 'user2',
      name: 'Barney Stinson',
      avatar: 'https://randomuser.me/api/portraits/men/44.jpg',
    },
    timestamp: '12:42pm',
    content: "Went full beast mode today! I'm going all out this year",
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80',
    likes: 30200,
    comments: 20100,
    shares: 8500,
    isOwner: true,
  },
  {
    id: '3',
    author: {
      id: 'user3',
      name: 'Regina Phalange',
      avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    },
    timestamp: '12:42pm',
    content: "Went full beast mode today! I'm going all out this year",
    image: null,
    likes: 15400,
    comments: 8200,
    shares: 3100,
    isOwner: false,
  },
];

// Mock data for challenges
const MOCK_CHALLENGES = [
  {
    id: '1',
    title: 'Ares workout challenge',
    dateRange: 'Jan 14 - Feb 14',
    participants: 128,
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  },
  {
    id: '2',
    title: "Flash's full mile",
    dateRange: 'Jan 14 - Feb 14',
    participants: 224,
    image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&q=80',
  },
  {
    id: '3',
    title: 'King of the wheels',
    dateRange: 'Jan 14 - Feb 14',
    participants: 40,
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80',
  },
  {
    id: '4',
    title: 'Flexigodess',
    dateRange: 'Jan 14 - Feb 14',
    participants: 156,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
  },
];

// Helper function to format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

// Post Card Component
interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: string;
  content: string;
  image: string | null;
  likes: number;
  comments: number;
  shares: number;
  isOwner: boolean;
}

const PostCard: React.FC<{ post: Post; onMenuPress: (postId: string) => void }> = ({ post, onMenuPress }) => {
  const [liked, setLiked] = useState(false);

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postAuthorSection}>
          <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
          <Text style={styles.authorName}>{post.author.name}</Text>
        </View>
        <View style={styles.postHeaderRight}>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
          {post.isOwner && (
            <TouchableOpacity
              onPress={() => onMenuPress(post.id)}
              style={styles.menuButton}
              accessibilityLabel="Post options menu"
            >
              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Post Image */}
      {post.image && (
        <Image
          source={{ uri: post.image }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setLiked(!liked)}
          accessibilityLabel={`Like post, ${formatNumber(post.likes)} likes`}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart'}
            size={18}
            color={liked ? COLORS.error : COLORS.primary}
          />
          <Text style={[styles.actionText, liked && styles.likedText]}>
            {formatNumber(liked ? post.likes + 1 : post.likes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          accessibilityLabel={`${formatNumber(post.comments)} comments`}
        >
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{formatNumber(post.comments)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          accessibilityLabel={`Share post, ${formatNumber(post.shares)} shares`}
        >
          <Ionicons name="paper-plane-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{formatNumber(post.shares)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Challenge Card Component
interface Challenge {
  id: string;
  title: string;
  dateRange: string;
  participants: number;
  image: string;
}

const ChallengeCard: React.FC<{ challenge: Challenge }> = ({ challenge }) => {
  return (
    <TouchableOpacity
      style={styles.challengeCard}
      accessibilityLabel={`${challenge.title}, ${challenge.dateRange}, ${challenge.participants} challengers joined`}
    >
      <Image
        source={{ uri: challenge.image }}
        style={styles.challengeImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(30, 58, 95, 0.85)']}
        style={styles.challengeOverlay}
      />
      <View style={styles.challengeContent}>
        <View>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeDate}>{challenge.dateRange}</Text>
        </View>
        <Text style={styles.challengeParticipants}>
          {challenge.participants} challengers joined
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const CommunityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'social' | 'challenges'>('social');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');

  const handleNewPost = () => {
    setShowNewPostModal(true);
  };

  const handlePostSubmit = () => {
    // Handle post submission
    console.log('New post:', newPostContent);
    setNewPostContent('');
    setShowNewPostModal(false);
  };

  const handleMenuPress = (postId: string) => {
    setShowPostMenu(postId);
  };

  const renderSocialFeed = () => (
    <View style={styles.feedContainer}>
      {/* Posts Header */}
      <View style={styles.postsHeader}>
        <Text style={styles.postsTitle}>Posts</Text>
        <TouchableOpacity
          style={styles.newPostButton}
          onPress={handleNewPost}
          accessibilityLabel="Create new post"
        >
          <Text style={styles.newPostButtonText}>New post</Text>
        </TouchableOpacity>
      </View>

      {/* Posts List */}
      {MOCK_POSTS.map((post) => (
        <PostCard key={post.id} post={post} onMenuPress={handleMenuPress} />
      ))}
    </View>
  );

  const renderChallenges = () => (
    <View style={styles.challengesContainer}>
      {/* Challenges Header */}
      <Text style={styles.challengesHeading}>Ready to achieve 'god' status?</Text>
      <Text style={styles.challengesSubheading}>
        Select community challenges to join and give your workout its needed flair!
      </Text>

      {/* Challenges List */}
      {MOCK_CHALLENGES.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControlContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === 'social' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab('social')}
            accessibilityLabel="Social feed tab"
            accessibilityState={{ selected: activeTab === 'social' }}
          >
            <Text
              style={[
                styles.segmentButtonText,
                activeTab === 'social' && styles.segmentButtonTextActive,
              ]}
            >
              Social feed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === 'challenges' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab('challenges')}
            accessibilityLabel="Challenges tab"
            accessibilityState={{ selected: activeTab === 'challenges' }}
          >
            <Text
              style={[
                styles.segmentButtonText,
                activeTab === 'challenges' && styles.segmentButtonTextActive,
              ]}
            >
              Challenges
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'social' ? renderSocialFeed() : renderChallenges()}
      </ScrollView>

      {/* New Post Modal */}
      <Modal
        visible={showNewPostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity
                onPress={() => setShowNewPostModal(false)}
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={24} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind?"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.addImageButton}
                accessibilityLabel="Add image to post"
              >
                <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitPostButton,
                  !newPostContent.trim() && styles.submitPostButtonDisabled,
                ]}
                onPress={handlePostSubmit}
                disabled={!newPostContent.trim()}
                accessibilityLabel="Submit post"
              >
                <Text style={styles.submitPostButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post Menu Modal */}
      <Modal
        visible={showPostMenu !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPostMenu(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowPostMenu(null)}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                console.log('Edit post:', showPostMenu);
                setShowPostMenu(null);
              }}
              accessibilityLabel="Edit post"
            >
              <Ionicons name="pencil-outline" size={20} color={COLORS.navy} />
              <Text style={styles.menuItemText}>Edit Post</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                console.log('Delete post:', showPostMenu);
                setShowPostMenu(null);
              }}
              accessibilityLabel="Delete post"
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.menuItemText, styles.deleteText]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ============================================
  // CONTAINER & LAYOUT
  // ============================================
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // #F7F7FA - same as all other screens
  },
  
  // ============================================
  // HEADER - matches ProfileScreen, HomeScreen style
  // ============================================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,                        // Same as ProfileScreen headerTitle
    fontWeight: 'bold',
    color: COLORS.navy,                  // #1E3A5F
  },
  notificationButton: {
    width: 44,                           // Same as ProfileScreen settingsButton
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,                 // Same shadow as ProfileScreen
    shadowRadius: 6,
    elevation: 2,
  },
  
  // ============================================
  // SEGMENTED CONTROL
  // ============================================
  segmentedControlContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.border,      // #E8E8F0 - matches border colors
    borderRadius: 25,                    // Same as LoginScreen input radius
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 22,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primaryBg,   // #F7F5FF - light purple bg
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,         // #6F6F7B
  },
  segmentButtonTextActive: {
    color: COLORS.primary,                  // #A992F6 - purple for active
  },
  
  // ============================================
  // SCROLL CONTENT
  // ============================================
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,               // Same as HomeScreen, ProfileScreen
    paddingTop: 16,
    paddingBottom: 100,
  },
  
  // ============================================
  // SOCIAL FEED
  // ============================================
  feedContainer: {
    flex: 1,
  },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,                  // #1E3A5F
  },
  newPostButton: {
    backgroundColor: COLORS.primary,        // #A992F6 - purple button
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,                    // Same as ProfileScreen editButton
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newPostButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // ============================================
  // POST CARD - matches ScoreCard, ProfileCard style
  // ============================================
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 25,                    // Same as MissionCard, ScoreCard
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,                  // Same as ScoreCard
    shadowRadius: 12,
    elevation: 5,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  postAuthorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryBg,       // #F7F5FF - light purple border
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,                  // #1E3A5F
  },
  postHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.textSecondary,         // #6F6F7B
  },
  menuButton: {
    marginLeft: 12,
    padding: 4,
  },
  postContent: {
    fontSize: 15,
    color: COLORS.textSecondary,         // #6F6F7B - same as descriptions
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,      // #E8E8F0 placeholder bg
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,  // #F0F0F0
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 13,
    color: COLORS.textSecondary,         // #6F6F7B
    marginLeft: 6,
  },
  likedText: {
    color: COLORS.error,                 // #FF6B6B - red when liked
  },
  
  // ============================================
  // CHALLENGES
  // ============================================
  challengesContainer: {
    flex: 1,
  },
  challengesHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,                  // #1E3A5F
    marginBottom: 8,
  },
  challengesSubheading: {
    fontSize: 14,
    color: COLORS.textSecondary,         // #6F6F7B
    marginBottom: 20,
    lineHeight: 20,
  },
  challengeCard: {
    height: 160,
    borderRadius: 25,                    // Same as other cards
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    shadowColor: COLORS.navy,            // Navy shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  challengeImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  challengeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  challengeContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  challengeDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  challengeParticipants: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  
  // ============================================
  // NEW POST MODAL - matches ProfileScreen modal style
  // ============================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Standard modal overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,             // Same as ProfileScreen modal
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,                    // Same as ProfileScreen modalHeader
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.navy,                  // #1E3A5F
  },
  postInput: {
    backgroundColor: COLORS.background,  // #F7F7FA - same as input backgrounds
    borderWidth: 2,
    borderColor: COLORS.border,          // #E8E8F0
    borderRadius: 12,                    // Same as ProfileScreen input
    padding: 16,
    fontSize: 16,
    color: COLORS.navy,                  // #1E3A5F
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,   // #F7F5FF
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addImageText: {
    marginLeft: 8,
    color: COLORS.primary,               // #A992F6
    fontSize: 14,
    fontWeight: '600',
  },
  submitPostButton: {
    backgroundColor: COLORS.primary,     // #A992F6 - main purple
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,                    // Same as LoginScreen button
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitPostButtonDisabled: {
    backgroundColor: COLORS.border,      // #E8E8F0 when disabled
    shadowOpacity: 0,
  },
  submitPostButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',                  // Same as LoginScreen buttonText
  },
  
  // ============================================
  // POST MENU MODAL
  // ============================================
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,                    // Same as ProfileScreen menuSection
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.navy,                  // #1E3A5F
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight, // #F0F0F0
    marginHorizontal: 8,
  },
  deleteText: {
    color: COLORS.error,                 // #FF6B6B
  },
});

export default CommunityScreen;
