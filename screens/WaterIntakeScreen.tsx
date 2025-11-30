import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 80;
const GRAPH_HEIGHT = 180;
const GRAPH_PADDING = { top: 20, bottom: 30, left: 40, right: 20 };

interface WaterEntry {
  id: string;
  liters: number;
  timestamp: Date;
}

type TabType = 'Today' | 'Weekly' | 'Monthly';

const timeOptions = [
  { label: 'Now', hoursAgo: 0 },
  { label: '1h ago', hoursAgo: 1 },
  { label: '2h ago', hoursAgo: 2 },
  { label: '5h ago', hoursAgo: 5 },
];

const WaterIntakeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [waterAmount, setWaterAmount] = useState('');
  const [selectedTime, setSelectedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('Today');
  const [entries, setEntries] = useState<WaterEntry[]>([
    // Sample data
    { id: '1', liters: 0.5, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: '2', liters: 0.3, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { id: '3', liters: 0.7, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { id: '4', liters: 0.4, timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    { id: '5', liters: 0.5, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { id: '6', liters: 0.6, timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: '7', liters: 0.8, timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000) },
    { id: '8', liters: 0.4, timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000) },
    { id: '9', liters: 0.5, timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000) },
    { id: '10', liters: 0.7, timestamp: new Date(Date.now() - 144 * 60 * 60 * 1000) },
    { id: '11', liters: 0.6, timestamp: new Date(Date.now() - 168 * 60 * 60 * 1000) },
  ]);

  const handleAddWater = () => {
    const amount = parseFloat(waterAmount);
    if (isNaN(amount) || amount <= 0) return;

    const hoursAgo = timeOptions[selectedTime].hoursAgo;
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const newEntry: WaterEntry = {
      id: Date.now().toString(),
      liters: amount,
      timestamp,
    };

    setEntries([newEntry, ...entries]);
    setWaterAmount('');
    setSelectedTime(0);
  };

  const getGraphData = (): { labels: string[]; values: number[] } => {
    const now = new Date();

    if (activeTab === 'Today') {
      const labels = ['12h', '10h', '8h', '6h', '4h', '2h', 'Now'];
      const values: number[] = [];

      for (let i = 6; i >= 0; i--) {
        const startHour = i * 2;
        const endHour = (i - 1) * 2;
        const startTime = new Date(now.getTime() - startHour * 60 * 60 * 1000);
        const endTime = i === 0 ? now : new Date(now.getTime() - endHour * 60 * 60 * 1000);

        const periodTotal = entries
          .filter((e) => e.timestamp >= startTime && e.timestamp < endTime)
          .reduce((sum, e) => sum + e.liters, 0);

        values.push(periodTotal);
      }

      return { labels, values: values.reverse() };
    } else if (activeTab === 'Weekly') {
      const labels: string[] = [];
      const values: number[] = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        labels.push(days[date.getDay()]);

        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayTotal = entries
          .filter((e) => e.timestamp >= dayStart && e.timestamp <= dayEnd)
          .reduce((sum, e) => sum + e.liters, 0);

        values.push(dayTotal);
      }

      return { labels, values };
    } else {
      const labels: string[] = [];
      const values: number[] = [];
      const daysPerGroup = Math.ceil(30 / 7);

      for (let i = 0; i < 7; i++) {
        const startDay = i * daysPerGroup;
        const endDay = Math.min((i + 1) * daysPerGroup, 30);
        
        const startDate = new Date(now.getTime() - (30 - startDay) * 24 * 60 * 60 * 1000);
        const endDate = new Date(now.getTime() - (30 - endDay) * 24 * 60 * 60 * 1000);

        labels.push(`W${i + 1}`);

        const periodTotal = entries
          .filter((e) => e.timestamp >= startDate && e.timestamp <= endDate)
          .reduce((sum, e) => sum + e.liters, 0);

        values.push(periodTotal / daysPerGroup);
      }

      return { labels, values };
    }
  };

  const getAverageIntake = (): string => {
    const { values } = getGraphData();
    if (values.length === 0) return '0';
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return avg.toFixed(1);
  };

  const getTotalIntake = (): string => {
    const now = new Date();
    let filteredEntries: WaterEntry[] = [];

    if (activeTab === 'Today') {
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      filteredEntries = entries.filter((e) => e.timestamp >= twelveHoursAgo);
    } else if (activeTab === 'Weekly') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredEntries = entries.filter((e) => e.timestamp >= sevenDaysAgo);
    } else {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredEntries = entries.filter((e) => e.timestamp >= thirtyDaysAgo);
    }

    const total = filteredEntries.reduce((sum, e) => sum + e.liters, 0);
    return total.toFixed(1);
  };

  const renderGraph = () => {
    const { labels, values } = getGraphData();
    const maxValue = Math.max(...values, 1);
    const graphWidth = GRAPH_WIDTH - GRAPH_PADDING.left - GRAPH_PADDING.right;
    const graphHeight = GRAPH_HEIGHT - GRAPH_PADDING.top - GRAPH_PADDING.bottom;

    const points = values.map((value, index) => ({
      x: GRAPH_PADDING.left + (index / (values.length - 1)) * graphWidth,
      y: GRAPH_PADDING.top + graphHeight - (value / maxValue) * graphHeight,
    }));

    const createSmoothPath = () => {
      if (points.length < 2) return '';

      let path = `M ${points[0].x} ${points[0].y}`;

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? i : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }

      return path;
    };

    const createAreaPath = () => {
      const linePath = createSmoothPath();
      if (!linePath) return '';

      const lastPoint = points[points.length - 1];
      const firstPoint = points[0];
      const bottom = GRAPH_HEIGHT - GRAPH_PADDING.bottom + 10;

      return `${linePath} L ${lastPoint.x} ${bottom} L ${firstPoint.x} ${bottom} Z`;
    };

    return (
      <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* Vertical grid lines */}
        {labels.map((_, index) => {
          const x = GRAPH_PADDING.left + (index / (labels.length - 1)) * graphWidth;
          return (
            <Line
              key={`grid-${index}`}
              x1={x}
              y1={GRAPH_PADDING.top}
              x2={x}
              y2={GRAPH_HEIGHT - GRAPH_PADDING.bottom}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = GRAPH_PADDING.top + graphHeight * (1 - ratio);
          return (
            <Line
              key={`hgrid-${index}`}
              x1={GRAPH_PADDING.left}
              y1={y}
              x2={GRAPH_WIDTH - GRAPH_PADDING.right}
              y2={y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={1}
            />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, index) => {
          const y = GRAPH_PADDING.top + graphHeight * (1 - ratio);
          const value = (maxValue * ratio).toFixed(1);
          return (
            <SvgText
              key={`ylabel-${index}`}
              x={GRAPH_PADDING.left - 8}
              y={y + 4}
              fontSize={10}
              fill="rgba(255,255,255,0.6)"
              textAnchor="end"
            >
              {value}L
            </SvgText>
          );
        })}

        {/* Filled area */}
        <Path d={createAreaPath()} fill="url(#areaGradient)" />

        {/* Line */}
        <Path
          d={createSmoothPath()}
          stroke="#FFFFFF"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <React.Fragment key={`point-${index}`}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill="#A992F6"
              stroke="#FFFFFF"
              strokeWidth={3}
            />
          </React.Fragment>
        ))}

        {/* X-axis labels */}
        {labels.map((label, index) => {
          const x = GRAPH_PADDING.left + (index / (labels.length - 1)) * graphWidth;
          return (
            <SvgText
              key={`label-${index}`}
              x={x}
              y={GRAPH_HEIGHT - 8}
              fontSize={10}
              fill="rgba(255,255,255,0.7)"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    );
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const recentEntries = entries.slice(0, 5);

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
        <Text style={styles.headerTitle}>Water Intake</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="water" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Today's Intake</Text>
            <Text style={styles.summaryValue}>{getTotalIntake()}L</Text>
          </View>
          <View style={styles.goalContainer}>
            <Text style={styles.goalLabel}>Goal</Text>
            <Text style={styles.goalValue}>2.5L</Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Add Water Intake</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="0.0"
                placeholderTextColor="rgba(169, 146, 246, 0.5)"
                value={waterAmount}
                onChangeText={setWaterAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnit}>Liters</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddWater}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Time Options */}
          <Text style={styles.timeLabel}>When did you drink?</Text>
          <View style={styles.timeOptionsContainer}>
            {timeOptions.map((option, index) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.timeOption,
                  selectedTime === index && styles.timeOptionSelected,
                ]}
                onPress={() => setSelectedTime(index)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    selectedTime === index && styles.timeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Graph Card */}
        <View style={styles.graphCard}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {(['Today', 'Weekly', 'Monthly'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getTotalIntake()}L</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getAverageIntake()}L</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
          </View>

          {/* Graph */}
          <View style={styles.graphContainer}>{renderGraph()}</View>
        </View>

        {/* Recent Entries */}
        <View style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Entries</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentEntries.map((entry, index) => (
            <View 
              key={entry.id} 
              style={[
                styles.entryItem,
                index === recentEntries.length - 1 && styles.entryItemLast
              ]}
            >
              <View style={styles.entryLeft}>
                <View style={styles.entryIconContainer}>
                  <Ionicons name="water" size={16} color="#63E5FF" />
                </View>
                <View>
                  <Text style={styles.entryAmount}>{entry.liters}L</Text>
                  <Text style={styles.entryTime}>{formatTime(entry.timestamp)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.entryDeleteButton}>
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsIcon}>
            <Ionicons name="bulb" size={20} color="#F5A623" />
          </View>
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Hydration Tip</Text>
            <Text style={styles.tipsText}>
              Drink a glass of water when you wake up to kickstart your metabolism!
            </Text>
          </View>
        </View>
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#63E5FF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#63E5FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  goalLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  goalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E8E8F0',
  },
  textInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A992F6',
  },
  inputUnit: {
    fontSize: 14,
    color: '#6F6F7B',
    marginLeft: 8,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#A992F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6F6F7B',
    marginBottom: 10,
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F7F7FA',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: '#A992F6',
  },
  timeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6F6F7B',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
  },
  graphCard: {
    backgroundColor: '#A992F6',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#A992F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: '#A992F6',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  graphContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  seeAllText: {
    fontSize: 14,
    color: '#A992F6',
    fontWeight: '600',
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  entryItemLast: {
    borderBottomWidth: 0,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  entryTime: {
    fontSize: 12,
    color: '#6F6F7B',
    marginTop: 2,
  },
  entryDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  tipsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: '#6F6F7B',
    lineHeight: 18,
  },
});

export default WaterIntakeScreen;

