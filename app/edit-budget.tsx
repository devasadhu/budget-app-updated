// SmartBudget/app/edit-budget.tsx
// COMPLETELY REWRITTEN FOR GUARANTEED BUTTON VISIBILITY
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  Platform,
  ScrollView, 
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { useBudgetStore, Budget } from './_lib/useBudgetStore'; 
import { useAuthStore } from './_lib/useAuthStore';
import { useThemeStore } from './_lib/useThemeStore';
import { Colors } from '../constants/theme';

const GRADIENTS = {
  primary: ['#6366F1', '#8B5CF6', '#A855F7'] as const,
  primaryDark: ['#4F46E5', '#7C3AED', '#C084FC'] as const,
};

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

export default function EditBudgetScreen() {
  const params = useLocalSearchParams();
  const user = useAuthStore(state => state.user);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  
  const budgets = useBudgetStore(state => state.budgets);
  const updateBudget = useBudgetStore(state => state.updateBudget);
  const deleteBudget = useBudgetStore(state => state.deleteBudget);
  const predictNextMonthBudget = useBudgetStore(state => state.predictNextMonthBudget);

  const currentBudget = budgets.find(b => b.id === params.id);
  
  const [amount, setAmount] = useState(currentBudget?.limit.toString() || '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<number | null>(null);

  React.useEffect(() => {
    if (currentBudget) {
      try {
        const prediction = predictNextMonthBudget(currentBudget.category);
        if (prediction) {
          setAISuggestion(prediction.suggestedBudget);
          setShowAISuggestion(true);
        }
      } catch (error) {
        console.error('Failed to get AI suggestion:', error);
      }
    }
  }, [currentBudget, predictNextMonthBudget]);

  if (!currentBudget) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.navBar}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backCircle, { backgroundColor: theme.card }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: theme.text }]}>Edit Budget</Text>
          <View style={{ width: 44 }} /> 
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.subtext }}>Budget not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = currentBudget.limit > 0 ? (currentBudget.spent / currentBudget.limit) * 100 : 0;
  const isOver = currentBudget.spent > currentBudget.limit;

  const numericAmount = amount ? parseFloat(amount) : 0;
  const hasChanged = amount && numericAmount !== currentBudget.limit && !isNaN(numericAmount);
  const isValidAmount = amount && numericAmount > 0 && !isNaN(numericAmount);
  const canUpdate = hasChanged && isValidAmount && !loading;

  React.useEffect(() => {
    console.log('💰 Edit Budget State:', {
      amount,
      numericAmount,
      currentLimit: currentBudget.limit,
      hasChanged,
      isValidAmount,
      canUpdate
    });
  }, [amount, hasChanged, isValidAmount, canUpdate]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleApplyAISuggestion = () => {
    if (aiSuggestion) {
      setAmount(aiSuggestion.toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleUpdate = async () => {
    if (!user?.uid || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget limit.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    
    try {
      await updateBudget(currentBudget, { 
        limit: parseFloat(amount)
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back(); 
    } catch (error) {
      console.error('Failed to update budget:', error);
      Alert.alert('Error', 'Failed to update budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the ${currentBudget.category} budget? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            try {
              await deleteBudget(currentBudget);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              console.error('Failed to delete budget:', error);
              Alert.alert('Error', 'Failed to delete budget.');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.navBar}>
          <TouchableOpacity 
            onPress={() => { 
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back(); 
            }} 
            style={[styles.backCircle, { backgroundColor: theme.card }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: theme.text }]}>Edit Budget</Text>
          <TouchableOpacity 
            onPress={handleDelete}
            disabled={deleting}
            style={[styles.deleteCircle, { backgroundColor: '#FEE2E2' }]}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash" size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* CATEGORY INFO */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[styles.infoCard, { backgroundColor: currentBudget.color + '15' }]}
          >
            <View style={[styles.categoryIconLarge, { backgroundColor: currentBudget.color + '25' }]}>
              <Ionicons name={currentBudget.icon as any} size={32} color={currentBudget.color} />
            </View>
            <Text style={[styles.categoryTitle, { color: theme.text }]}>
              {currentBudget.category}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Spent</Text>
                <Text style={[styles.statValue, { color: isOver ? '#EF4444' : theme.text }]}>
                  ₹{Math.round(currentBudget.spent).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Current Limit</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  ₹{currentBudget.limit.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: isOver ? '#EF4444' : progress > 80 ? '#F59E0B' : currentBudget.color
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressLabel, { color: theme.subtext }]}>
              {progress.toFixed(0)}% used • ₹{Math.round(currentBudget.limit - currentBudget.spent).toLocaleString('en-IN')} remaining
            </Text>
          </MotiView>

          {/* AMOUNT CARD */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 50 }}
          >
            <LinearGradient
              colors={['#D1FAE5', '#ECFDF5'] as const}
              style={styles.amountCard}
            >
              <Text style={styles.amountCardLabel}>New Monthly Limit</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencyLabel, { color: '#10B981' }]}>₹</Text>
                <TextInput
                  style={[styles.mainInput, { color: theme.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.subtext}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  selectionColor={theme.tint}
                />
              </View>
              {hasChanged && amount && !isNaN(parseFloat(amount)) && (
                <Text style={styles.changeIndicator}>
                  {numericAmount > currentBudget.limit ? '📈' : '📉'} 
                  {' '}
                  {Math.abs(numericAmount - currentBudget.limit).toLocaleString('en-IN')} 
                  {' '}
                  {numericAmount > currentBudget.limit ? 'increase' : 'decrease'}
                </Text>
              )}
            </LinearGradient>
          </MotiView>

          {/* QUICK AMOUNTS */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: 100 }}
            style={styles.quickAmountsRow}
          >
            {QUICK_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => handleQuickAmount(amt)}
                style={[
                  styles.quickAmountBtn,
                  { 
                    backgroundColor: amount === amt.toString() ? theme.tint : theme.card,
                    borderWidth: 1,
                    borderColor: amount === amt.toString() ? theme.tint : theme.border
                  }
                ]}
              >
                <Text style={[
                  styles.quickAmountText,
                  { color: amount === amt.toString() ? 'white' : theme.text }
                ]}>
                  ₹{(amt/1000)}k
                </Text>
              </TouchableOpacity>
            ))}
          </MotiView>

          {/* AI SUGGESTION */}
          {showAISuggestion && aiSuggestion && aiSuggestion !== currentBudget.limit && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={[styles.aiSuggestionCard, { backgroundColor: theme.tint + '15' }]}
            >
              <View style={styles.aiSuggestionContent}>
                <Ionicons name="flash" size={20} color={theme.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiSuggestionLabel, { color: theme.tint }]}>
                    🔮 AI Recommendation
                  </Text>
                  <Text style={[styles.aiSuggestionValue, { color: theme.text }]}>
                    ₹{aiSuggestion.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.aiSuggestionReason, { color: theme.subtext }]}>
                    Based on last 3 months spending pattern
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.aiApplyBtn, { backgroundColor: theme.tint }]}
                  onPress={handleApplyAISuggestion}
                >
                  <Text style={styles.aiApplyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          )}

          {/* WARNING IF NEW LIMIT IS TOO LOW */}
          {amount && numericAmount < currentBudget.spent && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={[styles.warningCard, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}
            >
              <Ionicons name="warning" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Budget Below Current Spending</Text>
                <Text style={styles.warningText}>
                  Your new limit (₹{numericAmount.toLocaleString('en-IN')}) is less than what you've already spent 
                  (₹{Math.round(currentBudget.spent).toLocaleString('en-IN')}) this month.
                </Text>
              </View>
            </MotiView>
          )}

          {/* EXTRA SPACING FOR BUTTON */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FIXED BUTTON AT BOTTOM - GUARANTEED VISIBLE */}
        <View style={[styles.buttonContainer, { 
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        }]}>
          <TouchableOpacity 
            onPress={handleUpdate}
            disabled={!canUpdate}
            activeOpacity={0.8}
            style={{ width: '100%' }}
          >
            <LinearGradient
              colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
              style={[
                styles.saveButton, 
                { opacity: canUpdate ? 1 : 0.4 }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <>
                  <Ionicons 
                    name={hasChanged ? "checkmark-circle" : "information-circle"} 
                    size={24} 
                    color="white" 
                  />
                  <Text style={styles.saveButtonText}>
                    {hasChanged ? 'Save Changes' : 'No Changes'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12 
  },
  backCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deleteCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  navTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 20,
  },
  
  infoCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  amountCard: { 
    borderRadius: 28, 
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  amountCardLabel: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  currencyLabel: { fontSize: 36, fontWeight: '900', marginRight: 8 },
  mainInput: { fontSize: 56, fontWeight: '900', textAlign: 'center', minWidth: 100 },
  changeIndicator: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },

  quickAmountsRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 20, 
    flexWrap: 'wrap', 
    justifyContent: 'center' 
  },
  quickAmountBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickAmountText: { fontSize: 14, fontWeight: '800' },

  aiSuggestionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  aiSuggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiSuggestionLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  aiSuggestionValue: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  aiSuggestionReason: {
    fontSize: 11,
    fontWeight: '600',
  },
  aiApplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiApplyBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },

  // FIXED BUTTON CONTAINER - ABSOLUTE POSITIONING
  buttonContainer: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButton: { 
    height: 60, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '900' 
  },
});