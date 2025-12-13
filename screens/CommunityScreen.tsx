import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  ActivityIndicator,
  FlatList,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
// import * as FileSystem from 'expo-file-system';
// import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { useChallenges } from '../contexts/ChallengeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getAndClearPendingChallenge, ChallengeData } from '../utils/challengeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  ChallengeDetails: { challengeId: string };
  CreateChallenge: undefined;
  Community: undefined;
};

type CommunityScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Community'>;

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

// Challenge Type for the Challenges area
// ChallengeData is imported from challengeStore (see imports above)

// Default mock challenges (fallback if context is empty)
const DEFAULT_CHALLENGES = [
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

// Comment Interface
interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  author_name?: string; // Optional - will be computed from user data
}

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

const PostCard: React.FC<{ 
  post: Post; 
  onMenuPress: (postId: string) => void;
  onLike: (postId: string, isLiked: boolean) => Promise<void>;
  onComment: (postId: string) => void;
  isLiked: boolean;
}> = ({ post, onMenuPress, onLike, onComment, isLiked: initialLiked }) => {
  const [liked, setLiked] = useState(initialLiked);
  const [imageError, setImageError] = useState(false);
  const [liking, setLiking] = useState(false);

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

      {/* Post Image - Only displays if image URL exists and no error occurred */}
      {post.image && !imageError && (
        <Image
          source={{ uri: post.image }}
          style={styles.postImage}
          resizeMode="cover"
          onError={() => {
            console.warn('⚠️ Failed to load post image:', post.image);
            setImageError(true);
          }}
          accessibilityLabel="Post image"
        />
      )}

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={async () => {
            if (liking) return;
            const newLikedState = !liked;
            setLiked(newLikedState);
            await onLike(post.id, newLikedState);
          }}
          disabled={liking}
          accessibilityLabel={`Like post, ${formatNumber(post.likes)} likes`}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? COLORS.error : COLORS.primary}
          />
          <Text style={[styles.actionText, liked && styles.likedText]}>
            {formatNumber(post.likes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment(post.id)}
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
  dateRange?: string;
  time?: string;
  participants: number;
  image: string | null;
}

const ChallengeCard: React.FC<{ 
  challenge: Challenge;
  onPress: () => void;
}> = ({ challenge, onPress }) => {
  const displayDate = challenge.time || challenge.dateRange || 'TBD';
  
  return (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${challenge.title}, ${displayDate}, ${challenge.participants} challengers joined`}
    >
      {challenge.image ? (
        <Image
          source={{ uri: challenge.image }}
          style={styles.challengeImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.challengeImage, styles.challengeImagePlaceholder]}>
          <Ionicons name="trophy" size={48} color={COLORS.primary} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(30, 58, 95, 0.85)']}
        style={styles.challengeOverlay}
      />
      <View style={styles.challengeContent}>
        <View>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeDate}>{displayDate}</Text>
        </View>
        <Text style={styles.challengeParticipants}>
          {challenge.participants} challengers joined
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// New Challenge Card Component for ChallengeData
const ChallengeDataCard: React.FC<{
  challenge: ChallengeData;
  onPress: () => void;
  isSelected: boolean;
}> = ({ challenge, onPress, isSelected }) => {
  // Format createdAt date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // If challenge has an image, render it like featured challenges
  if (challenge.image) {
    return (
      <TouchableOpacity
        style={[
          styles.challengeCard,
          isSelected && styles.challengeDataCardSelected,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={`${challenge.title}, created ${formatDate(challenge.createdAt)}`}
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
            <Text style={styles.challengeDate}>{formatDate(challenge.createdAt)}</Text>
          </View>
          {challenge.numberOfPeople && challenge.numberOfPeople > 0 && (
            <Text style={styles.challengeParticipants}>
              {challenge.numberOfPeople} participants
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Fallback to original card style if no image
  return (
    <TouchableOpacity
      style={[
        styles.challengeDataCard,
        isSelected && styles.challengeDataCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${challenge.title}, created ${formatDate(challenge.createdAt)}`}
    >
      <View style={styles.challengeDataCardContent}>
        <Text style={styles.challengeDataCardTitle} numberOfLines={1}>
          {challenge.title}
        </Text>
        <Text style={styles.challengeDataCardDescription} numberOfLines={1}>
          {challenge.description}
        </Text>
        <Text style={styles.challengeDataCardDate}>
          {formatDate(challenge.createdAt)}
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={COLORS.textSecondary} 
        style={styles.challengeDataCardArrow}
      />
    </TouchableOpacity>
  );
};

const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const { challenges } = useChallenges();
  const [activeTab, setActiveTab] = useState<'social' | 'challenges'>('social');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  
  // ============================================
  // CHALLENGES AREA STATE MANAGEMENT
  // ============================================
  // Single source of truth for user-created challenges
  const [challengesData, setChallengesData] = useState<ChallengeData[]>([]);
  
  // Listen for new challenge from CreateChallengeScreen when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const newChallenge = getAndClearPendingChallenge();
      if (newChallenge) {
        // Add new challenge to the top of the list
        setChallengesData(prev => {
          // Check if challenge already exists (prevent duplicates)
          const exists = prev.some(c => c.id === newChallenge.id);
          if (exists) {
            return prev;
          }
          // Prepend new challenge to array (appears at top)
          return [newChallenge, ...prev];
        });
      }
    }, [])
  );
  
  // State for challenge details bottom drawer
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeData | null>(null);
  const [selectedChallengeImage, setSelectedChallengeImage] = useState<string | null>(null);
  const [selectedChallengeParticipants, setSelectedChallengeParticipants] = useState<number>(0);
  const [selectedChallengeLocation, setSelectedChallengeLocation] = useState<string>('');
  const [showChallengeDetailsDrawer, setShowChallengeDetailsDrawer] = useState(false);
  const challengeDrawerAnimation = useRef(new Animated.Value(0)).current;
  
  // State for create challenge form
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeDescription, setNewChallengeDescription] = useState('');
  
  // Function to create a new challenge
  // TODO: send to API - replace with actual backend call
  const createChallenge = (title: string, description: string) => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in both title and description');
      return;
    }

    const newChallenge: ChallengeData = {
      id: `challenge-${Date.now()}`, // Generate unique ID
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(), // Current timestamp
    };

    // Prepend to array (appears at top)
    setChallengesData(prev => [newChallenge, ...prev]);
    
    // Close form and reset inputs
    setShowCreateChallengeModal(false);
    setNewChallengeTitle('');
    setNewChallengeDescription('');
    
    // TODO: Send to backend API
    // await supabase.from('challenges').insert([newChallenge]);
    
    Alert.alert('Success', 'Challenge created successfully!');
  };
  
  // Handle challenge card tap (for user-created challenges)
  const handleChallengeCardPress = (challenge: ChallengeData) => {
    // User-created challenge - show image if available
    setSelectedChallenge(challenge);
    setSelectedChallengeImage(challenge.image || null); // Show image if available
    setSelectedChallengeParticipants(challenge.numberOfPeople || 0);
    setSelectedChallengeLocation(challenge.location || 'Not specified');
    setShowChallengeDetailsDrawer(true);
    // Animate drawer slide-up
    Animated.spring(challengeDrawerAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };
  
  // Handle legacy/featured challenge card tap
  // Convert legacy challenge format to ChallengeData for drawer display
  const handleLegacyChallengePress = (challenge: { id: string; title: string; dateRange?: string; time?: string; participants: number; image: string | null }) => {
    // Convert legacy challenge to ChallengeData format
    const challengeData: ChallengeData = {
      id: challenge.id,
      title: challenge.title,
      description: `Join ${challenge.participants} participants in this challenge. ${challenge.dateRange || challenge.time || 'Ongoing challenge'}.`,
      createdAt: new Date().toISOString(), // Use current date as fallback since legacy challenges don't have createdAt
    };
    
    setSelectedChallenge(challengeData);
    setSelectedChallengeImage(challenge.image); // Show image for featured challenges
    setSelectedChallengeParticipants(challenge.participants);
    setSelectedChallengeLocation('Not specified'); // Default location
    setShowChallengeDetailsDrawer(true);
    // Animate drawer slide-up
    Animated.spring(challengeDrawerAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };
  
  // Combine context challenges with default challenges (for demo)
  // In production, you'd fetch from Supabase
  const allChallenges = challenges.length > 0 
    ? challenges.map(c => ({
        id: c.id,
        title: c.title,
        dateRange: c.time,
        participants: c.participants,
        image: c.image,
      }))
    : DEFAULT_CHALLENGES;
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  
  // State for posts and loading
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  
  // State for image upload
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // State for editing post
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  
  // Track which posts are liked by current user
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  
  // State for comments
  const [showCommentsModal, setShowCommentsModal] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  
  // Handle image selection
  const handlePickImage = async () => {
    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to attach images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Compress to reduce upload time
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        console.log('📷 Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };


  // Upload image to Supabase Storage — uses fetch().arrayBuffer() (compatible with RN)
const uploadImageToStorage = async (imageUri: string): Promise<string | null> => {
  try {
    setUploadingImage(true);
    console.log('📤 Uploading image to Supabase Storage...');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Build unique filename
    const fileExt = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `images/${user.id}/${Date.now()}.${fileExt}`;

    // Fetch the file and get an ArrayBuffer
    console.log('📖 Fetching file and creating arrayBuffer...');
    const fetchRes = await fetch(imageUri);
    if (!fetchRes.ok) throw new Error(`Failed to fetch file: ${fetchRes.status}`);
    const arrayBuffer = await fetchRes.arrayBuffer(); // works when blob() is not available
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log('📤 Uploading ArrayBuffer (Uint8Array) to Supabase...');
    const { data, error } = await supabase.storage
      .from('community-posts')
      .upload(fileName, uint8Array, {
        contentType: fetchRes.headers.get('Content-Type') || `image/${fileExt}`,
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase Storage upload error:', error);
      throw error;
    }

    console.log('✅ Image uploaded:', data.path);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('community-posts')
      .getPublicUrl(data.path);

    console.log('🔗 Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('❌ Error uploading image:', err);
    Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
    return null;
  } finally {
    setUploadingImage(false);
  }
};





  // Fetch posts from Supabase with user profile data
  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      console.log('📡 Fetching posts from Supabase...');
      
      // Get current user for isOwner check
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setPosts([]);
        setLoadingPosts(false);
        return;
      }
      
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('❌ Error fetching posts:', postsError);
        setPosts([]);
        return;
      }

      // Fetch user's liked posts
      const { data: likesData, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUser.id);

      const likedSet = new Set<string>();
      if (!likesError && likesData) {
        likesData.forEach((like: any) => likedSet.add(like.post_id));
        setLikedPosts(likedSet);
      }

      console.log('✅ Posts fetched:', postsData?.length || 0);

      // Map Supabase data to Post interface
      const mappedPosts: Post[] = (postsData || []).map((post: any) => {
        // Read author_name directly from post (denormalized approach)
        const username = post.author_name || 'User';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=A992F6&color=fff&size=128`;
        const isLiked = likedSet.has(post.id);
        
        return {
          id: post.id,
          author: {
            id: post.user_id || 'unknown',
            name: username,
            avatar: defaultAvatar, // Generated avatar based on username
          },
          timestamp: formatTimestamp(post.created_at),
          content: post.text || '',
          image: post.media_url || null, // Your DB uses media_url
          likes: post.like_count || 0, // Your DB uses like_count (singular)
          comments: post.comment_count || 0, // Your DB uses comment_count (singular)
          shares: post.share_count || 0, // Your DB uses share_count (singular)
          isOwner: post.user_id === currentUser.id,
        };
      });

      setPosts(mappedPosts);
    } catch (error) {
      console.error('❌ Unexpected error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Format timestamp to relative time
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const handleNewPost = () => {
    setEditingPostId(null);
    setEditPostContent('');
    setNewPostContent('');
    setSelectedImage(null);
    setShowNewPostModal(true);
  };

  const handlePostSubmit = async () => {
    const text = newPostContent.trim();
    if (!text) return;

    try {
      console.log('📝 Submitting new post...');

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ User not authenticated');
        Alert.alert('Error', 'Please log in to create a post');
        return;
      }

      // Get author name from user metadata or email
      const authorName = 
        user.user_metadata?.full_name || 
        user.email?.split('@')[0] || 
        'User';

      console.log('👤 Author name:', authorName);

      // Upload image if one is selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImageToStorage(selectedImage);
        if (!imageUrl) {
          // Upload failed, ask user if they want to continue without image
          Alert.alert(
            'Image Upload Failed',
            'Would you like to post without the image?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Post Anyway', 
                onPress: async () => {
                  await createPost(user.id, text, authorName, null);
                }
              },
            ]
          );
          return;
        }
      }

      // Create the post
      await createPost(user.id, text, authorName, imageUrl);

    } catch (error) {
      console.error('❌ Unexpected error submitting post:', error);
      Alert.alert('Error', 'An unexpected error occurred while creating your post.');
    }
  };

  // Helper function to create post in database
  const createPost = async (userId: string, text: string, authorName: string, imageUrl: string | null) => {
    try {
      // Insert post into Supabase with author_name and image
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: userId,
            text: text,
            author_name: authorName,
            media_url: imageUrl, // Store image URL
            media_type: imageUrl ? 'image' : null, // Set media_type according to schema
            like_count: 0, // Initialize like_count to 0
            comment_count: 0, // Initialize comment_count to 0
          }
        ])
        .select();

      if (error) {
        console.error('❌ Error creating post:', error);
        Alert.alert('Error', 'Failed to create post. Please try again.');
        return;
      }

      console.log('✅ Post created successfully:', data);

      // Clear input, image, and close modal
      setNewPostContent('');
      setSelectedImage(null);
      setShowNewPostModal(false);

      // Refresh feed immediately
      fetchPosts();
    } catch (error) {
      console.error('❌ Unexpected error creating post:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleMenuPress = (postId: string) => {
    setShowPostMenu(postId);
  };

  // Handle like/unlike post
  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to like posts');
        return;
      }

      if (isLiked) {
        // Insert like
        const { error: insertError } = await supabase
          .from('post_likes')
          .insert([{ post_id: postId, user_id: user.id }]);

        if (insertError) {
          console.error('❌ Error liking post:', insertError);
          Alert.alert('Error', 'Failed to like post. Please try again.');
          return;
        }

        // Update like_count in posts table
        const { data: postData, error: fetchError } = await supabase
          .from('posts')
          .select('like_count')
          .eq('id', postId)
          .single();

        if (!fetchError && postData) {
          const newLikeCount = (postData.like_count || 0) + 1;
          const { error: updateError } = await supabase
            .from('posts')
            .update({ like_count: newLikeCount })
            .eq('id', postId);

          if (updateError) {
            console.error('❌ Error updating like_count:', updateError);
            // Don't return - still update UI, but log the error
            console.warn('⚠️ Like inserted but count update failed. Count may be out of sync.');
          } else {
            console.log('✅ Like count updated successfully:', newLikeCount);
          }
        }

        // Update local state immediately for better UX
        setLikedPosts(prev => new Set(prev).add(postId));
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
        ));
        
        // Refresh feed after a short delay to ensure database update is committed
        setTimeout(() => {
          fetchPosts();
        }, 300);
      } else {
        // Remove like
        const { error: deleteError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('❌ Error unliking post:', deleteError);
          Alert.alert('Error', 'Failed to unlike post. Please try again.');
          return;
        }

        // Update like_count in posts table
        const { data: postData, error: fetchError } = await supabase
          .from('posts')
          .select('like_count')
          .eq('id', postId)
          .single();

        if (!fetchError && postData) {
          const newLikeCount = Math.max(0, (postData.like_count || 0) - 1);
          const { error: updateError } = await supabase
            .from('posts')
            .update({ like_count: newLikeCount })
            .eq('id', postId);

          if (updateError) {
            console.error('❌ Error updating like_count:', updateError);
            console.warn('⚠️ Like deleted but count update failed. Count may be out of sync.');
          } else {
            console.log('✅ Like count updated successfully:', newLikeCount);
          }
        }

        // Update local state immediately for better UX
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 0) - 1) } : p
        ));
        
        // Refresh feed after a short delay to ensure database update is committed
        setTimeout(() => {
          fetchPosts();
        }, 300);
      }
    } catch (error) {
      console.error('❌ Unexpected error liking post:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) {
                console.error('❌ Error deleting post:', error);
                Alert.alert('Error', 'Failed to delete post. Please try again.');
                return;
              }

              console.log('✅ Post deleted successfully');
              setShowPostMenu(null);
              fetchPosts(); // Refresh feed
            } catch (error) {
              console.error('❌ Unexpected error deleting post:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ]
    );
  };

  // Handle edit post
  const handleEditPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setEditingPostId(postId);
      setEditPostContent(post.content);
      setShowPostMenu(null);
      setShowNewPostModal(true);
    }
  };

  // Handle save edited post
  const handleSaveEdit = async () => {
    if (!editingPostId || !editPostContent.trim()) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          text: editPostContent.trim()
        })
        .eq('id', editingPostId);

      if (error) {
        console.error('❌ Error updating post:', error);
        Alert.alert('Error', 'Failed to update post. Please try again.');
        return;
      }

      console.log('✅ Post updated successfully');
      setEditingPostId(null);
      setEditPostContent('');
      setShowNewPostModal(false);
      fetchPosts(); // Refresh feed
    } catch (error) {
      console.error('❌ Unexpected error updating post:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  // Fetch comments for a post and enrich with author names
  const fetchComments = async (postId: string) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching comments:', error);
        return;
      }

      // Get current user for name matching
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentUserName = currentUser 
        ? (currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User')
        : 'User';

      // Enrich comments with author names
      // For current user's comments, use their name
      // For others, try to get from posts table (if commenter is post author) or use fallback
      const enrichedComments = (data || []).map((comment: any) => {
        let authorName = 'User';
        
        // If it's the current user's comment, use their name
        if (currentUser && comment.user_id === currentUser.id) {
          authorName = currentUserName;
        } else {
          // Try to get author name from the post if commenter is the post author
          const post = posts.find(p => p.id === postId);
          if (post && post.author.id === comment.user_id) {
            authorName = post.author.name;
          } else {
            // Fallback: use "User" for other users
            authorName = 'User';
          }
        }
        
        return {
          ...comment,
          author_name: authorName,
        };
      });

      setComments(prev => ({ ...prev, [postId]: enrichedComments }));
    } catch (error) {
      console.error('❌ Unexpected error fetching comments:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Handle open comments modal
  const handleOpenComments = (postId: string) => {
    setShowCommentsModal(postId);
    if (!comments[postId]) {
      fetchComments(postId);
    }
  };

  // Handle add comment
  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to comment');
        return;
      }

      // Insert comment (without author_name - column doesn't exist in schema)
      const { data: commentData, error: insertError } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            text: newComment.trim(),
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error adding comment:', insertError);
        Alert.alert('Error', 'Failed to add comment. Please try again.');
        return;
      }

      // Update comment_count in posts table
      const { data: postData, error: fetchError } = await supabase
        .from('posts')
        .select('comment_count')
        .eq('id', postId)
        .single();

      if (!fetchError && postData) {
        const newCommentCount = (postData.comment_count || 0) + 1;
        const { error: updateError } = await supabase
          .from('posts')
          .update({ comment_count: newCommentCount })
          .eq('id', postId);

        if (updateError) {
          console.error('❌ Error updating comment_count:', updateError);
          // Don't return - still add comment to UI, but log the error
          console.warn('⚠️ Comment inserted but count update failed. Count may be out of sync.');
        } else {
          console.log('✅ Comment count updated successfully:', newCommentCount);
        }
      }

      // Add comment to local state with author name
      if (commentData) {
        const authorName = 
          user.user_metadata?.full_name || 
          user.email?.split('@')[0] || 
          'User';
        
        const enrichedComment = {
          ...commentData,
          author_name: authorName,
        };
        
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), enrichedComment]
        }));
        
        // Update post comment count locally
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p
        ));
      }

      setNewComment('');
      
      // Refresh feed after a short delay to ensure database update is committed
      setTimeout(() => {
        fetchPosts();
      }, 300);
    } catch (error) {
      console.error('❌ Unexpected error adding comment:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
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

      {/* Loading State */}
      {loadingPosts ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : posts.length > 0 ? (
        /* Posts List */
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            onMenuPress={handleMenuPress}
            onLike={handleLike}
            onComment={handleOpenComments}
            isLiked={likedPosts.has(post.id)}
          />
        ))
      ) : (
        /* Empty State */
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyStateTitle}>No posts yet</Text>
          <Text style={styles.emptyStateText}>
            Be the first to share your fitness journey with the community!
          </Text>
        </View>
      )}
    </View>
  );

  const renderChallengeDetailsDrawer = () => {
    if (!selectedChallenge) return null;

    const screenHeight = Dimensions.get('window').height;
    const drawerHeight = screenHeight * 0.7; // 70% of screen height

    const slideUp = challengeDrawerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [drawerHeight, 0],
    });

    const backdropOpacity = challengeDrawerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    });

    const closeDrawer = () => {
      Animated.timing(challengeDrawerAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowChallengeDetailsDrawer(false);
        setSelectedChallenge(null);
        setSelectedChallengeImage(null);
        setSelectedChallengeParticipants(0);
        setSelectedChallengeLocation('');
      });
    };

    return (
      <Modal
        visible={showChallengeDetailsDrawer}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <TouchableOpacity
          style={styles.challengeDrawerBackdrop}
          activeOpacity={1}
          onPress={closeDrawer}
        >
          <Animated.View
            style={[
              styles.challengeDrawerBackdropOverlay,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.challengeDrawerContainer,
            {
              height: drawerHeight,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          <View style={styles.challengeDrawerHeader}>
            <Text style={styles.challengeDrawerTitle}>Challenge Details</Text>
            <TouchableOpacity
              onPress={closeDrawer}
              style={styles.challengeDrawerCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.navy} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.challengeDrawerContent}
            contentContainerStyle={styles.challengeDrawerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Challenge Image - Only for Featured Challenges */}
            {selectedChallengeImage && (
              <View style={styles.challengeDrawerImageContainer}>
                <Image
                  source={{ uri: selectedChallengeImage }}
                  style={styles.challengeDrawerImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Challenge Title */}
            <Text style={styles.challengeDrawerTitleText}>
              {selectedChallenge.title}
            </Text>

            {/* Challenge Description */}
            <Text style={styles.challengeDrawerDescription}>
              {selectedChallenge.description}
            </Text>

            {/* Challenge Details Section */}
            <View style={styles.challengeDrawerDetailsSection}>
              {/* Number of People */}
              <View style={styles.challengeDrawerDetailItem}>
                <View style={styles.challengeDrawerDetailIcon}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.challengeDrawerDetailContent}>
                  <Text style={styles.challengeDrawerDetailLabel}>Participants</Text>
                  <Text style={styles.challengeDrawerDetailValue}>
                    {selectedChallengeParticipants > 0 
                      ? `${selectedChallengeParticipants} people` 
                      : 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.challengeDrawerDetailItem}>
                <View style={styles.challengeDrawerDetailIcon}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.challengeDrawerDetailContent}>
                  <Text style={styles.challengeDrawerDetailLabel}>Location</Text>
                  <Text style={styles.challengeDrawerDetailValue}>
                    {selectedChallengeLocation || 'Not specified'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  const renderChallenges = () => (
    <View style={styles.challengesContainer}>
      {/* Challenges Header */}
      <View style={styles.challengesHeader}>
        <View>
          <Text style={styles.challengesHeading}>Ready to achieve 'god' status?</Text>
          <Text style={styles.challengesSubheading}>
            Select community challenges to join and give your workout its needed flair!
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createChallengeButton}
          onPress={() => navigation.navigate('CreateChallenge')}
          accessibilityLabel="Create new challenge"
        >
          <Ionicons name="add-circle" size={20} color={COLORS.white} />
          <Text style={styles.createChallengeButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* User-Created Challenges List */}
      {challengesData.length > 0 && (
        <View style={styles.userChallengesSection}>
          <Text style={styles.userChallengesTitle}>Your Challenges</Text>
          {challengesData.map((challenge) => (
            <ChallengeDataCard
              key={challenge.id}
              challenge={challenge}
              onPress={() => handleChallengeCardPress(challenge)}
              isSelected={selectedChallenge?.id === challenge.id}
            />
          ))}
        </View>
      )}

      {/* Featured Challenges List (from context) */}
      {allChallenges.length > 0 ? (
        <View style={styles.legacyChallengesSection}>
          <Text style={styles.legacyChallengesTitle}>Featured Challenges</Text>
          {allChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onPress={() => handleLegacyChallengePress(challenge)}
            />
          ))}
        </View>
      ) : (
        challengesData.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyStateTitle}>No challenges yet</Text>
            <Text style={styles.emptyStateText}>
              Be the first to create a challenge!
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('CreateChallenge')}
            >
              <Text style={styles.emptyStateButtonText}>Create Challenge</Text>
            </TouchableOpacity>
          </View>
        )
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7FA" />
      )}
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
              <Text style={styles.modalTitle}>
                {editingPostId ? 'Edit Post' : 'New Post'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNewPostModal(false);
                  setEditingPostId(null);
                  setEditPostContent('');
                  setNewPostContent('');
                  setSelectedImage(null);
                }}
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
              value={editingPostId ? editPostContent : newPostContent}
              onChangeText={editingPostId ? setEditPostContent : setNewPostContent}
            />
            {/* Image Preview - Only show for new posts, not when editing */}
            {selectedImage && !editingPostId && (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                  accessibilityLabel="Remove image"
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            )}
            
            {/* Show existing image when editing */}
            {editingPostId && (() => {
              const post = posts.find(p => p.id === editingPostId);
              return post?.image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: post.image }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <Text style={styles.editImageNote}>Image cannot be changed when editing</Text>
                </View>
              ) : null;
            })()}

            <View style={styles.modalActions}>
              {!editingPostId && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                  accessibilityLabel="Add image to post"
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons 
                        name={selectedImage ? "checkmark-circle" : "image-outline"} 
                        size={24} 
                        color={selectedImage ? COLORS.primary : COLORS.primary} 
                      />
                      <Text style={styles.addImageText}>
                        {selectedImage ? 'Change Image' : 'Add Image'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.submitPostButton,
                  ((editingPostId ? !editPostContent.trim() : !newPostContent.trim()) || uploadingImage) && styles.submitPostButtonDisabled,
                ]}
                onPress={editingPostId ? handleSaveEdit : handlePostSubmit}
                disabled={(editingPostId ? !editPostContent.trim() : !newPostContent.trim()) || uploadingImage}
                accessibilityLabel={editingPostId ? "Save changes" : "Submit post"}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitPostButtonText}>
                    {editingPostId ? 'Save' : 'Post'}
                  </Text>
                )}
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
                if (showPostMenu) {
                  handleEditPost(showPostMenu);
                }
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
                if (showPostMenu) {
                  handleDeletePost(showPostMenu);
                }
              }}
              accessibilityLabel="Delete post"
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.menuItemText, styles.deleteText]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCommentsModal(null);
          setNewComment('');
        }}
      >
        <View style={styles.commentsModalOverlay}>
          <View style={styles.commentsModalContent}>
            <View style={styles.commentsModalHeader}>
              <Text style={styles.commentsModalTitle}>Comments</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCommentsModal(null);
                  setNewComment('');
                }}
                accessibilityLabel="Close comments"
              >
                <Ionicons name="close" size={24} color={COLORS.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentsList}>
              {showCommentsModal && loadingComments[showCommentsModal] ? (
                <View style={styles.loadingState}>
                  <Text style={styles.loadingText}>Loading comments...</Text>
                </View>
              ) : showCommentsModal && comments[showCommentsModal]?.length > 0 ? (
                comments[showCommentsModal].map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>
                        {comment.author_name || 'User'}
                      </Text>
                      <Text style={styles.commentTime}>
                        {formatTimestamp(comment.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color={COLORS.border} />
                  <Text style={styles.emptyStateText}>No comments yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Be the first to comment!
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor={COLORS.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendCommentButton,
                  !newComment.trim() && styles.sendCommentButtonDisabled
                ]}
                onPress={() => {
                  if (showCommentsModal && newComment.trim()) {
                    handleAddComment(showCommentsModal);
                  }
                }}
                disabled={!newComment.trim()}
                accessibilityLabel="Send comment"
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={newComment.trim() ? COLORS.white : COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Challenge Details Bottom Drawer */}
      {renderChallengeDetailsDrawer()}

      {/* Create Challenge Modal */}
      <Modal
        visible={showCreateChallengeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCreateChallengeModal(false);
          setNewChallengeTitle('');
          setNewChallengeDescription('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Challenge</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateChallengeModal(false);
                  setNewChallengeTitle('');
                  setNewChallengeDescription('');
                }}
                accessibilityLabel="Close create challenge form"
              >
                <Ionicons name="close" size={24} color={COLORS.navy} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postInput}
              placeholder="Challenge Title"
              placeholderTextColor={COLORS.textSecondary}
              value={newChallengeTitle}
              onChangeText={setNewChallengeTitle}
              maxLength={100}
            />

            <TextInput
              style={[styles.postInput, styles.challengeDescriptionInput]}
              placeholder="Challenge Description"
              placeholderTextColor={COLORS.textSecondary}
              value={newChallengeDescription}
              onChangeText={setNewChallengeDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.submitPostButton,
                  (!newChallengeTitle.trim() || !newChallengeDescription.trim()) && styles.submitPostButtonDisabled,
                ]}
                onPress={() => createChallenge(newChallengeTitle, newChallengeDescription)}
                disabled={!newChallengeTitle.trim() || !newChallengeDescription.trim()}
                accessibilityLabel="Create challenge"
              >
                <Text style={styles.submitPostButtonText}>Create Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    // Android-specific: Add padding top to account for status bar
    ...(Platform.OS === 'android' && {
      paddingTop: StatusBar.currentHeight || 0,
    }),
  },
  
  // ============================================
  // HEADER - matches ProfileScreen, HomeScreen style
  // ============================================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 18 : 16, // More padding on Android
    paddingBottom: Platform.OS === 'android' ? 20 : 16, // More padding on Android
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 26 : 28, // Slightly smaller on Android
    fontWeight: 'bold',
    color: COLORS.navy,                  // #1E3A5F
    lineHeight: Platform.OS === 'android' ? 32 : 34,
  },
  notificationButton: {
    width: 44,                           // Same as ProfileScreen settingsButton
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,                 // Same shadow as ProfileScreen
      shadowRadius: 6,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 3, // Increased for better visibility
    }),
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
    paddingTop: Platform.OS === 'android' ? 16 : 16, // Consistent top padding
    paddingBottom: Platform.OS === 'android' ? 120 : 100, // More bottom padding on Android for floating button
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
    marginBottom: Platform.OS === 'android' ? 20 : 16, // More spacing on Android
    // iOS shadow
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,                  // Same as ScoreCard
      shadowRadius: 12,
    }),
    // Android elevation
    ...(Platform.OS === 'android' && {
      elevation: 6, // Increased for better visibility
    }),
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
  // LOADING STATE
  // ============================================
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  
  // ============================================
  // EMPTY STATE
  // ============================================
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // ============================================
  // CHALLENGES
  // ============================================
  challengesContainer: {
    flex: 1,
  },
  challengesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
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
    lineHeight: 20,
    flex: 1,
    marginRight:100,
  },
  createChallengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: -90,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createChallengeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  challengeImagePlaceholder: {
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
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
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: COLORS.borderLight,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
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
  editImageNote: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: COLORS.white,
    padding: 8,
    borderRadius: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  
  // ============================================
  // COMMENTS MODAL
  // ============================================
  commentsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentsModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
  },
  commentsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  commentsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  commentsList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  commentItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.navy,
    maxHeight: 100,
    marginRight: 8,
  },
  sendCommentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // ============================================
  // NEW CHALLENGES AREA STYLES
  // ============================================
  challengesListContent: {
    paddingBottom: 16,
  },
  userChallengesSection: {
    marginTop: 0,
    marginBottom: 24,
  },
  userChallengesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 16,
  },
  legacyChallengesSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  legacyChallengesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 16,
  },
  challengeDataCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  challengeDataCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    elevation: 5,
  },
  challengeDataCardContent: {
    flex: 1,
    marginRight: 12,
  },
  challengeDataCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 6,
  },
  challengeDataCardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  challengeDataCardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  challengeDataCardArrow: {
    marginLeft: 8,
  },
  
  // Challenge Details Bottom Drawer
  challengeDrawerBackdrop: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  challengeDrawerBackdropOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  challengeDrawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  challengeDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 22 : 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  challengeDrawerTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 22,
    fontWeight: 'bold',
    color: COLORS.navy,
    lineHeight: Platform.OS === 'android' ? 26 : 28,
  },
  challengeDrawerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeDrawerContent: {
    flex: 1,
  },
  challengeDrawerScrollContent: {
    padding: Platform.OS === 'android' ? 24 : 20,
    paddingBottom: Platform.OS === 'android' ? 40 : 36,
  },
  challengeDrawerImageContainer: {
    width: '100%',
    height: Platform.OS === 'android' ? 200 : 180,
    marginBottom: Platform.OS === 'android' ? 24 : 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  challengeDrawerImage: {
    width: '100%',
    height: '100%',
  },
  challengeDrawerTitleText: {
    fontSize: Platform.OS === 'android' ? 26 : 24,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: Platform.OS === 'android' ? 16 : 14,
    lineHeight: Platform.OS === 'android' ? 32 : 30,
  },
  challengeDrawerDescription: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    color: COLORS.textSecondary,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
    marginBottom: Platform.OS === 'android' ? 28 : 24,
  },
  challengeDrawerDetailsSection: {
    marginTop: Platform.OS === 'android' ? 8 : 4,
  },
  challengeDrawerDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Platform.OS === 'android' ? 20 : 18,
    paddingBottom: Platform.OS === 'android' ? 20 : 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  challengeDrawerDetailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 16 : 14,
  },
  challengeDrawerDetailContent: {
    flex: 1,
  },
  challengeDrawerDetailLabel: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    color: COLORS.textSecondary,
    marginBottom: Platform.OS === 'android' ? 6 : 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeDrawerDetailValue: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: '600',
    color: COLORS.navy,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  challengeDescriptionInput: {
    minHeight: 120,
    marginTop: 12,
    textAlignVertical: 'top',
  },
});

export default CommunityScreen;
