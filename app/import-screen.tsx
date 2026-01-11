// SmartBudget/app/import-screen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { useThemeStore } from './_lib/useThemeStore';
import { useTransactionStore } from './_lib/useTransactionStore';
import { useAuthStore } from './_lib/useAuthStore';
import { Colors } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

interface PreviewTransaction {
  amount: number;
  description: string;
  category: string;
  type: "credit" | "debit";
  date: Date;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Food': 'fast-food',
  'Travel': 'airplane',
  'Shopping': 'cart',
  'Bills': 'receipt',
  'Entertainment': 'game-controller',
  'Other': 'ellipse',
  'Income': 'wallet',
};

// 🆕 AUTO-CATEGORIZATION SERVICE
const categorizeTransaction = (description: string): string => {
  const desc = description.toLowerCase();
  
  // Food & Dining
  if (desc.match(/zomato|swiggy|restaurant|cafe|food|pizza|burger|mcdonald|kfc|dominos|grocery|supermarket|bigbasket|blinkit/)) {
    return 'Food';
  }
  
  // Travel & Transportation
  if (desc.match(/uber|ola|rapido|fuel|petrol|diesel|metro|train|flight|irctc|makemytrip|goibibo|redbus|parking|toll/)) {
    return 'Travel';
  }
  
  // Shopping
  if (desc.match(/amazon|flipkart|myntra|ajio|nykaa|mall|shopping|purchase|store|market|meesho|snapdeal/)) {
    return 'Shopping';
  }
  
  // Bills & Utilities
  if (desc.match(/electricity|bill|recharge|mobile|internet|wifi|broadband|water|gas|cylinder|utility|payment|airtel|jio|vodafone|bsnl/)) {
    return 'Bills';
  }
  
  // Entertainment
  if (desc.match(/netflix|prime|hotstar|spotify|movie|cinema|theater|game|bookmyshow|concert|subscription/)) {
    return 'Entertainment';
  }
  
  return 'Other';
};

// 🆕 ENHANCED CSV PARSER WITH AUTO-CATEGORIZATION
const enhancedParse = (fileText: string): Promise<PreviewTransaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const mapped = results.data.map((row: any) => {
            const amount = Math.abs(parseFloat(row.Amount || row.amount || 0));
            const rawType = String(row.Type || row.type || 'debit').toLowerCase();
            const type: "credit" | "debit" = rawType === 'credit' ? 'credit' : 'debit';
            
            let transactionDate = new Date();
            if (row.Date || row.date) {
              const parsedDate = new Date(row.Date || row.date);
              if (!isNaN(parsedDate.getTime())) transactionDate = parsedDate;
            }

            const description = String(row.Description || row.description || 'Imported');
            let category = String(row.Category || row.category || 'Other');
            
            // 🆕 AUTO-CATEGORIZATION: If category is missing or "Other", try to categorize
            if (!row.Category && !row.category || category === 'Other') {
              category = categorizeTransaction(description);
            }

            return {
              amount,
              description,
              category,
              type,
              date: transactionDate,
            };
          });
          resolve(mapped);
        } catch (err: any) {
          reject(err);
        }
      },
      error: (error: any) => reject(error)
    });
  });
};

export default function ImportScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const user = useAuthStore((state) => state.user);
  const addTransactionsBatch = useTransactionStore((state) => state.addTransactionsBatch);
  
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewTransaction[] | null>(null);

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsImporting(true);

      const fileUri = result.assets[0].uri;
      const response = await fetch(fileUri);
      const fileText = await response.text();

      // 🆕 Use enhanced parser with auto-categorization
      const mapped = await enhancedParse(fileText);
      setPreviewData(mapped);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsImporting(false);
    } catch (error) {
      setIsImporting(false);
      Alert.alert("Error", "Failed to read file.");
    }
  };

  // 🆕 SMS IMPORT HANDLER
  const handleSMSImport = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Not Available',
        'SMS import is only available on Android devices'
      );
      return;
    }

    Alert.alert(
      'SMS Import',
      'This feature will read your bank transaction SMS messages. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            Alert.alert(
              'Coming Soon',
              'SMS import is under development. For now, please use CSV import.'
            );
            // TODO: Implement SMS permission and parsing
          }
        }
      ]
    );
  };

  const confirmImport = async () => {
    if (!previewData || !user?.uid) return;
    setIsImporting(true);
    try {
      await addTransactionsBatch(previewData, user.uid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Imported ${previewData.length} transactions!`);
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to save transactions.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: theme.card }]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {previewData ? 'Review Import' : 'Import Transactions'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {!previewData ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Info Card */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
            style={[styles.infoCard, { backgroundColor: theme.card }]}
          >
            <View style={[styles.infoIcon, { backgroundColor: `${theme.tint}15` }]}>
              <Ionicons name="information-circle" size={24} color={theme.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>CSV Format Required</Text>
              <Text style={[styles.infoText, { color: theme.subtext }]}>
                Your CSV should have these headers:{'\n'}
                <Text style={{ fontWeight: '800', color: theme.text }}>
                  Date, Description, Category, Amount, Type
                </Text>
              </Text>
            </View>
          </MotiView>

          {/* 🆕 SMS IMPORT BUTTON */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 100 }}
          >
            <TouchableOpacity 
              style={[styles.smsButton, { backgroundColor: theme.tint }]}
              onPress={handleSMSImport}
              disabled={isImporting}
            >
              <Ionicons name="chatbox-ellipses" size={24} color="white" />
              <View style={{ flex: 1 }}>
                <Text style={styles.smsButtonTitle}>Import from SMS</Text>
                <Text style={styles.smsButtonSub}>
                  Android only • Read bank messages
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </MotiView>

          {/* 🆕 DIVIDER */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.subtext }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Drop Zone */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 200, damping: 15 }}
          >
            <TouchableOpacity 
              style={[styles.dropZone, { borderColor: theme.border, backgroundColor: theme.card }]} 
              onPress={handleFilePicker}
              disabled={isImporting}
              activeOpacity={0.8}
            >
              {isImporting ? (
                <>
                  <ActivityIndicator size="large" color={theme.tint} />
                  <Text style={[styles.dropSubtext, { color: theme.subtext, marginTop: 15 }]}>
                    Processing file...
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: `${theme.tint}15` }]}>
                    <Ionicons name="cloud-upload" size={48} color={theme.tint} />
                  </View>
                  <Text style={[styles.dropText, { color: theme.text }]}>Select CSV File</Text>
                  <Text style={[styles.dropSubtext, { color: theme.subtext }]}>
                    Tap to browse your files
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </MotiView>

          {/* Example Format */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 300 }}
            style={[styles.exampleCard, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.exampleTitle, { color: theme.text }]}>Example CSV Format</Text>
            <View style={[styles.codeBlock, { backgroundColor: theme.background }]}>
              <Text style={[styles.codeText, { color: theme.subtext }]}>
                Date,Description,Category,Amount,Type{'\n'}
                2024-01-15,Grocery Shopping,Food,1200,debit{'\n'}
                2024-01-16,Salary,Income,50000,credit
              </Text>
            </View>
          </MotiView>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Preview List */}
          <FlatList
            data={previewData}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            keyExtractor={(_, index) => index.toString()}
            ListHeaderComponent={
              <View style={styles.previewHeader}>
                <Text style={[styles.previewHeaderText, { color: theme.text }]}>
                  {previewData.length} transactions ready to import
                </Text>
                <Text style={[styles.previewSubtext, { color: theme.subtext }]}>
                  Tap any item to remove it
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const categoryIcon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS['Other'];
              return (
                <MotiView
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 400, delay: index * 50 }}
                >
                  <TouchableOpacity
                    style={[styles.previewItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Alert.alert(
                        "Remove Item",
                        `Remove "${item.description}"?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => {
                              const newData = [...previewData];
                              newData.splice(index, 1);
                              setPreviewData(newData.length > 0 ? newData : null);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <View style={[styles.categoryIconBox, { backgroundColor: `${item.type === 'credit' ? '#10B981' : '#EF4444'}20` }]}>
                      <Ionicons 
                        name={categoryIcon as any} 
                        size={20} 
                        color={item.type === 'credit' ? '#10B981' : '#EF4444'} 
                      />
                    </View>
                    <View style={styles.previewLeft}>
                      <Text style={[styles.previewDesc, { color: theme.text }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={[styles.previewSub, { color: theme.subtext }]}>
                        {item.category} • {item.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={[styles.previewAmount, { color: item.type === 'credit' ? '#10B981' : '#EF4444' }]}>
                      {item.type === 'credit' ? '+' : '-'}₹{item.amount.toFixed(0)}
                    </Text>
                  </TouchableOpacity>
                </MotiView>
              );
            }}
          />
          
          {/* Footer Actions */}
          <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.card, flex: 1, borderWidth: 1, borderColor: theme.border }]} 
              onPress={() => {
                Haptics.selectionAsync();
                setPreviewData(null);
              }}
            >
              <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.tint, flex: 2 }]} 
              onPress={confirmImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="white" />
                  <Text style={[styles.btnText, { color: 'white' }]}>
                    Import {previewData.length} Items
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  content: { padding: 20 },
  infoCard: { flexDirection: 'row', padding: 20, borderRadius: 24, gap: 16, marginBottom: 25, elevation: 2 },
  infoIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  infoTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  infoText: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  // 🆕 SMS BUTTON STYLES
  smsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    gap: 16,
    marginBottom: 20,
    elevation: 3
  },
  smsButtonTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800'
  },
  smsButtonSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  // 🆕 DIVIDER STYLES
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700'
  },
  dropZone: { 
    height: 240, 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 25,
    elevation: 1
  },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  dropText: { fontSize: 18, fontWeight: '900', marginBottom: 8 },
  dropSubtext: { fontSize: 14, fontWeight: '600' },
  exampleCard: { padding: 20, borderRadius: 24, elevation: 2 },
  exampleTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  codeBlock: { padding: 16, borderRadius: 16 },
  codeText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  previewHeader: { marginBottom: 20 },
  previewHeaderText: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  previewSubtext: { fontSize: 13, fontWeight: '600' },
  previewItem: { 
    flexDirection: 'row', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1, 
    alignItems: 'center',
    gap: 12,
    elevation: 1
  },
  categoryIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  previewLeft: { flex: 1 },
  previewDesc: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  previewSub: { fontSize: 12, fontWeight: '600' },
  previewAmount: { fontSize: 17, fontWeight: '900' },
  footer: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row', 
    padding: 20, 
    gap: 12, 
    borderTopWidth: 1,
    elevation: 10
  },
  btn: { 
    height: 60, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    elevation: 3
  },
  btnText: { fontWeight: '900', fontSize: 16 }
});