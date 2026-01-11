// SmartBudget/app/(tabs)/activity.tsx
// UPDATED: Much Better delete UI

import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

import { useTransactionStore, useTransactionData, Transaction } from '../_lib/useTransactionStore'; 
import { useAuthStore } from '../_lib/useAuthStore'; 
import { useThemeStore } from '../_lib/useThemeStore';
import { Colors } from '../../constants/theme';
import { CATEGORIES } from '../../constants/category';
import { anomalyDetectionService } from '../_lib/anomalyDetectionService';

const CATEGORY_COLORS: { [key: string]: string } = {
  'Food': '#F59E0B',
  'Travel': '#0EA5E9',
  'Bills': '#8B5CF6',
  'Shopping': '#EC4899',
  'Entertainment': '#EF4444',
  'Other': '#64748B',
};

// 💳 TRANSACTION CARD
const TransactionCard = ({ 
  transaction, 
  theme, 
  isSelectionMode,
  isSelected,
  onSelect,
  onLongPress,
  allTransactions
}: any) => {
  const [anomaly, setAnomaly] = useState<any>(null);
  
  useEffect(() => {
    checkAnomaly();
  }, [transaction, allTransactions]);
  
  const checkAnomaly = async () => {
    anomalyDetectionService.setTransactionHistory(allTransactions);
    const result = await anomalyDetectionService.detectAnomaly(transaction);
    if (result.isAnomaly && result.severity === 'high') {
      setAnomaly(result);
    }
  };
  
  const isIncome = transaction.type === 'credit';
  const categoryColor = CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS['Other'];
  
  const handlePress = () => {
    if (isSelectionMode) {
      onSelect(transaction.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
      router.push({ 
        pathname: '/edit_transaction' as any, 
        params: { ...transaction, date: new Date(transaction.date).toISOString() }
      });
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={handlePress}
      onLongPress={() => {
        onLongPress();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      activeOpacity={0.7} 
      style={[
        styles.transactionCard,
        { backgroundColor: theme.card },
        isSelected && styles.selectedCard,
        anomaly && styles.anomalyBorder
      ]}
    >
      {isSelectionMode && (
        <View style={[
          styles.selectionIndicator, 
          { backgroundColor: isSelected ? theme.tint : theme.border }
        ]} />
      )}
      
      <View style={styles.transactionLeft}>
        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
        <View style={styles.transactionInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.transactionTitle, { color: theme.text }]} numberOfLines={1}>
              {transaction.description}
            </Text>
            {anomaly && <Ionicons name="alert-circle" size={14} color="#F59E0B" />}
          </View>
          <Text style={[styles.transactionCategory, { color: theme.subtext }]}>
            {transaction.category}
          </Text>
        </View>
      </View>

      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount, 
          { color: isIncome ? '#10B981' : theme.text }
        ]}>
          {isIncome ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.transactionDate, { color: theme.subtext }]}>
          {new Date(transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      {isSelectionMode && isSelected && (
        <View style={[styles.checkmark, { backgroundColor: theme.tint }]}>
          <Ionicons name="checkmark" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// 📊 STATS BAR
const StatsBar = ({ stats, theme }: any) => (
  <View style={[styles.statsBar, { backgroundColor: theme.card }]}>
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: theme.subtext }]}>Income</Text>
      <Text style={[styles.statAmount, { color: '#10B981' }]}>
        ₹{stats.income.toLocaleString('en-IN')}
      </Text>
    </View>
    <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: theme.subtext }]}>Expenses</Text>
      <Text style={[styles.statAmount, { color: '#EF4444' }]}>
        ₹{stats.expense.toLocaleString('en-IN')}
      </Text>
    </View>
  </View>
);

// 🎯 IMPROVED FLOATING ACTION BAR
const FloatingActionBar = ({ selectedCount, onDelete, onCancel, theme }: any) => (
  <MotiView
    from={{ opacity: 0, translateY: 100 }}
    animate={{ opacity: 1, translateY: 0 }}
    exit={{ opacity: 0, translateY: 100 }}
    style={[styles.floatingBar, { backgroundColor: theme.card }]}
  >
    <View style={styles.floatingBarContent}>
      {/* Title Section */}
      <View style={styles.floatingBarHeader}>
        <Text style={[styles.floatingBarTitle, { color: theme.text }]}>
          {selectedCount} {selectedCount === 1 ? 'transaction' : 'transactions'}
        </Text>
        <Text style={[styles.floatingBarSubtitle, { color: theme.subtext }]}>
          Tap items to deselect
        </Text>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.floatingBarActions}>
        <TouchableOpacity 
          style={[styles.cancelBtn, { backgroundColor: theme.background }]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={onDelete}
          disabled={selectedCount === 0}
        >
          <LinearGradient
            colors={selectedCount === 0 ? ['#94A3B8', '#64748B'] : ['#EF4444', '#DC2626'] as const}
            style={styles.deleteBtnGradient}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </MotiView>
);

export default function ActivityScreen() {
  const user = useAuthStore(state => state.user);
  const authLoading = useAuthStore(state => state.isLoading);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const { transactions, isLoading } = useTransactionData();
  const fetchTransactions = useTransactionStore(state => state.fetchTransactions);
  const deleteTransaction = useTransactionStore(state => state.deleteTransaction);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (searchQuery.trim()) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    return filtered;
  }, [transactions, searchQuery, selectedCategory]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups: { [key: string]: Transaction[] }, transaction) => {
      const dateKey = new Date(transaction.date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(transaction);
      return groups;
    }, {});
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    const expense = filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const income = filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { expense, income, count: filteredTransactions.length };
  }, [filteredTransactions]);

  useEffect(() => {
    if (!authLoading && user?.uid) {
      fetchTransactions(user.uid);
    }
  }, [authLoading, user?.uid]);

  const onRefresh = async () => {
    if (!user?.uid) return;
    setIsRefreshing(true);
    await fetchTransactions(user.uid);
    setIsRefreshing(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      "Delete Transactions",
      `Delete ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(Array.from(selectedIds).map(id => deleteTransaction(id)));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to delete transactions.");
            }
          }
        }
      ]
    );
  };

  const cancelSelection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Activity</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            {stats.count} transactions
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.card }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="funnel-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.card }]}
            onPress={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}
          >
            <Ionicons 
              name={isSelectionMode ? "close" : "checkmark-circle-outline"} 
              size={20} 
              color={theme.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {!isSelectionMode && <StatsBar stats={stats} theme={theme} />}

      {!isSelectionMode && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
            <Ionicons name="search" size={18} color={theme.subtext} />
            <TextInput
              placeholder="Search transactions..."
              placeholderTextColor={theme.subtext}
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.subtext} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showFilters && !isSelectionMode && (
        <MotiView
          from={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={styles.filtersContainer}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.filterChipText, !selectedCategory && { color: 'white' }]}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.name && { backgroundColor: cat.color }
                ]}
                onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
              >
                <Text style={[styles.filterChipText, selectedCategory === cat.name && { color: 'white' }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </MotiView>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {isLoading && transactions.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.tint} />
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No transactions found</Text>
            {searchQuery && (
              <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
                Try adjusting your search
              </Text>
            )}
          </View>
        ) : (
          Object.keys(groupedTransactions).map((date) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: theme.subtext }]}>{date}</Text>
              {groupedTransactions[date].map((tx) => (
                <TransactionCard 
                  key={tx.id} 
                  transaction={tx} 
                  theme={theme}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.has(tx.id)}
                  onSelect={toggleSelection}
                  onLongPress={() => setIsSelectionMode(true)}
                  allTransactions={filteredTransactions}
                />
              ))}
            </View>
          ))
        )}
        <View style={{ height: isSelectionMode ? 160 : 100 }} />
      </ScrollView>

      {isSelectionMode && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          onDelete={handleDelete}
          onCancel={cancelSelection}
          theme={theme}
        />
      )}
    </SafeAreaView>
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
    marginBottom: 20
  },
  headerTitle: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '600' },
  iconButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statAmount: { fontSize: 20, fontWeight: '900' },
  statDivider: { width: 1, marginHorizontal: 16 },

  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12,
    borderRadius: 12,
    gap: 12
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '600' },

  filtersContainer: { paddingHorizontal: 20, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8
  },
  filterChipActive: { backgroundColor: '#6366F1' },
  filterChipText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },

  scrollContent: { paddingHorizontal: 20 },
  dateGroup: { marginBottom: 24 },
  dateHeader: { 
    fontSize: 12, 
    fontWeight: '800', 
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1
  },

  transactionCard: { 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden'
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  anomalyBorder: {
    borderWidth: 1,
    borderColor: '#F59E0B40'
  },
  transactionLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  transactionCategory: { fontSize: 13, fontWeight: '600' },
  transactionRight: { alignItems: 'flex-end', marginRight: 8 },
  transactionAmount: { fontSize: 17, fontWeight: '900', marginBottom: 2 },
  transactionDate: { fontSize: 12, fontWeight: '600' },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // IMPROVED Floating Action Bar
  floatingBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    left: 20,
    right: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  floatingBarContent: {
    padding: 20,
  },
  floatingBarHeader: {
    marginBottom: 16,
  },
  floatingBarTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  floatingBarSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  floatingBarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  deleteBtn: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  deleteBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  deleteBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },

  centerContainer: { marginTop: 100, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});