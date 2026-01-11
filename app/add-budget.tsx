// SmartBudget/app/add-budget.tsx
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
  KeyboardAvoidingView
} from 'react-native';
import { router } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { useBudgetStore } from './_lib/useBudgetStore'; 
import { useAuthStore } from './_lib/useAuthStore';
import { useThemeStore } from './_lib/useThemeStore';
import { Colors } from '../constants/theme';
import { CATEGORIES } from '../constants/category';

const GRADIENTS = {
  primary: ['#6366F1', '#8B5CF6', '#A855F7'] as const,
  primaryDark: ['#4F46E5', '#7C3AED', '#C084FC'] as const,
};

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

export default function AddBudgetScreen() {
  const user = useAuthStore(state => state.user);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const budgets = useBudgetStore(state => state.budgets);
  const addBudget = useBudgetStore(state => state.addBudget);
  const getSuggestedBudgets = useBudgetStore(state => state.getSuggestedBudgets);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<number | null>(null);

  // Filter out categories that already have budgets
  const existingCategories = budgets.map(b => b.category);
  const availableCategories = CATEGORIES.filter(cat => !existingCategories.includes(cat.name));

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCategorySelect = (categoryName: string) => {
    setCategory(categoryName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Get AI suggestion for this category
    try {
      const predictions = getSuggestedBudgets();
      const prediction = predictions.find(p => p.category === categoryName);
      
      if (prediction) {
        setAISuggestion(prediction.suggestedBudget);
        setShowAISuggestion(true);
      } else {
        setAISuggestion(null);
        setShowAISuggestion(false);
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    }
  };

  const handleApplyAISuggestion = () => {
    if (aiSuggestion) {
      setAmount(aiSuggestion.toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Missing Info', 'Please enter a valid budget amount.');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }
    
    if (!category) {
      Alert.alert('Missing Info', 'Please select a category.');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    
    try {
      const selectedCategory = CATEGORIES.find(cat => cat.name === category);
      if (!selectedCategory) throw new Error('Invalid category');

      await addBudget({ 
        userId: user.uid,
        category: category,
        limit: parseFloat(amount),
        icon: selectedCategory.icon,
        color: selectedCategory.color,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back(); 
    } catch (error) {
      console.error('Failed to add budget:', error);
      Alert.alert('Error', 'Failed to create budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (availableCategories.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backCircle, { backgroundColor: theme.card }]}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: theme.text }]}>New Budget</Text>
          <View style={{ width: 44 }} /> 
        </View>

        <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
          <Ionicons name="checkmark-circle" size={80} color={theme.tint} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            All Categories Covered!
          </Text>
          <Text style={[styles.emptyText, { color: theme.subtext }]}>
            You've already created budgets for all available categories.
          </Text>
          <TouchableOpacity 
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
              style={styles.closeBtnGradient}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={[styles.navTitle, { color: theme.text }]}>New Budget</Text>
          <View style={{ width: 44 }} /> 
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* AMOUNT CARD */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <LinearGradient
              colors={['#D1FAE5', '#ECFDF5'] as const}
              style={styles.amountCard}
            >
              <View style={styles.amountRow}>
                <Text style={[styles.currencyLabel, { color: '#10B981' }]}>₹</Text>
                <TextInput
                  style={[styles.mainInput, { color: theme.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.subtext}
                  keyboardType="decimal-pad"
                  autoFocus
                  value={amount}
                  onChangeText={setAmount}
                  selectionColor={theme.tint}
                />
              </View>
              <Text style={styles.amountLabel}>Monthly Limit</Text>
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
          {showAISuggestion && aiSuggestion && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={[styles.aiSuggestionCard, { backgroundColor: theme.tint + '15' }]}
            >
              <View style={styles.aiSuggestionContent}>
                <Ionicons name="flash" size={20} color={theme.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiSuggestionLabel, { color: theme.tint }]}>
                    🔮 AI Suggestion
                  </Text>
                  <Text style={[styles.aiSuggestionValue, { color: theme.text }]}>
                    ₹{aiSuggestion.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.aiSuggestionReason, { color: theme.subtext }]}>
                    Based on your spending history
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

          {/* CATEGORY SELECTION */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: 200 }}
            style={styles.section}
          >
            <Text style={[styles.sectionHeader, { color: theme.subtext }]}>
              Select Category
            </Text>
            
            <View style={styles.categoryGrid}>
              {availableCategories.map((cat, idx) => {
                const isSelected = category === cat.name;
                
                return (
                  <MotiView
                    key={cat.name}
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', delay: 250 + (idx * 50), damping: 15 }}
                    style={styles.categoryItemWrapper}
                  >
                    <TouchableOpacity
                      onPress={() => handleCategorySelect(cat.name)}
                      style={[
                        styles.categoryItem,
                        isSelected 
                          ? { backgroundColor: cat.color, borderColor: cat.color } 
                          : { backgroundColor: theme.card, borderColor: theme.border }
                      ]}
                    >
                      <Ionicons 
                        name={cat.icon} 
                        size={32} 
                        color={isSelected ? 'white' : cat.color} 
                      />
                      <Text style={[
                        styles.categoryItemText, 
                        { color: isSelected ? 'white' : theme.text }
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  </MotiView>
                );
              })}
            </View>
          </MotiView>
        </ScrollView>

        {/* SUBMIT BUTTON */}
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading || !amount || !category}
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={isDarkMode ? GRADIENTS.primaryDark : GRADIENTS.primary}
              style={[
                styles.saveButton, 
                { opacity: (!amount || !category || loading) ? 0.5 : 1 }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.saveButtonText}>Create Budget</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  currencyLabel: { fontSize: 36, fontWeight: '900', marginRight: 8 },
  mainInput: { fontSize: 56, fontWeight: '900', textAlign: 'center', minWidth: 100 },
  amountLabel: { color: '#059669', fontSize: 14, fontWeight: '700' },

  quickAmountsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' },
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

  section: { marginBottom: 25 },
  sectionHeader: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16, textAlign: 'center' },
  
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  categoryItemWrapper: {
    width: '47%',
  },
  categoryItem: { 
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryItemText: { fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' },

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
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: '900' },

  // Empty State
  emptyContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  closeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  closeBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});