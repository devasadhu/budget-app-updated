// SmartBudget/app/edit-transaction-premium.tsx
import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { useTransactionStore } from './_lib/useTransactionStore'; 
import { useAuthStore } from './_lib/useAuthStore';
import { useThemeStore } from './_lib/useThemeStore';
import { useBudgetStore } from './_lib/useBudgetStore';
import { mlCategorizationService } from './_lib/mlCategorizationService';
import { Colors } from '../constants/theme';
import { CATEGORIES, getDescriptionSuggestions } from '../constants/category';

const GRADIENTS = {
  primary: ['#6366F1', '#8B5CF6', '#A855F7'] as const,
  primaryDark: ['#4F46E5', '#7C3AED', '#C084FC'] as const,
  success: ['#10B981', '#059669'] as const,
  danger: ['#EF4444', '#DC2626'] as const,
  warning: ['#F59E0B', '#D97706'] as const,
};

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export default function PremiumEditTransactionScreen() {
  const params = useLocalSearchParams();
  const user = useAuthStore(state => state.user);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const budgets = useBudgetStore(state => state.budgets);

  const transactionId = params.id as string;
  const originalCategory = params.category as string || '';
  const [amount, setAmount] = useState(Math.abs(parseFloat(params.amount as string || '0')).toString());
  const [description, setDescription] = useState(params.description as string || '');
  const [category, setCategory] = useState(originalCategory);
  const [type, setType] = useState<'debit' | 'credit'>(params.type as 'debit' | 'credit' || 'debit');
  const [date, setDate] = useState(params.date ? new Date(params.date as string) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const updateTransaction = useTransactionStore(state => state.updateTransaction);
  const deleteTransaction = useTransactionStore(state => state.deleteTransaction);

  useEffect(() => {
    if (!category && CATEGORIES.length > 0) {
      setCategory(CATEGORIES[0].name);
    }
  }, []);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setDescription(suggestion);
    setShowSuggestions(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUpdate = async () => {
    if (!user?.uid || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Missing Info', 'Please enter a valid amount.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (!category && type === 'debit') {
      Alert.alert('Missing Info', 'Please select a category.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    
    try {
      // 🆕 LEARN FROM CATEGORY CORRECTION
      if (category !== originalCategory && type === 'debit' && originalCategory !== 'Income') {
        console.log('📚 User corrected category - learning from this correction');
        try {
          await mlCategorizationService.learnFromCorrection(
            description,
            undefined, // merchant
            parseFloat(amount),
            originalCategory, // what it was
            category, // what user changed it to
            user.uid
          );
          console.log('✅ ML model learned from correction:', {
            from: originalCategory,
            to: category,
            description: description
          });
        } catch (error) {
          console.error('❌ Failed to learn from correction:', error);
          // Don't block the update if ML fails
        }
      }
      
      const transactionCategory = type === 'credit' ? 'Income' : category;
      const finalAmount = type === 'debit' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      
      await updateTransaction({ 
        id: transactionId,
        userId: user.uid,
        amount: finalAmount,
        category: transactionCategory,
        description: description.trim() || transactionCategory,
        type: type,
        date: date,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to update transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            try {
              await deleteTransaction(transactionId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction.');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const currentSuggestions = getDescriptionSuggestions(category);
  const hasBudget = budgets.some(b => b.category === category);
  const currentBudget = budgets.find(b => b.category === category);
  const originalAmount = Math.abs(parseFloat(params.amount as string || '0'));
  const categoryChanged = category !== originalCategory && originalCategory !== 'Income';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
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
          <Text style={[styles.navTitle, { color: theme.text }]}>Edit Transaction</Text>
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

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ORIGINAL AMOUNT INFO */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[styles.infoCard, { backgroundColor: theme.card }]}
          >
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={18} color={theme.tint} />
              <Text style={[styles.infoText, { color: theme.subtext }]}>
                Original: {type === 'debit' ? '-' : '+'}₹{originalAmount.toLocaleString('en-IN')} • {originalCategory}
              </Text>
            </View>
            <Text style={[styles.infoDate, { color: theme.subtext }]}>
              Created: {new Date(params.date as string).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
          </MotiView>

          {/* ML LEARNING INDICATOR */}
          {categoryChanged && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ type: 'spring', delay: 100 }}
              style={[styles.mlLearningBadge, { backgroundColor: '#DBEAFE' }]}
            >
              <Ionicons name="bulb" size={16} color="#3B82F6" />
              <Text style={[styles.mlLearningText, { color: '#1E40AF' }]}>
                AI will learn from this change: {originalCategory} → {category}
              </Text>
            </MotiView>
          )}

          {/* AMOUNT CARD */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 50 }}
          >
            <LinearGradient
              colors={type === 'debit' 
                ? ['#FEE2E2', '#FEF2F2'] as const
                : ['#D1FAE5', '#ECFDF5'] as const
              }
              style={styles.amountCard}
            >
              <View style={styles.amountRow}>
                <Text style={[styles.currencyLabel, { color: type === 'debit' ? '#EF4444' : '#10B981' }]}>
                  {type === 'debit' ? '-' : '+'} ₹
                </Text>
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
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </MotiView>

          {/* TYPE TOGGLE */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: 150 }}
            style={[styles.toggleWrapper, { backgroundColor: theme.card }]}
          >
            <TouchableOpacity 
              onPress={() => { setType('debit'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.toggleOption, type === 'debit' && styles.debitActive]}
            >
              <Ionicons 
                name="arrow-up-circle" 
                size={18} 
                color={type === 'debit' ? 'white' : theme.subtext} 
              />
              <Text style={[styles.toggleLabel, { color: type === 'debit' ? 'white' : theme.subtext }]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => { setType('credit'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.toggleOption, type === 'credit' && styles.creditActive]}
            >
              <Ionicons 
                name="arrow-down-circle" 
                size={18} 
                color={type === 'credit' ? 'white' : theme.subtext} 
              />
              <Text style={[styles.toggleLabel, { color: type === 'credit' ? 'white' : theme.subtext }]}>
                Income
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* CATEGORY SELECTION */}
          {type === 'debit' && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', delay: 200 }}
              style={styles.section}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeader, { color: theme.subtext }]}>
                  Select Category
                </Text>
                {hasBudget && currentBudget && (
                  <View style={[styles.budgetBadge, { backgroundColor: theme.tint + '20' }]}>
                    <Ionicons name="wallet" size={12} color={theme.tint} />
                    <Text style={[styles.budgetBadgeText, { color: theme.tint }]}>
                      ₹{Math.round(currentBudget.limit - currentBudget.spent)}/{currentBudget.limit} left
                    </Text>
                  </View>
                )}
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {CATEGORIES.map((cat, idx) => {
                  const isSelected = category === cat.name;
                  const catHasBudget = budgets.some(b => b.category === cat.name);
                  
                  return (
                    <MotiView
                      key={cat.name}
                      from={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: 250 + (idx * 50), damping: 15 }}
                    >
                      <TouchableOpacity
                        onPress={() => { 
                          setCategory(cat.name); 
                          setDescription('');
                          setShowSuggestions(true);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
                        }}
                        style={[
                          styles.categoryChip,
                          isSelected 
                            ? { backgroundColor: cat.color, borderColor: cat.color } 
                            : { backgroundColor: theme.card, borderColor: theme.border }
                        ]}
                      >
                        {catHasBudget && (
                          <View style={[styles.budgetDot, { backgroundColor: '#10B981' }]} />
                        )}
                        <Ionicons 
                          name={cat.icon} 
                          size={20} 
                          color={isSelected ? 'white' : cat.color} 
                        />
                        <Text style={[
                          styles.categoryChipText, 
                          { color: isSelected ? 'white' : theme.text }
                        ]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    </MotiView>
                  );
                })}
              </ScrollView>
              
              {/* BUDGET WARNING */}
              {currentBudget && amount && parseFloat(amount) > 0 && (
                <MotiView
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={[
                    styles.budgetWarning,
                    { 
                      backgroundColor: (currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit 
                        ? '#FEE2E2' 
                        : (currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit * 0.8
                        ? '#FEF3C7'
                        : '#DCFCE7'
                    }
                  ]}
                >
                  <Ionicons 
                    name={
                      (currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit 
                        ? "warning" 
                        : "information-circle"
                    } 
                    size={16} 
                    color={
                      (currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit 
                        ? "#EF4444" 
                        : (currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit * 0.8
                        ? "#F59E0B"
                        : "#10B981"
                    } 
                  />
                  <Text style={[
                    styles.budgetWarningText,
                    { 
                      color: (currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit 
                        ? "#EF4444" 
                        : (currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit * 0.8
                        ? "#F59E0B"
                        : "#10B981"
                    }
                  ]}>
                    {(currentBudget.spent - originalAmount + parseFloat(amount)) > currentBudget.limit 
                      ? `Will exceed ${category} budget by ₹${Math.round((currentBudget.spent - originalAmount + parseFloat(amount)) - currentBudget.limit)}`
                      : `Within budget (₹${Math.round(currentBudget.limit - (currentBudget.spent - originalAmount + parseFloat(amount)))} remaining)`
                    }
                  </Text>
                </MotiView>
              )}
            </MotiView>
          )}

          {/* DESCRIPTION & DATE */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: 300 }}
            style={styles.section}
          >
            <Text style={[styles.sectionHeader, { color: theme.subtext }]}>Details</Text>
            
            <View style={[styles.formCard, { backgroundColor: theme.card }]}>
              <View style={styles.inputRow}>
                <LinearGradient
                  colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
                  style={styles.inputIconCircle}
                >
                  <Ionicons name="pencil" size={18} color="white" />
                </LinearGradient>
                <TextInput
                  style={[styles.descInput, { color: theme.text }]}
                  placeholder={type === 'credit' ? 'Income source' : 'What did you buy?'}
                  placeholderTextColor={theme.subtext}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => setShowSuggestions(true)}
                />
                {currentSuggestions.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setShowSuggestions(!showSuggestions)}
                    style={styles.suggestionToggle}
                  >
                    <Ionicons 
                      name={showSuggestions ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={theme.subtext} 
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              {showSuggestions && currentSuggestions.length > 0 && type === 'debit' && (
                <>
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                  <View style={styles.suggestionsContainer}>
                    <Text style={[styles.suggestionsLabel, { color: theme.subtext }]}>
                      Quick Suggestions
                    </Text>
                    <View style={styles.suggestionsGrid}>
                      {currentSuggestions.map((suggestion) => (
                        <TouchableOpacity
                          key={suggestion}
                          onPress={() => handleSuggestionSelect(suggestion)}
                          style={[
                            styles.suggestionChip,
                            { 
                              backgroundColor: theme.background,
                              borderColor: theme.border
                            }
                          ]}
                        >
                          <Text style={[styles.suggestionText, { color: theme.text }]}>
                            {suggestion}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
              
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputRow}>
                <LinearGradient
                  colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
                  style={styles.inputIconCircle}
                >
                  <Ionicons name="calendar" size={18} color="white" />
                </LinearGradient>
                <Text style={[styles.descInput, { color: theme.text }]}>
                  {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
              </TouchableOpacity>
            </View>
          </MotiView>
        </ScrollView>

        {/* SUBMIT BUTTON */}
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            onPress={handleUpdate}
            disabled={loading || !amount}
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
              style={[
                styles.saveButton, 
                { opacity: (!amount || loading) ? 0.5 : 1 }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.saveButtonText}>
                    {categoryChanged ? 'Update & Train AI' : 'Update Transaction'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker 
            value={date} 
            mode="date" 
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} 
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  navTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    letterSpacing: -0.5 
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 40 
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoDate: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 26,
  },
  mlLearningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  mlLearningText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
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
  },
  amountRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  currencyLabel: { 
    fontSize: 36, 
    fontWeight: '900', 
    marginRight: 8 
  },
  mainInput: { 
    fontSize: 56, 
    fontWeight: '900', 
    textAlign: 'center', 
    minWidth: 100 
  },
  quickAmountsRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 20, 
    flexWrap: 'wrap' 
  },
  quickAmountBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickAmountText: { 
    fontSize: 14, 
    fontWeight: '800' 
  },
  toggleWrapper: { 
    flexDirection: 'row', 
    padding: 6, 
    borderRadius: 20, 
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleOption: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  toggleLabel: { 
    fontWeight: '800', 
    fontSize: 15 
  },
  debitActive: { 
    backgroundColor: '#EF4444', 
    elevation: 2 
  },
  creditActive: { 
    backgroundColor: '#10B981', 
    elevation: 2 
  },
  section: { 
    marginBottom: 25 
  },
  sectionHeader: { 
    fontSize: 13, 
    fontWeight: '800', 
    textTransform: 'uppercase', 
    letterSpacing: 1.2, 
    marginBottom: 12, 
    marginLeft: 4 
  },
  sectionHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12, 
    marginLeft: 4 
  },
  budgetBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12 
  },
  budgetBadgeText: { 
    fontSize: 11, 
    fontWeight: '800' 
  },
  categoryScroll: { 
    flexDirection: 'row', 
    gap: 10, 
    paddingBottom: 4 
  },
  categoryChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipText: { 
    fontSize: 13, 
    fontWeight: '700' 
  },
  budgetDot: { 
    position: 'absolute', 
    top: 6, 
    right: 6, 
    width: 8, 
    height: 8, 
    borderRadius: 4
  },
  budgetWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12
  },
  budgetWarningText: { 
    fontSize: 12, 
    fontWeight: '700', 
    flex: 1 
  },
  formCard: { 
    borderRadius: 24, 
    paddingHorizontal: 20, 
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    minHeight: 60, 
    gap: 14 
  },
  inputIconCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  descInput: { 
    fontSize: 16, 
    fontWeight: '700', 
    flex: 1 
  },
  separator: { 
    height: 1, 
    width: '100%' 
  },
  suggestionToggle: { 
    padding: 8 
  },
  suggestionsContainer: { 
    paddingVertical: 12 
  },
  suggestionsLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    marginBottom: 8 
  },
  suggestionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  suggestionChip: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12, 
    borderWidth: 1 
  },
  suggestionText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  footer: { 
    padding: 20, 
    borderTopWidth: 0 
  },
  saveButton: { 
    height: 64, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '900' 
  }
});