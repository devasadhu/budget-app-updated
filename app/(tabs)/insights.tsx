// SmartBudget/app/(tabs)/insights.tsx
// 🎨 COMPLETE INSIGHTS SCREEN - FINAL WORKING VERSION

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { smartInsightsEngine, SmartInsight } from '../../src/services/smartInsightsEngine';
import { useTransactionStore, useTransactionData } from '../_lib/useTransactionStore';
import { useBudgetStore } from '../_lib/useBudgetStore';
import { useThemeStore } from '../_lib/useThemeStore';
import { Colors } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useRouter, Href } from 'expo-router';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;

const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'Food & Dining': '#F59E0B',
    'Food': '#F59E0B',
    'Transportation': '#0EA5E9',
    'Travel': '#0EA5E9',
    'Bills & Utilities': '#8B5CF6',
    'Bills': '#8B5CF6',
    'Shopping': '#EC4899',
    'Entertainment': '#EF4444',
    'Health': '#10B981',
    'Education': '#6366F1',
    'Other': '#64748B',
  };
  return colors[category] || '#64748B';
};

export default function InsightsScreen() {
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'critical' | 'tips'>('all');
  const [selectedView, setSelectedView] = useState<'insights' | 'trends'>('insights');
  
  const { transactions, isInitialized } = useTransactionStore();
  const { budgets } = useBudgetStore();
  const { currentBalance, totalIncome } = useTransactionData();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const router = useRouter();
  
  useEffect(() => {
    if (isInitialized) loadInsights();
  }, [transactions, budgets, isInitialized]);
  
  const loadInsights = async () => {
    try {
      setLoading(true);
      const monthlyIncome = totalIncome > 0 ? totalIncome / 12 : 50000;
      await smartInsightsEngine.initialize(transactions, budgets, monthlyIncome, currentBalance);
      setInsights(smartInsightsEngine.getInsights());
    } catch (error) {
      console.error('Failed to load insights:', error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  // ✅ FIXED: Navigate with 'id' parameter (matches edit-budget.tsx: params.id)
  const handleInsightAction = (insight: SmartInsight) => {
    if (!insight.action) return;

    try {
      switch (insight.action.handler) {
        case 'navigateToBudget':
        case 'adjustBudget':
          if (insight.data?.budget) {
            router.push({
              pathname: '/edit-budget',
              params: { id: insight.data.budget.id }  // ✅ 'id' not 'budgetId'
            } as any);
          } else {
            router.replace('/(tabs)/budget' as Href);
          }
          break;
        
        case 'createWeekendBudget':
        case 'createSavingsGoal':
          router.push('/add-budget' as Href);
          break;
        
        default:
          router.replace('/(tabs)/budget' as Href);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Navigation failed');
    }
  };

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    const dailySpending = last7Days.map(date => {
      const dayTransactions = transactions.filter(t => {
        const tDate = t.date instanceof Date ? t.date : new Date(t.date);
        return tDate.toDateString() === date.toDateString() && t.type === 'debit';
      });
      return dayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    });

    const hasDailyData = dailySpending.some(val => val > 0);
    const dailyData = hasDailyData ? dailySpending : [0, 0, 0, 0, 0, 0, 0];

    const categoryTotals: { [key: string]: number } = {};
    transactions
      .filter(t => t.type === 'debit')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
      });

    const categoryData = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({
        name: name.length > 10 ? name.slice(0, 10) + '...' : name,
        amount,
        color: getCategoryColor(name),
        legendFontColor: theme.text,
        legendFontSize: 12,
      }));

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return date;
    });

    const monthlySpending = last6Months.map(date => {
      const monthTransactions = transactions.filter(t => {
        const tDate = t.date instanceof Date ? t.date : new Date(t.date);
        return tDate.getMonth() === date.getMonth() && 
               tDate.getFullYear() === date.getFullYear() &&
               t.type === 'debit';
      });
      return monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    });

    const hasMonthlyData = monthlySpending.some(val => val > 0);
    const monthlyData = hasMonthlyData ? monthlySpending : [0, 0, 0, 0, 0, 0];

    return {
      daily: {
        labels: last7Days.map(d => d.toLocaleDateString('en-IN', { weekday: 'short' })),
        datasets: [{ data: dailyData }],
      },
      category: categoryData.length > 0 ? categoryData : [
        { name: 'No Data', amount: 1, color: '#E5E7EB', legendFontColor: theme.text, legendFontSize: 12 }
      ],
      monthly: {
        labels: last6Months.map(d => d.toLocaleDateString('en-IN', { month: 'short' })),
        datasets: [{ data: monthlyData }],
      },
    };
  }, [transactions, theme]);

  const getPriorityData = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { icon: 'alert-circle', color: '#EF4444', bg: '#FEE2E2', label: 'Critical' };
      case 'high':
        return { icon: 'warning', color: '#F59E0B', bg: '#FEF3C7', label: 'High' };
      case 'medium':
        return { icon: 'information-circle', color: '#3B82F6', bg: '#DBEAFE', label: 'Medium' };
      case 'low':
        return { icon: 'checkmark-circle', color: '#10B981', bg: '#D1FAE5', label: 'Low' };
      default:
        return { icon: 'help-circle', color: '#64748B', bg: '#F1F5F9', label: 'Info' };
    }
  };
  
  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Analyzing Your Data</Text>
      </View>
    );
  }

  const criticalInsights = insights.filter(i => i.priority === 'critical' || i.priority === 'high');
  const tipInsights = insights.filter(i => i.priority === 'medium' || i.priority === 'low');
  
  const displayedInsights = 
    selectedCategory === 'critical' ? criticalInsights :
    selectedCategory === 'tips' ? tipInsights :
    insights;

  const stats = {
    total: insights.length,
    priority: criticalInsights.length,
    tips: tipInsights.length
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity * 0.7})` : `rgba(0, 0, 0, ${opacity * 0.7})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366F1' },
    propsForBackgroundLines: { strokeDasharray: '', stroke: theme.border, strokeWidth: 1 },
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Insights</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            {stats.total} AI-powered insights
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: theme.card }]}
          onPress={loadInsights}
        >
          <Ionicons name="refresh" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsBar, { backgroundColor: theme.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>Total</Text>
          <Text style={[styles.statAmount, { color: theme.text }]}>{stats.total}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>Priority</Text>
          <Text style={[styles.statAmount, { color: '#EF4444' }]}>{stats.priority}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>Tips</Text>
          <Text style={[styles.statAmount, { color: '#10B981' }]}>{stats.tips}</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.viewToggle}>
          <TouchableOpacity
            onPress={() => setSelectedView('insights')}
            style={[styles.viewToggleButton, selectedView === 'insights' && { backgroundColor: theme.tint }]}
          >
            <Ionicons name="bulb" size={16} color={selectedView === 'insights' ? 'white' : theme.text} />
            <Text style={[styles.viewToggleText, { color: selectedView === 'insights' ? 'white' : theme.text }]}>
              Insights
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedView('trends')}
            style={[styles.viewToggleButton, selectedView === 'trends' && { backgroundColor: theme.tint }]}
          >
            <Ionicons name="trending-up" size={16} color={selectedView === 'trends' ? 'white' : theme.text} />
            <Text style={[styles.viewToggleText, { color: selectedView === 'trends' ? 'white' : theme.text }]}>
              Trends
            </Text>
          </TouchableOpacity>
        </View>

        {selectedView === 'trends' ? (
          <View style={styles.chartsContainer}>
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <View style={styles.chartHeader}>
                <Ionicons name="analytics" size={20} color={theme.text} />
                <Text style={[styles.chartTitle, { color: theme.text }]}>Daily Spending (Last 7 Days)</Text>
              </View>
              <LineChart
                data={chartData.daily}
                width={CHART_WIDTH - 32}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                withDots={true}
                withShadow={false}
                fromZero={true}
              />
            </View>

            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <View style={styles.chartHeader}>
                <Ionicons name="pie-chart" size={20} color={theme.text} />
                <Text style={[styles.chartTitle, { color: theme.text }]}>Spending by Category</Text>
              </View>
              <PieChart
                data={chartData.category}
                width={CHART_WIDTH - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
                absolute
              />
            </View>

            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <View style={styles.chartHeader}>
                <Ionicons name="bar-chart" size={20} color={theme.text} />
                <Text style={[styles.chartTitle, { color: theme.text }]}>Monthly Spending Trend</Text>
              </View>
              <BarChart
                data={chartData.monthly}
                width={CHART_WIDTH - 32}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={chartConfig}
                style={styles.chart}
                showValuesOnTopOfBars={false}
                withInnerLines={true}
                fromZero={true}
                verticalLabelRotation={0}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  onPress={() => setSelectedCategory('all')}
                  style={[styles.filterChip, selectedCategory === 'all' && { backgroundColor: theme.tint }]}
                >
                  <Text style={[styles.filterChipText, { color: selectedCategory === 'all' ? 'white' : theme.text }]}>
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedCategory('critical')}
                  style={[styles.filterChip, selectedCategory === 'critical' && { backgroundColor: '#EF4444' }]}
                >
                  <Text style={[styles.filterChipText, { color: selectedCategory === 'critical' ? 'white' : theme.text }]}>
                    Priority
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedCategory('tips')}
                  style={[styles.filterChip, selectedCategory === 'tips' && { backgroundColor: '#10B981' }]}
                >
                  <Text style={[styles.filterChipText, { color: selectedCategory === 'tips' ? 'white' : theme.text }]}>
                    Tips
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            
            {displayedInsights.length === 0 ? (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={[styles.emptyState, { backgroundColor: theme.card }]}
              >
                <View style={[styles.emptyIcon, { backgroundColor: theme.tint + '15' }]}>
                  <Ionicons name="checkmark-circle" size={40} color={theme.tint} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>All Clear!</Text>
                <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
                  {selectedCategory === 'all' ? "No insights right now. Keep tracking!" : `No ${selectedCategory} insights at the moment.`}
                </Text>
              </MotiView>
            ) : (
              displayedInsights.map((insight, idx) => (
                <InsightCard 
                  key={insight.id} 
                  insight={insight} 
                  theme={theme}
                  getPriorityData={getPriorityData}
                  index={idx}
                  onActionPress={handleInsightAction}
                />
              ))
            )}
          </>
        )}
        
        <View style={styles.aiBadgeContainer}>
          <View style={[styles.aiBadge, { backgroundColor: theme.card }]}>
            <Ionicons name="sparkles" size={14} color={theme.tint} />
            <Text style={[styles.aiBadgeText, { color: theme.subtext }]}>Powered by Smart ML Engine</Text>
          </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface InsightCardProps {
  insight: SmartInsight;
  theme: any;
  getPriorityData: (priority: string) => any;
  index: number;
  onActionPress: (insight: SmartInsight) => void;
}

function InsightCard({ insight, theme, getPriorityData, index, onActionPress }: InsightCardProps) {
  const priorityData = getPriorityData(insight.priority);
  
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: index * 80, type: 'spring' }}
      style={styles.cardWrapper}
    >
      <View style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.leftSection}>
          <View style={[styles.priorityIndicator, { backgroundColor: priorityData.color + '15' }]}>
            <Ionicons name={priorityData.icon as any} size={24} color={priorityData.color} />
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.insightHeader}>
            <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityData.bg }]}>
              <Text style={[styles.priorityBadgeText, { color: priorityData.color }]}>{priorityData.label}</Text>
            </View>
          </View>
          
          <Text style={[styles.insightDescription, { color: theme.subtext }]}>{insight.description}</Text>

          {insight.actionable && insight.action && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: priorityData.color + '15' }]}
              onPress={() => onActionPress(insight)}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, { color: priorityData.color }]}>{insight.action.label}</Text>
              <Ionicons name="arrow-forward" size={16} color={priorityData.color} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '600' },
  iconButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statsBar: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statAmount: { fontSize: 20, fontWeight: '900' },
  statDivider: { width: 1, marginHorizontal: 16 },
  scrollContent: { paddingHorizontal: 20 },
  viewToggle: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  viewToggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9' },
  viewToggleText: { fontSize: 14, fontWeight: '700' },
  chartsContainer: { gap: 16 },
  chartCard: { borderRadius: 16, padding: 16, marginBottom: 4 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700' },
  chart: { marginVertical: 8, borderRadius: 16 },
  filterContainer: { marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  filterChipText: { fontSize: 14, fontWeight: '700' },
  cardWrapper: { marginBottom: 8 },
  insightCard: { flexDirection: 'row', borderRadius: 16, padding: 16, borderWidth: 1 },
  leftSection: { marginRight: 16, justifyContent: 'flex-start' },
  priorityIndicator: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rightSection: { flex: 1 },
  insightHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  insightTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priorityBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  insightDescription: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignSelf: 'flex-start' },
  actionButtonText: { fontSize: 14, fontWeight: '800' },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 16, marginTop: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', fontWeight: '500' },
  aiBadgeContainer: { alignItems: 'center', marginTop: 32, marginBottom: 20 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  aiBadgeText: { fontSize: 12, fontWeight: '700' },
});