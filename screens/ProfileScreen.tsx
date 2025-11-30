import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useImmediatePersistentState, usePersistentState } from '../hooks/usePersistentState';
import { Storage } from '../utils/storage';
import { RootStackParamList } from '../navigation/AppNavigator';

// Profile data interface
interface ProfileData {
  name: string;
  email: string;
  age: string;
  height: string;
  weight: string;
  gender: string;
}

// Menu item interface
interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightElement,
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.menuIconContainer}>
      <Ionicons name={icon} size={22} color="#A992F6" />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (showChevron && (
      <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
    ))}
  </TouchableOpacity>
);

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeTabs'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { signOut, user } = useAuth();
  
  // Profile state with immediate persistence (auto-saves as user types)
  const [profile, setProfile] = useImmediatePersistentState<ProfileData>('profile', {
    name: user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    age: '28',
    height: '175',
    weight: '70',
    gender: 'Male',
  });

  // Settings state with persistence
  const [notificationsEnabled, setNotificationsEnabled] = usePersistentState<boolean>('notificationsEnabled', true);
  const [darkModeEnabled, setDarkModeEnabled] = usePersistentState<boolean>('darkModeEnabled', false);
  
  // Logout loading state
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Modal state (not persisted - temporary editing state)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileData>(profile);
  
  // Sync editing profile when modal opens or profile changes
  useEffect(() => {
    if (isEditModalVisible) {
      setEditingProfile({ ...profile });
    }
  }, [isEditModalVisible, profile]);

  // Open edit modal
  const handleOpenEdit = () => {
    setEditingProfile({ ...profile });
    setIsEditModalVisible(true);
  };

  // Save profile changes - uses immediate persistence so auto-saves
  const handleSaveProfile = () => {
    if (!editingProfile.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!editingProfile.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    
    // Save to persistent state (automatically saved immediately to AsyncStorage)
    setProfile(editingProfile);
    setIsEditModalVisible(false);
  };

  // Get initials for avatar
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            try {
              // Sign out from Supabase
              await signOut();
              
              // Clear user-specific data from AsyncStorage
              await Storage.clearUserData();
              
              // Navigate to Login screen and reset navigation stack
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
              setLogoutLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#1E3A5F" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email || user?.email || 'No email'}</Text>
          
          <TouchableOpacity style={styles.editButton} onPress={handleOpenEdit}>
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.age}</Text>
            <Text style={styles.statLabel}>Age</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.height} cm</Text>
            <Text style={styles.statLabel}>Height</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.weight} kg</Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            title="Personal Information"
            onPress={handleOpenEdit}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
          />
          <MenuItem
            icon="card-outline"
            title="Subscription"
            subtitle="Free Plan"
          />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuSection}>
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            showChevron={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E8E8F0', true: '#A992F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuItem
            icon="moon-outline"
            title="Dark Mode"
            showChevron={false}
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#E8E8F0', true: '#A992F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuItem
            icon="language-outline"
            title="Language"
            subtitle="English"
          />
        </View>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuSection}>
          <MenuItem
            icon="help-circle-outline"
            title="Help & FAQ"
          />
          <MenuItem
            icon="chatbubble-outline"
            title="Contact Us"
          />
          <MenuItem
            icon="document-text-outline"
            title="Terms & Privacy Policy"
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, logoutLoading && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <ActivityIndicator color="#FF6B6B" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>FitHive v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1E3A5F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#A0A0A0"
                value={editingProfile.name}
                onChangeText={(text) =>
                  setEditingProfile({ ...editingProfile, name: text })
                }
              />

              {/* Email Input */}
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#A0A0A0"
                value={editingProfile.email}
                onChangeText={(text) =>
                  setEditingProfile({ ...editingProfile, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Age Input */}
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                placeholderTextColor="#A0A0A0"
                value={editingProfile.age}
                onChangeText={(text) =>
                  setEditingProfile({ ...editingProfile, age: text })
                }
                keyboardType="number-pad"
              />

              {/* Height & Weight Row */}
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="175"
                    placeholderTextColor="#A0A0A0"
                    value={editingProfile.height}
                    onChangeText={(text) =>
                      setEditingProfile({ ...editingProfile, height: text })
                    }
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="70"
                    placeholderTextColor="#A0A0A0"
                    value={editingProfile.weight}
                    onChangeText={(text) =>
                      setEditingProfile({ ...editingProfile, weight: text })
                    }
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Gender Selection */}
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderOption,
                      editingProfile.gender === gender && styles.genderOptionSelected,
                    ]}
                    onPress={() =>
                      setEditingProfile({ ...editingProfile, gender })
                    }
                  >
                    <Text
                      style={[
                        styles.genderText,
                        editingProfile.gender === gender && styles.genderTextSelected,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A992F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E8E8F0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6F6F7B',
  },
  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F6F7B',
    marginBottom: 12,
    marginTop: 8,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  // Menu Item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F8',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E3A5F',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6F6F7B',
    marginTop: 2,
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  // Version
  versionText: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  // Input
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E3A5F',
    borderWidth: 2,
    borderColor: '#E8E8F0',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    flex: 1,
    marginRight: 8,
  },
  // Gender
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F7F7FA',
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8F0',
  },
  genderOptionSelected: {
    backgroundColor: '#A992F6',
    borderColor: '#A992F6',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F6F7B',
  },
  genderTextSelected: {
    color: '#FFFFFF',
  },
  // Save Button
  saveButton: {
    backgroundColor: '#A992F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;
