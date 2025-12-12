import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchProfile } from '../services/profileService';
import { RootStackParamList } from '../navigation/AppNavigator';

type BMIScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BMI'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// App color palette (matching the rest of the app)
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
  borderLight: '#F0F0F0',
  error: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FF9800',
};

// BMI Category types
type BMICategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

// Calculate BMI
const calculateBMI = (weightKg: number, heightCm: number): number | null => {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 100) / 100; // Round to 2 decimal places
};

// Get BMI category
const getBMICategory = (bmi: number): BMICategory => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

// Get category color
const getCategoryColor = (category: BMICategory): string => {
  switch (category) {
    case 'Underweight':
      return COLORS.warning;
    case 'Normal':
      return COLORS.success;
    case 'Overweight':
      return COLORS.warning;
    case 'Obese':
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
};

// Average BMI values (placeholder - would come from backend in production)
const AVERAGE_MALE_BMI = 26.6;
const AVERAGE_FEMALE_BMI = 25.6;

const BMIScreen: React.FC = () => {
  const navigation = useNavigation<BMIScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [bmi, setBmi] = useState<number | null>(null);
  const [category, setCategory] = useState<BMICategory | null>(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadBMI();
  }, []);

  const loadBMI = async () => {
    try {
      setLoading(true);
      const profile = await fetchProfile();

      if (profile?.height && profile?.weight) {
        const heightNum = parseFloat(profile.height);
        const weightNum = parseFloat(profile.weight);

        if (heightNum > 0 && weightNum > 0) {
          const calculatedBMI = calculateBMI(weightNum, heightNum);
          if (calculatedBMI !== null) {
            setBmi(calculatedBMI);
            setCategory(getBMICategory(calculatedBMI));
            setHasData(true);
          } else {
            setHasData(false);
          }
        } else {
          setHasData(false);
        }
      } else {
        setHasData(false);
      }
    } catch (error) {
      console.error('❌ Error loading BMI:', error);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHeightWeight = () => {
    // Navigate to HomeTabs, then user can go to Profile tab
    // Show alert with instructions
    Alert.alert(
      'Add Height & Weight',
      'Please go to the Profile tab to add your height and weight information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to Profile',
          onPress: () => {
            navigation.navigate('HomeTabs');
            // Note: User will need to manually tap the Profile tab
            // In a production app, you might use navigation listeners or a different approach
          },
        },
      ]
    );
  };

  // Calculate progress percentage for BMI scale visualization
  const getBMIProgress = (bmiValue: number): number => {
    // Scale: Underweight (0-18.5), Normal (18.5-25), Overweight (25-30), Obese (30+)
    // Map to 0-100% for visualization
    if (bmiValue < 18.5) {
      return (bmiValue / 18.5) * 25; // 0-25% for underweight
    } else if (bmiValue < 25) {
      return 25 + ((bmiValue - 18.5) / 6.5) * 25; // 25-50% for normal
    } else if (bmiValue < 30) {
      return 50 + ((bmiValue - 25) / 5) * 25; // 50-75% for overweight
    } else {
      return 75 + Math.min(((bmiValue - 30) / 10) * 25, 25); // 75-100% for obese
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Mass Index</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your BMI...</Text>
          </View>
        ) : !hasData ? (
          // Missing data state
          <View style={styles.missingDataContainer} accessibilityLiveRegion="polite">
            <Ionicons name="body-outline" size={64} color={COLORS.border} />
            <Text style={styles.missingDataTitle}>Height & Weight Required</Text>
            <Text style={styles.missingDataText}>
              To calculate your BMI, we need your height and weight information.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddHeightWeight}
              accessibilityLabel="Add height and weight to calculate BMI"
            >
              <Ionicons name="add-circle" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.addButtonText}>Add height & weight</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // BMI Display
          <View style={styles.content} accessibilityLiveRegion="polite">
            {/* User BMI */}
            <View style={styles.bmiContainer}>
              <Text style={styles.bmiLabel}>Your BMI</Text>
              <Text
                style={styles.bmiValue}
                accessibilityLabel={`Your BMI is ${bmi}`}
              >
                {bmi}
              </Text>
              {category && (
                <View style={styles.categoryContainer}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryColor(category) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: getCategoryColor(category) },
                      ]}
                      accessibilityLabel={`BMI category: ${category}`}
                    >
                      {category}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* BMI Scale Progress Bar */}
            {bmi && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getBMIProgress(bmi)}%`,
                        backgroundColor: category
                          ? getCategoryColor(category)
                          : COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.scaleLabels}>
                  <Text style={styles.scaleLabel}>Underweight</Text>
                  <Text style={styles.scaleLabel}>Normal</Text>
                  <Text style={styles.scaleLabel}>Overweight</Text>
                  <Text style={styles.scaleLabel}>Obese</Text>
                </View>
                <View style={styles.scaleRanges}>
                  <Text style={styles.scaleRange}>&lt;18.5</Text>
                  <Text style={styles.scaleRange}>18.5-25</Text>
                  <Text style={styles.scaleRange}>25-30</Text>
                  <Text style={styles.scaleRange}>&gt;30</Text>
                </View>
              </View>
            )}

            {/* Average BMI Cards */}
            <View style={styles.averagesSection}>
              <Text style={styles.averagesTitle}>Population Averages</Text>
              <View style={styles.averagesContainer}>
                {/* Average Male BMI */}
                <View style={styles.averageCard}>
                  <View style={styles.averageCardHeader}>
                    <View
                      style={[
                        styles.averageIconContainer,
                        { backgroundColor: COLORS.primaryBg },
                      ]}
                    >
                      <Ionicons
                        name="male"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.averageLabel}>Average (Male)</Text>
                  </View>
                  <Text
                    style={styles.averageValue}
                    accessibilityLabel={`Average male BMI is ${AVERAGE_MALE_BMI}`}
                  >
                    {AVERAGE_MALE_BMI}
                  </Text>
                  <Text style={styles.averageNote}>Population average</Text>
                </View>

                {/* Average Female BMI */}
                <View style={styles.averageCard}>
                  <View style={styles.averageCardHeader}>
                    <View
                      style={[
                        styles.averageIconContainer,
                        { backgroundColor: COLORS.primaryBg },
                      ]}
                    >
                      <Ionicons
                        name="female"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.averageLabel}>Average (Female)</Text>
                  </View>
                  <Text
                    style={styles.averageValue}
                    accessibilityLabel={`Average female BMI is ${AVERAGE_FEMALE_BMI}`}
                  >
                    {AVERAGE_FEMALE_BMI}
                  </Text>
                  <Text style={styles.averageNote}>Population average</Text>
                </View>
              </View>
            </View>

            {/* Health Tip */}
            <View style={styles.healthTipContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.textSecondary}
              />
              <Text style={styles.healthTipText}>
                This is general guidance — consult a doctor for personalized
                advice.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.navy,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  missingDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  missingDataTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginTop: 24,
    marginBottom: 12,
  },
  missingDataText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  bmiContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  bmiLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  bmiValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  categoryContainer: {
    marginTop: 8,
  },
  categoryBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scaleLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  scaleRanges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleRange: {
    fontSize: 10,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  averagesSection: {
    marginBottom: 24,
  },
  averagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 16,
  },
  averagesContainer: {
    flexDirection: SCREEN_WIDTH > 600 ? 'row' : 'column',
  },
  averageCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: SCREEN_WIDTH > 600 ? 0 : 16,
  },
  averageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  averageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  averageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },
  averageValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  averageNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  healthTipContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryBg,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  healthTipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginLeft: 12,
  },
});

export default BMIScreen;

