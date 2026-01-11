// SmartBudget/app/(tabs)/reports-premium.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context"; 
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, G } from 'react-native-svg';

import { useAuthStore } from '../_lib/useAuthStore'; 
import { useThemeStore } from '../_lib/useThemeStore';
import { Colors } from '../../constants/theme';
import { useTransactionStore, useTransactionData, Transaction } from '../_lib/useTransactionStore';
import { useBudgetStore } from '../_lib/useBudgetStore';
import { CATEGORIES } from '../../constants/category';

const { width } = Dimensions.get('window');

const GRADIENTS = {
  primary: ['#6366F1', '#8B5CF6', '#A855F7'] as const,
  primaryDark: ['#4F46E5', '#7C3AED', '#C084FC'] as const,
  success: ['#10B981', '#059669'] as const,
  danger: ['#EF4444', '#DC2626'] as const,
  warning: ['#F59E0B', '#D97706'] as const,
  info: ['#0EA5E9', '#3B82F6'] as const,
};

// 📊 ANALYSIS FUNCTIONS
interface CategoryInsight {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  avgTransaction: number;
  color: string;
  icon: string;
}

const analyzeCategorySpending = (transactions: Transaction[]): CategoryInsight[] => {
  const expenses = transactions.filter(t => t.type === 'debit');
  const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const categoryMap = new Map<string, { amount: number; count: number; dates: Date[] }>();
  
  expenses.forEach(t => {
    const cat = t.category;
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { amount: 0, count: 0, dates: [] });
    }
    const data = categoryMap.get(cat)!;
    data.amount += Math.abs(t.amount);
    data.count += 1;
    data.dates.push(new Date(t.date));
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => {
      const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
      const mid = Math.floor(sortedDates.length / 2);
      const recent = sortedDates.slice(mid).length;
      const older = sortedDates.slice(0, mid).length;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (data.dates.length >= 4) {
        if (recent > older * 1.3) trend = 'up';
        else if (recent < older * 0.7) trend = 'down';
      }

      const catInfo = CATEGORIES.find(c => c.name === category);

      return {
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
        trend,
        avgTransaction: data.amount / data.count,
        color: catInfo?.color || '#6366F1',
        icon: catInfo?.icon || 'pie-chart'
      };
    })
    .sort((a, b) => b.amount - a.amount);
};

const compareTimePeriods = (transactions: Transaction[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const expenses = transactions.filter(t => t.type === 'debit');

  const thisWeek = expenses.filter(t => new Date(t.date) >= weekAgo).reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastWeek = expenses.filter(t => {
    const d = new Date(t.date);
    return d >= twoWeeksAgo && d < weekAgo;
  }).reduce((s, t) => s + Math.abs(t.amount), 0);

  const thisMonth = expenses.filter(t => new Date(t.date) >= monthStart).reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastMonth = expenses.filter(t => {
    const d = new Date(t.date);
    return d >= lastMonthStart && d <= lastMonthEnd;
  }).reduce((s, t) => s + Math.abs(t.amount), 0);

  return { thisWeek, lastWeek, thisMonth, lastMonth };
};

const calcHealthScore = (transactions: Transaction[], budgets: any[], balance: number): number => {
  let score = 100;
  if (balance < 1000) score -= 25;
  else if (balance < 5000) score -= 10;
  else if (balance > 20000) score += 5;

  const expenses = transactions.filter(t => t.type === 'debit');
  const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  if (total > 25000) score -= 20;
  else if (total > 15000) score -= 10;
  else if (total < 8000) score += 10;

  if (budgets.length > 0) {
    const exceeded = budgets.filter(b => b.spent > b.limit).length;
    score += Math.round((1 - exceeded / budgets.length) * 15);
  }

  if (transactions.length > 30) score += 5;
  else if (transactions.length < 5) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
};

// 🎯 CIRCULAR SCORE INDICATOR
const CircularScore = ({ score, size = 120, theme }: any) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (circumference * score) / 100;

  const scoreColor = score > 70 ? '#10B981' : score > 50 ? '#F59E0B' : '#EF4444';

  return (
    <View style={{ position: 'relative' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            stroke={theme.border}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={scoreColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.scoreCenter}>
        <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
        <Text style={[styles.scoreLabel, { color: theme.subtext }]}>Score</Text>
      </View>
    </View>
  );
};

// 📈 CATEGORY INSIGHT CARD
const CategoryInsightCard = ({ insight, theme, index }: any) => {
  const trendIcon = insight.trend === 'up' ? 'trending-up' : insight.trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = insight.trend === 'up' ? '#EF4444' : insight.trend === 'down' ? '#10B981' : theme.subtext;

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', delay: index * 100, damping: 15 }}
    >
      <View style={[styles.categoryCard, { backgroundColor: theme.card }]}>
        <View style={styles.categoryCardHeader}>
          <LinearGradient
            colors={[insight.color + '20', insight.color + '10'] as const}
            style={styles.categoryIconBox}
          >
            <Ionicons name={insight.icon} size={24} color={insight.color} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={styles.categoryTitleRow}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>{insight.category}</Text>
              <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
                <Ionicons name={trendIcon} size={12} color={trendColor} />
              </View>
            </View>
            <Text style={[styles.categorySubtitle, { color: theme.subtext }]}>
              {insight.count} transactions • ₹{Math.round(insight.avgTransaction).toLocaleString()} avg
            </Text>
          </View>
        </View>

        <View style={styles.categoryAmountRow}>
          <Text style={[styles.categoryAmount, { color: theme.text }]}>
            ₹{Math.round(insight.amount).toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.categoryPercentage, { color: insight.color }]}>
            {insight.percentage.toFixed(1)}%
          </Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: theme.border + '30' }]}>
          <LinearGradient
            colors={[insight.color, insight.color] as const}
            style={[styles.progressBarFill, { width: `${insight.percentage}%` }]}
          />
        </View>
      </View>
    </MotiView>
  );
};

// 📊 COMPARISON CARD
const ComparisonCard = ({ label, thisAmount, lastAmount, theme, gradient, index }: any) => {
  const change = lastAmount > 0 ? ((thisAmount - lastAmount) / lastAmount) * 100 : 0;
  const isPositive = change < 0; // Negative change is good for expenses

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: index * 100, damping: 15 }}
    >
      <LinearGradient
        colors={gradient}
        style={styles.comparisonCard}
      >
        <Text style={styles.comparisonLabel}>{label}</Text>
        <Text style={styles.comparisonAmount}>₹{Math.round(thisAmount).toLocaleString('en-IN')}</Text>
        
        {lastAmount > 0 && (
          <View style={styles.comparisonChange}>
            <Ionicons 
              name={isPositive ? "arrow-down" : "arrow-up"} 
              size={14} 
              color={isPositive ? "#D1FAE5" : "#FEE2E2"} 
            />
            <Text style={[styles.comparisonChangeText, { color: isPositive ? "#D1FAE5" : "#FEE2E2" }]}>
              {Math.abs(change).toFixed(1)}% vs last {label.toLowerCase()}
            </Text>
          </View>
        )}
      </LinearGradient>
    </MotiView>
  );
};

// 💡 INSIGHT TIP CARD
const InsightTipCard = ({ insight, theme, index }: any) => {
  const iconColors: any = {
    high: ['#EF4444', '#DC2626'] as const,
    medium: ['#F59E0B', '#D97706'] as const,
    low: ['#10B981', '#059669'] as const,
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', delay: index * 100 }}
    >
      <View style={[styles.tipCard, { backgroundColor: theme.card }]}>
        <LinearGradient
          colors={iconColors[insight.priority]}
          style={styles.tipIcon}
        >
          <Ionicons name={insight.icon} size={20} color="white" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tipTitle, { color: theme.text }]}>{insight.title}</Text>
          <Text style={[styles.tipDescription, { color: theme.subtext }]}>{insight.description}</Text>
        </View>
      </View>
    </MotiView>
  );
};

// 🏠 MAIN SCREEN
export default function PremiumInsightsScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  
  const { user, isLoading: authLoading } = useAuthStore();
  const { transactions, isLoading, currentBalance, totalExpense } = useTransactionData();
  const budgets = useBudgetStore(state => state.budgets);
  const fetchTransactions = useTransactionStore(state => state.fetchTransactions);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'trends'>('overview');

  useEffect(() => {
    if (!authLoading && user?.uid && transactions.length === 0) {
      fetchTransactions(user.uid);
    }
  }, [user?.uid, authLoading]);

  const analysis = useMemo(() => {
    const categoryInsights = analyzeCategorySpending(transactions);
    const periods = compareTimePeriods(transactions);
    const score = calcHealthScore(transactions, budgets, currentBalance);

    const weekChange = periods.lastWeek > 0 
      ? ((periods.thisWeek - periods.lastWeek) / periods.lastWeek) * 100 : 0;

    const monthChange = periods.lastMonth > 0
      ? ((periods.thisMonth - periods.lastMonth) / periods.lastMonth) * 100 : 0;

    // Generate insights
    const tips = [];
    if (categoryInsights.length > 0 && categoryInsights[0].percentage > 35) {
      tips.push({
        title: `Reduce ${categoryInsights[0].category} Spending`,
        description: `Save ₹${Math.round(categoryInsights[0].amount * 0.2).toLocaleString()} by cutting 20%`,
        priority: 'high',
        icon: categoryInsights[0].icon
      });
    }

    budgets.forEach(b => {
      if (b.spent > b.limit) {
        tips.push({
          title: `${b.category} Over Budget`,
          description: `Exceeded by ₹${Math.round(b.spent - b.limit).toLocaleString()}`,
          priority: 'high',
          icon: b.icon
        });
      }
    });

    if (score > 80) {
      tips.push({
        title: 'Excellent Financial Health!',
        description: 'Keep up the great work with your spending habits',
        priority: 'low',
        icon: 'checkmark-circle'
      });
    }

    return {
      categoryInsights,
      periods,
      tips: tips.slice(0, 3),
      score,
      totalExpense,
      weekChange,
      monthChange,
      hasData: transactions.length > 0
    };
  }, [transactions, budgets, currentBalance]);

  if (authLoading || (isLoading && transactions.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (!analysis.hasData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <LinearGradient
            colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
            style={styles.emptyIcon}
          >
            <Ionicons name="analytics-outline" size={48} color="white" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Data Yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
            Start adding transactions to see insights
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Smart Insights</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>Real-time analysis</Text>
          </View>
          <CircularScore score={analysis.score} size={80} theme={theme} />
        </View>

        {/* TABS */}
        <View style={[styles.tabs, { backgroundColor: theme.card }]}>
          {(['overview', 'categories', 'trends'] as const).map(tab => (
            <TouchableOpacity 
              key={tab}
              onPress={() => { 
                setActiveTab(tab); 
                Haptics.selectionAsync(); 
              }}
              style={[
                styles.tab, 
                activeTab === tab && { backgroundColor: theme.tint }
              ]}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === tab ? 'white' : theme.subtext }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'overview' && (
            <>
              {/* TOTAL SPENDING CARD */}
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
              >
                <LinearGradient
                  colors={isDarkMode ? ['#1e293b', '#334155'] as const : ['#f8fafc', '#f1f5f9'] as const}
                  style={[styles.totalCard, theme.shadow?.medium]}
                >
                  <Text style={[styles.totalLabel, { color: theme.subtext }]}>TOTAL SPENDING</Text>
                  <Text style={[styles.totalAmount, { color: theme.text }]}>
                    ₹{analysis.totalExpense.toLocaleString('en-IN')}
                  </Text>
                  
                  <View style={styles.trendRow}>
                    <View style={[
                      styles.trendBadgeLarge, 
                      { backgroundColor: analysis.weekChange < 0 ? '#10B98120' : '#EF444420' }
                    ]}>
                      <Ionicons 
                        name={analysis.weekChange < 0 ? "trending-down" : "trending-up"} 
                        size={16} 
                        color={analysis.weekChange < 0 ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={{ 
                        color: analysis.weekChange < 0 ? "#10B981" : "#EF4444", 
                        fontWeight: '800', 
                        fontSize: 14 
                      }}>
                        {Math.abs(analysis.weekChange).toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={{ color: theme.subtext, fontSize: 13, fontWeight: '600' }}>
                      vs last week
                    </Text>
                  </View>

                  <View style={[styles.healthBar, { backgroundColor: theme.border + '30', marginTop: 20 }]}>
                    <MotiView 
                      from={{ width: '0%' }} 
                      animate={{ width: `${analysis.score}%` }} 
                      transition={{ duration: 1000 }}
                      style={[
                        styles.healthBarFill, 
                        { 
                          backgroundColor: analysis.score > 70 ? '#10B981' : analysis.score > 50 ? '#F59E0B' : '#EF4444' 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                    Health: {analysis.score > 80 ? 'Excellent' : analysis.score > 60 ? 'Good' : analysis.score > 40 ? 'Fair' : 'Poor'}
                  </Text>
                </LinearGradient>
              </MotiView>

              {/* INSIGHTS/TIPS */}
              {analysis.tips.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconWrapper}>
                      <LinearGradient
                        colors={GRADIENTS.warning}
                        style={styles.sectionIcon}
                      >
                        <Ionicons name="bulb" size={18} color="white" />
                      </LinearGradient>
                    </View>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Action Items</Text>
                  </View>

                  {analysis.tips.map((tip, i) => (
                    <InsightTipCard key={i} insight={tip} theme={theme} index={i} />
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'categories' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <LinearGradient
                    colors={GRADIENTS.info}
                    style={styles.sectionIcon}
                  >
                    <Ionicons name="pie-chart" size={18} color="white" />
                  </LinearGradient>
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Category Breakdown</Text>
              </View>

              {analysis.categoryInsights.map((insight, i) => (
                <CategoryInsightCard key={i} insight={insight} theme={theme} index={i} />
              ))}
            </View>
          )}

          {activeTab === 'trends' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <LinearGradient
                    colors={GRADIENTS.success}
                    style={styles.sectionIcon}
                  >
                    <Ionicons name="trending-up" size={18} color="white" />
                  </LinearGradient>
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending Trends</Text>
              </View>

              <ComparisonCard 
                label="This Week"
                thisAmount={analysis.periods.thisWeek}
                lastAmount={analysis.periods.lastWeek}
                theme={theme}
                gradient={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
                index={0}
              />

              <ComparisonCard 
                label="This Month"
                thisAmount={analysis.periods.thisMonth}
                lastAmount={analysis.periods.lastMonth}
                theme={theme}
                gradient={GRADIENTS.info}
                index={1}
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    marginTop: 10 
  },
  headerTitle: { fontSize: 34, fontWeight: '900', letterSpacing: -1.5, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '600' },
  
  scoreCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  scoreLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  tabs: { 
    flexDirection: 'row', 
    marginHorizontal: 20, 
    marginBottom: 20, 
    padding: 4, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  totalCard: { 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 25 
  },
  totalLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  totalAmount: { fontSize: 40, fontWeight: '900', letterSpacing: -2, marginBottom: 10 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trendBadgeLarge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  healthBar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 5 },

  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionIconWrapper: {},
  sectionIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

  categoryCard: { 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  categoryIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  categoryTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  categoryTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  categorySubtitle: { fontSize: 12, fontWeight: '600' },
  trendBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  categoryAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryAmount: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  categoryPercentage: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  comparisonCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  comparisonLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  comparisonAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  comparisonChange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  comparisonChangeText: { fontSize: 13, fontWeight: '700' },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  tipIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tipTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  tipDescription: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 }
});