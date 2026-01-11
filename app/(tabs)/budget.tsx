// SmartBudget/app/(tabs)/budget.tsx - Fixed TypeScript Version with AI Predictions
import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  Alert, 
  Modal 
} from "react-native";
import { router } from 'expo-router'; // 🆕 ADD THIS LINE
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import Svg, { Circle, G } from 'react-native-svg';

import { useBudgetStore, Budget } from '../_lib/useBudgetStore';
import { useAuthStore } from '../_lib/useAuthStore';
import { useThemeStore } from '../_lib/useThemeStore';
import { Colors } from '../../constants/theme';
import { BudgetPrediction } from '../../src/services/predictionService';

const { width } = Dimensions.get('window');

const GRADIENTS = {
  primary: ['#6366F1', '#8B5CF6', '#A855F7'] as const,
  primaryDark: ['#4F46E5', '#7C3AED', '#C084FC'] as const,
};

// 💎 TYPES
interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color: string;
  backgroundColor?: string;
}

interface PredictionCardProps {
  prediction: BudgetPrediction;
  onApply: (prediction: BudgetPrediction) => void;
  theme: any;
  isDarkMode: boolean;
}

interface BudgetCardProps {
  budget: Budget;
  onPress: () => void;
  prediction?: BudgetPrediction;
  theme: any;
  isDarkMode: boolean;
}

interface SummaryHeaderProps {
  budgets: Budget[];
  onViewPredictions: () => void;
  theme: any;
  isDarkMode: boolean;
}

interface ExceedanceWarning {
  willExceed: boolean;
  exceedanceAmount: number;
  recommendedDailyLimit: number;
  confidence: number;
}

// 💎 CIRCULAR PROGRESS COMPONENT
const CircularProgress: React.FC<CircularProgressProps> = ({ 
  size = 120, 
  strokeWidth = 12, 
  progress, 
  color, 
  backgroundColor = '#E2E8F0'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (circumference * Math.min(progress, 100)) / 100;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
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
  );
};

// 🔮 AI PREDICTION CARD
const PredictionCard: React.FC<PredictionCardProps> = ({ 
  prediction, 
  onApply, 
  theme, 
  isDarkMode 
}) => {
  const getTrendIcon = (trend: string): keyof typeof Ionicons.glyphMap => {
    switch (trend) {
      case 'increasing': return 'trending-up';
      case 'decreasing': return 'trending-down';
      case 'stable': return 'remove';
      default: return 'remove';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'increasing': return '#EF4444';
      case 'decreasing': return '#10B981';
      case 'stable': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const confidenceColor = prediction.confidence > 0.7 ? '#10B981' : 
                          prediction.confidence > 0.4 ? '#F59E0B' : '#EF4444';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={[
        styles.predictionCard,
        { 
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }
      ]}
    >
      {/* Header */}
      <View style={styles.predictionHeader}>
        <Text style={[styles.predictionCategory, { color: theme.text }]}>
          {prediction.category}
        </Text>
        <View style={[styles.trendBadge, { backgroundColor: getTrendColor(prediction.trend) + '15' }]}>
          <Ionicons 
            name={getTrendIcon(prediction.trend)} 
            size={14} 
            color={getTrendColor(prediction.trend)} 
          />
          <Text style={[styles.trendText, { color: getTrendColor(prediction.trend) }]}>
            {prediction.trend}
          </Text>
        </View>
      </View>

      {/* Amounts */}
      <View style={styles.predictionAmounts}>
        <View style={styles.predictionAmount}>
          <Text style={[styles.predictionLabel, { color: theme.subtext }]}>Predicted</Text>
          <Text style={[styles.predictionValue, { color: theme.tint }]}>
            ₹{prediction.predictedAmount.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.predictionDivider} />
        <View style={[styles.predictionAmount, { alignItems: 'flex-end' }]}>
          <Text style={[styles.predictionLabel, { color: theme.subtext }]}>Suggested</Text>
          <Text style={[styles.predictionValue, { color: '#10B981' }]}>
            ₹{prediction.suggestedBudget.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Confidence Bar */}
      <View style={styles.confidenceContainer}>
        <Text style={[styles.confidenceLabel, { color: theme.subtext }]}>
          Confidence: {Math.round(prediction.confidence * 100)}%
        </Text>
        <View style={[styles.confidenceBar, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.confidenceBarFill,
              { 
                width: `${prediction.confidence * 100}%`,
                backgroundColor: confidenceColor
              }
            ]} 
          />
        </View>
      </View>

      {/* Reasoning */}
      <Text style={[styles.predictionReasoning, { color: theme.subtext }]}>
        {prediction.reasoning}
      </Text>

      {/* Apply Button */}
      <TouchableOpacity 
        style={styles.applyButton}
        onPress={() => onApply(prediction)}
      >
        <LinearGradient
          colors={theme.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.applyButtonGradient}
        >
          <Ionicons name="flash" size={16} color="white" />
          <Text style={styles.applyButtonText}>Apply Suggestion</Text>
        </LinearGradient>
      </TouchableOpacity>
    </MotiView>
  );
};

// 🎯 PREMIUM BUDGET CARD (WITH PREDICTION)
const PremiumBudgetCard: React.FC<BudgetCardProps> = ({ 
  budget, 
  onPress, 
  prediction, 
  theme, 
  isDarkMode 
}) => {
  const progress = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
  const isOver = budget.spent > budget.limit;
  const isWarning = progress > 80 && !isOver;
  const remaining = budget.limit - budget.spent;

  const cardColor = isOver ? '#EF4444' : isWarning ? '#F59E0B' : budget.color;

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.cardWrapper}
    >
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <LinearGradient
          colors={[cardColor + '15', cardColor + '05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.budgetCard, 
            { 
              borderColor: cardColor + '30',
              backgroundColor: theme.card,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }
          ]}
        >
          {/* Left: Progress Circle */}
          <View style={styles.progressSection}>
            <View style={{ position: 'relative' }}>
              <CircularProgress 
                size={100}
                strokeWidth={10}
                progress={progress}
                color={cardColor}
                backgroundColor={theme.border}
              />
              <View style={styles.progressCenter}>
                <Text style={[styles.progressPercent, { color: cardColor }]}>
                  {progress.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Details */}
          <View style={styles.detailsSection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: cardColor + '20' }]}>
                <Ionicons name={budget.icon as any} size={24} color={cardColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  {budget.category}
                </Text>
                {isOver && (
                  <View style={styles.statusBadge}>
                    <Ionicons name="warning" size={12} color="#EF4444" />
                    <Text style={styles.statusText}>Over Budget</Text>
                  </View>
                )}
                {isWarning && !isOver && (
                  <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="alert-circle" size={12} color="#F59E0B" />
                    <Text style={[styles.statusText, { color: '#F59E0B' }]}>Warning</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.amountRow}>
              <View>
                <Text style={[styles.amountLabel, { color: theme.subtext }]}>Spent</Text>
                <Text style={[styles.amountValue, { color: isOver ? '#EF4444' : theme.text }]}>
                  ₹{Math.round(budget.spent).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amountLabel, { color: theme.subtext }]}>Limit</Text>
                <Text style={[styles.amountValue, { color: theme.text }]}>
                  ₹{budget.limit.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.remainingRow}>
              <Ionicons 
                name={isOver ? "alert-circle" : "checkmark-circle"} 
                size={16} 
                color={isOver ? "#EF4444" : "#10B981"} 
              />
              <Text style={[styles.remainingText, { color: isOver ? "#EF4444" : theme.subtext }]}>
                {isOver 
                  ? `Over by ₹${Math.abs(remaining).toLocaleString('en-IN')}`
                  : `₹${remaining.toLocaleString('en-IN')} remaining`
                }
              </Text>
            </View>

            {/* AI Prediction Hint */}
            {prediction && (
              <TouchableOpacity 
                style={[styles.aiHintBadge, { backgroundColor: theme.tint + '15' }]}
                onPress={onPress}
              >
                <Ionicons name="flash" size={12} color={theme.tint} />
                <Text style={[styles.aiHintText, { color: theme.tint }]}>
                  AI suggests ₹{prediction.suggestedBudget.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </MotiView>
    </TouchableOpacity>
  );
};

// 📊 SUMMARY HEADER (WITH PREDICTIONS BUTTON)
const SummaryHeader: React.FC<SummaryHeaderProps> = ({ 
  budgets, 
  onViewPredictions, 
  theme, 
  isDarkMode 
}) => {
  const totalBudget = budgets.reduce((sum: number, b: Budget) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum: number, b: Budget) => sum + b.spent, 0);
  const overallProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const exceeded = budgets.filter((b: Budget) => b.spent > b.limit).length;

  return (
    <LinearGradient
      colors={theme.primaryGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.summaryCard,
        {
          shadowColor: theme.tint,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
          elevation: 8,
        }
      ]}
    >
      <View style={styles.summaryContent}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>Total Budget</Text>
          <Text style={styles.summaryAmount}>₹{totalBudget.toLocaleString('en-IN')}</Text>
          <Text style={styles.summarySpent}>
            ₹{totalSpent.toLocaleString('en-IN')} spent
          </Text>
        </View>
        
        <View style={styles.summaryRight}>
          <CircularProgress 
            size={100}
            strokeWidth={10}
            progress={overallProgress}
            color="white"
            backgroundColor="rgba(255,255,255,0.2)"
          />
          <View style={styles.summaryProgressCenter}>
            <Text style={styles.summaryProgressText}>
              {overallProgress.toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryFooter}>
        <View style={styles.summaryFooterLeft}>
          <Ionicons 
            name={exceeded > 0 ? "alert-circle" : "checkmark-circle"} 
            size={16} 
            color={exceeded > 0 ? "#FEE2E2" : "#D1FAE5"} 
          />
          <Text style={styles.summaryFooterText}>
            {exceeded > 0 
              ? `${exceeded} budget${exceeded > 1 ? 's' : ''} exceeded`
              : "All budgets on track"}
          </Text>
        </View>
        
        {/* AI Predictions Button */}
        <TouchableOpacity 
          style={styles.aiPredictionsButton}
          onPress={onViewPredictions}
        >
          <Ionicons name="flash" size={14} color="white" />
          <Text style={styles.aiPredictionsText}>AI Predictions</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

// 🏠 MAIN SCREEN
export default function PremiumBudgetScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const { user, isLoading: authLoading } = useAuthStore();
  
  const budgets = useBudgetStore(state => state.budgets);
  const isLoading = useBudgetStore(state => state.isLoading);
  const fetchBudgets = useBudgetStore(state => state.fetchBudgets);
  const getSuggestedBudgets = useBudgetStore(state => state.getSuggestedBudgets);
  const predictBudgetExceedance = useBudgetStore(state => state.predictBudgetExceedance);
  const updateBudget = useBudgetStore(state => state.updateBudget);

  const [showPredictions, setShowPredictions] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<BudgetPrediction[]>([]);
  const [exceedanceWarnings, setExceedanceWarnings] = useState<Record<string, ExceedanceWarning>>({});

  useEffect(() => {
    if (user?.uid) {
      useBudgetStore.getState().initialize(user.uid);
      fetchBudgets(user.uid);
    }
  }, [user?.uid, fetchBudgets]);

  useEffect(() => {
    if (budgets.length > 0) {
      loadPredictions();
      checkExceedanceWarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets]);

  const loadPredictions = () => {
    try {
      const suggestedBudgets = getSuggestedBudgets();
      setPredictions(suggestedBudgets);
      console.log('✅ Loaded predictions:', suggestedBudgets.length);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const checkExceedanceWarnings = () => {
    const warnings: Record<string, ExceedanceWarning> = {};
    
    budgets.forEach(budget => {
      try {
        const exceedance = predictBudgetExceedance(budget.category);
        if (exceedance && exceedance.willExceed) {
          warnings[budget.category] = {
            willExceed: exceedance.willExceed,
            exceedanceAmount: exceedance.exceedanceAmount,
            recommendedDailyLimit: exceedance.recommendedDailyLimit,
            confidence: 0.75,
          };
        }
      } catch (error) {
        console.error(`Failed to check exceedance for ${budget.category}:`, error);
      }
    });
    
    setExceedanceWarnings(warnings);
  };

  const handleApplyPrediction = async (prediction: BudgetPrediction) => {
    try {
      const budget = budgets.find(b => b.category === prediction.category);
      if (!budget) return;

      Alert.alert(
        '🔮 Apply AI Suggestion?',
        `Update ${prediction.category} budget from ₹${budget.limit.toLocaleString('en-IN')} to ₹${prediction.suggestedBudget.toLocaleString('en-IN')}?\n\n${prediction.reasoning}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: async () => {
              await updateBudget(budget, { limit: prediction.suggestedBudget });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('✅ Budget Updated', `${prediction.category} budget updated successfully!`);
              setShowPredictions(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to apply prediction:', error);
      Alert.alert('Error', 'Failed to update budget');
    }
  };

  const handleViewPredictions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (predictions.length === 0) {
      Alert.alert(
        '📊 Not Enough Data',
        'Add more transactions to get AI-powered budget predictions',
        [{ text: 'OK' }]
      );
    } else {
      setShowPredictions(true);
    }
  };

  // 🆕 NEW: Navigate to edit budget screen
  const handleEditBudget = (budget: Budget) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/edit-budget',
      params: {
        id: budget.id,
      }
    });
  };

  // 🆕 NEW: Navigate to add budget screen
  const handleAddBudget = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-budget');
  };

  if (authLoading || (isLoading && budgets.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Budgets</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Track your spending limits
            </Text>
          </View>
          {/* 🆕 FIXED: Add onPress handler */}
          <TouchableOpacity 
            style={[
              styles.addButton,
              {
                shadowColor: theme.tint,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 5,
              }
            ]}
            onPress={handleAddBudget}
          >
            <LinearGradient
              colors={theme.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SUMMARY */}
          {budgets.length > 0 && (
            <SummaryHeader 
              budgets={budgets} 
              onViewPredictions={handleViewPredictions}
              theme={theme} 
              isDarkMode={isDarkMode} 
            />
          )}

          {/* EXCEEDANCE WARNINGS */}
          {Object.keys(exceedanceWarnings).length > 0 && (
            <View style={[styles.warningSection, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
              <Text style={styles.warningTitle}>⚠️ Budget Alerts</Text>
              {Object.entries(exceedanceWarnings).slice(0, 2).map(([category, warning]) => (
                <View key={category} style={[styles.warningCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.warningCategory, { color: theme.text }]}>{category}</Text>
                  <Text style={styles.warningText}>
                    Projected to exceed by ₹{warning.exceedanceAmount.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.warningAdvice}>
                    💡 Daily limit: ₹{warning.recommendedDailyLimit.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* BUDGETS LIST */}
          <View style={styles.section}>
            {budgets.length === 0 ? (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={[
                  styles.emptyState, 
                  { 
                    backgroundColor: theme.card,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }
                ]}
              >
                <LinearGradient
                  colors={theme.primaryGradient}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyIcon}
                >
                  <Ionicons name="wallet-outline" size={40} color="white" />
                </LinearGradient>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No budgets set yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
                  Create budgets to track your spending limits
                </Text>
                {/* 🆕 FIXED: Add onPress handler */}
                <TouchableOpacity 
                  style={[
                    styles.createButton,
                    {
                      shadowColor: theme.tint,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.15,
                      shadowRadius: 16,
                      elevation: 5,
                    }
                  ]}
                  onPress={handleAddBudget}
                >
                  <LinearGradient
                    colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createButtonGradient}
                  >
                    <Ionicons name="add-circle" size={20} color="white" />
                    <Text style={styles.createButtonText}>Create Budget</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </MotiView>
            ) : (
              <>
                {/* 🆕 FIXED: Navigate to edit screen instead of showing prediction */}
                {budgets.map((budget) => {
                  const prediction = predictions.find(p => p.category === budget.category);
                  return (
                    <PremiumBudgetCard 
                      key={budget.id}
                      budget={budget}
                      prediction={prediction}
                      onPress={() => handleEditBudget(budget)}
                      theme={theme}
                      isDarkMode={isDarkMode}
                    />
                  );
                })}
              </>
            )}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      {/* PREDICTIONS MODAL */}
      <Modal
        visible={showPredictions}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPredictions(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  🔮 AI Budget Predictions
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>
                  Smart suggestions for next month
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: theme.card }]}
                onPress={() => setShowPredictions(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {predictions.map((prediction) => (
                <PredictionCard
                  key={prediction.category}
                  prediction={prediction}
                  onApply={handleApplyPrediction}
                  theme={theme}
                  isDarkMode={isDarkMode}
                />
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Summary Card
  summaryCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  summarySpent: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRight: {
    position: 'relative',
  },
  summaryProgressCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryProgressText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  summaryFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryFooterText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '700',
  },
  aiPredictionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  aiPredictionsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Warning Section
  warningSection: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 12,
  },
  warningCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  warningCategory: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 4,
  },
  warningAdvice: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },

  // Budget Cards
  section: {
    gap: 16,
  },
  cardWrapper: {
    marginBottom: 4,
  },
  budgetCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressSection: {
    marginRight: 20,
    justifyContent: 'center',
  },
  progressCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: '900',
  },
  detailsSection: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  aiHintText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 28,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // Prediction Card
  predictionCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionCategory: {
    fontSize: 18,
    fontWeight: '800',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  predictionAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  predictionAmount: {
    flex: 1,
  },
  predictionDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  predictionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  predictionReasoning: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  applyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingTop: 20,
  },
});