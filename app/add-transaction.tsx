// SmartBudget/app/add-transaction-premium.tsx
// OPTIMIZED UX FLOW: Description FIRST → AI predicts category → Amount → Confirm
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
import { router } from 'expo-router'; 
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
import { mlCategorizationService, MLPrediction } from './_lib/mlCategorizationService';
import { Colors } from '../constants/theme';
import { CATEGORIES, getDescriptionSuggestions } from '../constants/category';

const GRADIENTS = {
  primary: ['#6366F1', '#8B5CF6', '#A855F7'] as const,
  primaryDark: ['#4F46E5', '#7C3AED', '#C084FC'] as const,
  success: ['#10B981', '#059669'] as const,
  danger: ['#EF4444', '#DC2626'] as const,
};

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export default function PremiumAddTransactionScreen() {
  const user = useAuthStore(state => state.user);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const budgets = useBudgetStore(state => state.budgets);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  
  // ML Prediction state
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  const availableCategories = CATEGORIES;

  // Check ML service status on mount
  useEffect(() => {
    console.log('\n🔍 ========== ADD TRANSACTION SCREEN MOUNTED ==========');
    const stats = mlCategorizationService.getStats();
    console.log('ML Status:', stats.isReady ? '✅ Ready' : '❌ Not Ready');
    console.log('Training examples:', stats.trainingCount);
    console.log('🔍 =================================================\n');
  }, []);

  // ML Prediction Effect - Triggers as you type description
  useEffect(() => {
    console.log('🤖 Description changed:', description, '| Length:', description.length);

    if (description.length > 3 && type === 'debit') {
      console.log('✅ Getting ML prediction...');
      
      const getPrediction = async () => {
        setMlLoading(true);
        try {
          const pred = await mlCategorizationService.predict(
            description,
            undefined,
            amount ? parseFloat(amount) : undefined
          );

          console.log('✅ Prediction:', pred.category, `(${(pred.confidence * 100).toFixed(0)}%)`);
          setMlPrediction(pred);
          
          // Auto-set category if NO category selected yet
          if (pred.confidence > 0.6 && !category) {
            console.log(`🎯 Auto-setting category: ${pred.category}`);
            setCategory(pred.category);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } catch (error) {
          console.error('❌ Prediction failed:', error);
        } finally {
          setMlLoading(false);
        }
      };
      
      getPrediction();
    } else {
      setMlPrediction(null);
    }
  }, [description, amount, type]);

  const saveToStore = useTransactionStore(state => state.addTransaction);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSave = async () => {
    if (!user?.uid || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Missing Info', 'Please enter a valid amount.');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }
    
    if (!category && type === 'debit') {
      Alert.alert('Missing Info', 'Please select a category.');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    
    try {
      const transactionCategory = type === 'credit' ? 'Income' : category;
      const finalAmount = type === 'debit' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      
      await saveToStore({ 
        amount: finalAmount,
        category: transactionCategory,
        description: description.trim() || transactionCategory,
        type: type,
        date: date,
      }, user.uid);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const currentSuggestions = category ? getDescriptionSuggestions(category) : [];
  const hasBudget = budgets.some(b => b.category === category);
  const currentBudget = budgets.find(b => b.category === category);

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
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: theme.text }]}>New Transaction</Text>
          <View style={{ width: 44 }} /> 
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* TYPE TOGGLE - FIRST */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: 50 }}
            style={[styles.toggleWrapper, { backgroundColor: theme.card }]}
          >
            <TouchableOpacity 
              onPress={() => { 
                setType('debit'); 
                setDescription('');
                setCategory('');
                setMlPrediction(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
              }}
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
              onPress={() => { 
                setType('credit'); 
                setDescription('');
                setCategory('');
                setMlPrediction(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
              }}
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

          {/* DESCRIPTION INPUT - SECOND (SO AI CAN PREDICT EARLY) */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: 100 }}
            style={styles.section}
          >
            <Text style={[styles.sectionHeader, { color: theme.subtext }]}>
              {type === 'debit' ? 'WHAT DID YOU BUY?' : 'INCOME SOURCE'}
            </Text>
            
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
                  placeholder={type === 'credit' ? 'Salary, Freelance, etc.' : 'Swiggy, Uber, Amazon, etc.'}
                  placeholderTextColor={theme.subtext}
                  value={description}
                  onChangeText={setDescription}
                  autoCapitalize="words"
                  selectionColor={theme.tint}
                />
                {mlLoading && (
                  <ActivityIndicator size="small" color={theme.tint} />
                )}
              </View>
              
              {/* SHOW CATEGORY SUGGESTIONS IF AVAILABLE */}
              {currentSuggestions.length > 0 && type === 'debit' && showCategorySuggestions && (
                <>
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                  <View style={styles.suggestionsContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.suggestionsLabel, { color: theme.subtext }]}>
                        Quick Suggestions for {category}
                      </Text>
                      <TouchableOpacity onPress={() => setShowCategorySuggestions(false)}>
                        <Ionicons name="close-circle" size={18} color={theme.subtext} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.suggestionsGrid}>
                      {currentSuggestions.slice(0, 6).map((suggestion) => (
                        <TouchableOpacity
                          key={suggestion}
                          onPress={() => {
                            setDescription(suggestion);
                            setShowCategorySuggestions(false);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[styles.suggestionChip, { backgroundColor: theme.background, borderColor: theme.border }]}
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
            </View>

            {/* ML SUGGESTION - APPEARS RIGHT AFTER TYPING */}
            {mlPrediction && mlPrediction.confidence > 0.5 && type === 'debit' && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                style={[styles.mlSuggestion, { 
                  backgroundColor: theme.tint + '15', 
                  borderWidth: 2, 
                  borderColor: theme.tint + '40' 
                }]}
              >
                <View style={[styles.mlIconCircle, { backgroundColor: theme.tint }]}>
                  <Ionicons name="sparkles" size={20} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mlSuggestionTitle, { color: theme.text }]}>
                    AI Suggestion
                  </Text>
                  <Text style={[styles.mlSuggestionText, { color: theme.text }]}>
                    <Text style={{ fontWeight: '900', color: theme.tint }}>{mlPrediction.category}</Text>
                    <Text style={{ fontWeight: '600', color: theme.subtext }}> • {(mlPrediction.confidence * 100).toFixed(0)}% confident</Text>
                  </Text>
                  {mlPrediction.topFeatures && mlPrediction.topFeatures.length > 0 && (
                    <Text style={[styles.mlFeatures, { color: theme.subtext }]}>
                      Based on: {mlPrediction.topFeatures.slice(0, 3).map(f => f.word).join(', ')}
                    </Text>
                  )}
                </View>
                {category !== mlPrediction.category && (
                  <TouchableOpacity
                    onPress={() => {
                      console.log(`✅ Applied ML suggestion: ${mlPrediction.category}`);
                      setCategory(mlPrediction.category);
                      setShowCategorySuggestions(true);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    style={[styles.mlApplyBtn, { backgroundColor: theme.tint }]}
                  >
                    <Text style={styles.mlApplyText}>Apply</Text>
                  </TouchableOpacity>
                )}
                {category === mlPrediction.category && (
                  <View style={[styles.mlAppliedBadge, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                    <Text style={styles.mlAppliedText}>Applied</Text>
                  </View>
                )}
              </MotiView>
            )}
          </MotiView>

          {/* AMOUNT INPUT - THIRD */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 150 }}
          >
            <Text style={[styles.sectionHeader, { color: theme.subtext, marginBottom: 12 }]}>
              AMOUNT
            </Text>
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
            transition={{ type: 'timing', delay: 200 }}
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

          {/* CATEGORY SELECTION - FOURTH (Can be auto-filled by AI) */}
          {type === 'debit' && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', delay: 250 }}
              style={styles.section}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeader, { color: theme.subtext }]}>
                  CATEGORY {category && `• ${category}`}
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
                {availableCategories.map((cat, idx) => {
                  const isSelected = category === cat.name;
                  const catHasBudget = budgets.some(b => b.category === cat.name);
                  const isAiSuggested = mlPrediction?.category === cat.name;
                  
                  return (
                    <MotiView
                      key={cat.name}
                      from={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: 300 + (idx * 30), damping: 15 }}
                    >
                      <TouchableOpacity
                        onPress={() => { 
                          setCategory(cat.name); 
                          setShowCategorySuggestions(true);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
                        }}
                        style={[
                          styles.categoryChip,
                          isSelected 
                            ? { backgroundColor: cat.color, borderColor: cat.color, borderWidth: 2 } 
                            : { backgroundColor: theme.card, borderColor: isAiSuggested ? theme.tint : theme.border, borderWidth: isAiSuggested ? 2 : 1 }
                        ]}
                      >
                        {catHasBudget && (
                          <View style={[styles.budgetDot, { backgroundColor: '#10B981' }]} />
                        )}
                        {isAiSuggested && !isSelected && (
                          <View style={[styles.aiDot, { backgroundColor: theme.tint }]} />
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
                      backgroundColor: currentBudget.spent + parseFloat(amount) > currentBudget.limit 
                        ? '#FEE2E2' 
                        : currentBudget.spent + parseFloat(amount) > currentBudget.limit * 0.8
                        ? '#FEF3C7'
                        : '#DCFCE7'
                    }
                  ]}
                >
                  <Ionicons 
                    name={
                      currentBudget.spent + parseFloat(amount) > currentBudget.limit 
                        ? "warning" 
                        : "information-circle"
                    } 
                    size={16} 
                    color={
                      currentBudget.spent + parseFloat(amount) > currentBudget.limit 
                        ? "#EF4444" 
                        : currentBudget.spent + parseFloat(amount) > currentBudget.limit * 0.8
                        ? "#F59E0B"
                        : "#10B981"
                    } 
                  />
                  <Text style={[
                    styles.budgetWarningText,
                    { 
                      color: currentBudget.spent + parseFloat(amount) > currentBudget.limit 
                        ? "#EF4444" 
                        : currentBudget.spent + parseFloat(amount) > currentBudget.limit * 0.8
                        ? "#F59E0B"
                        : "#10B981"
                    }
                  ]}>
                    {currentBudget.spent + parseFloat(amount) > currentBudget.limit 
                      ? `Will exceed ${category} budget by ₹${Math.round(currentBudget.spent + parseFloat(amount) - currentBudget.limit)}`
                      : `Within budget (₹${Math.round(currentBudget.limit - (currentBudget.spent + parseFloat(amount)))} remaining)`
                    }
                  </Text>
                </MotiView>
              )}
            </MotiView>
          )}

          {/* DATE - LAST */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: 300 }}
            style={styles.section}
          >
            <Text style={[styles.sectionHeader, { color: theme.subtext }]}>DATE</Text>
            
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateCard, { backgroundColor: theme.card }]}
            >
              <LinearGradient
                colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
                style={styles.inputIconCircle}
              >
                <Ionicons name="calendar" size={18} color="white" />
              </LinearGradient>
              <Text style={[styles.dateText, { color: theme.text }]}>
                {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
            </TouchableOpacity>
          </MotiView>
        </ScrollView>

        {/* SUBMIT BUTTON */}
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading || !amount || (type === 'debit' && !category)}
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
              style={[
                styles.saveButton, 
                { opacity: (!amount || loading || (type === 'debit' && !category)) ? 0.5 : 1 }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.saveButtonText}>Add Transaction</Text>
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
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
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
  navTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
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
  toggleLabel: { fontWeight: '800', fontSize: 15 },
  debitActive: { backgroundColor: '#EF4444', elevation: 2 },
  creditActive: { backgroundColor: '#10B981', elevation: 2 },

  section: { marginBottom: 25 },
  sectionHeader: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, marginLeft: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginLeft: 4 },
  budgetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  budgetBadgeText: { fontSize: 11, fontWeight: '800' },

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
  inputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: 14 },
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
  descInput: { fontSize: 16, fontWeight: '700', flex: 1 },
  separator: { height: 1, width: '100%' },

  suggestionsContainer: { paddingVertical: 12 },
  suggestionsLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12, 
    borderWidth: 1 
  },
  suggestionText: { fontSize: 12, fontWeight: '600' },

  // ML Suggestion styles
  mlSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  mlIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  mlSuggestionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mlSuggestionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  mlFeatures: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  mlApplyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  mlApplyText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  mlAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  mlAppliedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
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
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  currencyLabel: { fontSize: 36, fontWeight: '900', marginRight: 8 },
  mainInput: { fontSize: 56, fontWeight: '900', textAlign: 'center', minWidth: 100 },

  quickAmountsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
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
  quickAmountText: { fontSize: 14, fontWeight: '800' },

  categoryScroll: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  categoryChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipText: { fontSize: 13, fontWeight: '700' },
  budgetDot: { 
    position: 'absolute', 
    top: 6, 
    right: 6, 
    width: 8, 
    height: 8, 
    borderRadius: 4
  },
  aiDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'white',
  },

  budgetWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12
  },
  budgetWarningText: { fontSize: 12, fontWeight: '700', flex: 1 },

  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateText: { fontSize: 16, fontWeight: '700', flex: 1 },

  footer: { padding: 20, borderTopWidth: 0 },
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
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: '900' }
});