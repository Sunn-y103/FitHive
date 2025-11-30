import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

interface HealthDataItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor?: string;
  title: string;
  value: string;
  unit: string;
  onPress?: () => void;
}

const HealthDataItem: React.FC<HealthDataItemProps> = ({
  icon,
  iconBackgroundColor,
  iconColor = '#FFFFFF',
  title,
  value,
  unit,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.healthDataItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.healthDataContent}>
        <Text style={styles.healthDataTitle}>{title}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.healthDataValue}>{value}</Text>
          <Text style={styles.healthDataUnit}> {unit}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
    </TouchableOpacity>
  );
};

type RootStackParamList = {
  WaterIntake: undefined;
  Sleep: undefined;
  PeriodCycle: undefined;
};

type AllHealthDataScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const AllHealthDataScreen: React.FC = () => {
  const navigation = useNavigation<AllHealthDataScreenNavigationProp>();

  const healthData = [
    {
      id: '1',
      icon: 'body' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#A992F6',
      title: 'Body mass index',
      value: '18,69',
      unit: 'BMI',
    },
    {
      id: '2',
      icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#63e5ff',
      title: 'Water Intake',
      value: '7 Litre',
      unit: 'litre',
    },
    {
      id: '3',
      icon: 'calendar' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#F5A623',
      title: 'Cycle tracking',
      value: '08 April',
      unit: '',
    },
    {
      id: '4',
      icon: 'bed' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#1E3A5F',
      title: 'Sleep',
      value: '7 hr 31',
      unit: 'min',
    },
    {
      id: '5',
      icon: 'barbell-outline' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#FFE5E5',
      iconColor: '#E74C3C',
      title: 'Workout',
      value: '68',
      unit: 'BPM',
    },
    {
      id: '6',
      icon: 'flame' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#F5A623',
      title: 'Burned calories',
      value: '850',
      unit: 'kcal',
    },
    {
      id: '7',
      icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap,
      iconBackgroundColor: '#7B5EA7',
      title: 'Nutrition',
      value: '29.7',
      unit: '%',
    },
    
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Health Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {healthData.map((item) => (
          <HealthDataItem
            key={item.id}
            icon={item.icon}
            iconBackgroundColor={item.iconBackgroundColor}
            iconColor={item.iconColor}
            title={item.title}
            value={item.value}
            unit={item.unit}
            onPress={
              item.title === 'Water Intake' 
                ? () => navigation.navigate('WaterIntake') 
                : item.title === 'Sleep' 
                  ? () => navigation.navigate('Sleep')
                  : item.title === 'Cycle tracking'
                    ? () => navigation.navigate('PeriodCycle')
                    : undefined
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
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
  healthDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  healthDataContent: {
    flex: 1,
  },
  healthDataTitle: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthDataValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  healthDataUnit: {
    fontSize: 14,
    color: '#6F6F7B',
  },
  dragSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 8,
  },
  dragDots: {
    marginRight: 12,
  },
  dotRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A992F6',
    marginHorizontal: 2,
  },
  dragText: {
    fontSize: 16,
    color: '#A992F6',
    fontWeight: '500',
  },
});

export default AllHealthDataScreen;

