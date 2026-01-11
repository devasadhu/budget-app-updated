// app/(tabs)/import-sms-screen.tsx
// Redesigned to match app style with consistent UI

import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/theme';
import { SMSParserService } from '../../src/services/smsParserService';
import { useAuthStore } from '../_lib/useAuthStore';
import { useThemeStore } from '../_lib/useThemeStore';
import { useTransactionStore } from '../_lib/useTransactionStore';

interface PreviewTransaction {
  amount: number;
  description: string;
  category: string;
  type: "credit" | "debit";
  date: Date;
  rawText: string;
  merchant: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Food': 'restaurant',
  'Travel': 'airplane',
  'Shopping': 'cart',
  'Bills': 'receipt',
  'Entertainment': 'game-controller',
  'Other': 'ellipse',
  'Income': 'wallet',
};

const SAMPLE_SMS = [
  "HDFC Bank: Rs.1,250.00 debited from A/c **1234 on 21-12-2024 at SWIGGY BANGALORE. Avl bal Rs.45,678.90",
  "SBI: INR 4,500.00 withdrawn from ATM on 20/12/2024. Available balance is Rs.32,100.50",
  "ICICI Bank: Rs.899.00 paid to AMAZON INDIA via UPI. Thank you for banking with us.",
  "Axis Bank: Rs.2,300.00 credited to your account **5678 on 19-12-2024. Avl bal Rs.78,900.00",
];

const categorizeTransaction = (description: string): string => {
  if (!description || description.trim().length === 0) return 'Other';
  
  const desc = description.toLowerCase();
  
  if (desc.match(/zomato|swiggy|restaurant|cafe|food|pizza|burger|mcdonald|kfc|dominos|grocery|supermarket|bigbasket|blinkit/)) {
    return 'Food';
  }
  if (desc.match(/uber|ola|rapido|fuel|petrol|diesel|metro|train|flight|irctc|makemytrip|goibibo|redbus|parking|toll/)) {
    return 'Travel';
  }
  if (desc.match(/amazon|flipkart|myntra|ajio|nykaa|mall|shopping|purchase|store|market|meesho|snapdeal/)) {
    return 'Shopping';
  }
  if (desc.match(/electricity|bill|recharge|mobile|internet|wifi|broadband|water|gas|cylinder|utility|payment|airtel|jio|vodafone|bsnl/)) {
    return 'Bills';
  }
  if (desc.match(/netflix|prime|hotstar|spotify|movie|cinema|theater|game|bookmyshow|concert|subscription/)) {
    return 'Entertainment';
  }
  
  return 'Other';
};

export default function SMSImportScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const { user } = useAuthStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const { addTransactionsBatch } = useTransactionStore();

  const [smsText, setSmsText] = useState('');
  const [previewData, setPreviewData] = useState<PreviewTransaction[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());

  const handlePasteSMS = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().length > 0) {
        setSmsText(text);
        parseSMS(text);
      } else {
        Alert.alert('Clipboard Empty', 'Copy bank SMS messages first, then try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read clipboard. Please try again.');
    }
  };

  const parseSMS = async (text: string) => {
    setIsParsing(true);
    try {
      let smsMessages: string[] = [];
      
      // Split by double newlines
      const byDoubleNewline = text.split(/\n\s*\n/);
      if (byDoubleNewline.length > 1) {
        smsMessages = byDoubleNewline
          .map(msg => msg.replace(/\n/g, ' ').trim())
          .filter(msg => msg.length > 20);
      } else {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let currentGroup: string[] = [];
        const groups: string[][] = [];
        
        lines.forEach(line => {
          const looksLikeNewSMS = line.match(/^(?:[A-Z\s]+:|Rs\.|INR|₹|Dear|Your|A\/c|Avl|Available)/i);
          
          if (looksLikeNewSMS && currentGroup.length > 0) {
            groups.push([...currentGroup]);
            currentGroup = [];
          }
          currentGroup.push(line);
        });
        
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        
        smsMessages = groups.map(group => group.join(' ').trim()).filter(msg => msg.length > 20);
      }
      
      if (smsMessages.length === 0 && text.length > 20) {
        smsMessages = [text.trim()];
      }
      
      const bankSMS = smsMessages.filter(msg => SMSParserService.isBankSMS(msg));
      
      if (bankSMS.length === 0) {
        Alert.alert(
          'No Bank SMS Found',
          'The pasted text doesn\'t appear to contain bank SMS messages.'
        );
        setPreviewData([]);
        setIsParsing(false);
        return;
      }
      
      const parsed = SMSParserService.batchParseSMS(bankSMS);
      
      if (!parsed || parsed.length === 0) {
        Alert.alert(
          'Could Not Parse',
          'We found SMS messages but couldn\'t extract transaction details.'
        );
        setPreviewData([]);
        setIsParsing(false);
        return;
      }
      
      const previewData: PreviewTransaction[] = parsed
        .filter(t => t !== null && t.amount > 0)
        .map(t => {
          const category = categorizeTransaction(t.merchant || t.description || "");
          return {
            amount: t.amount,
            description: t.description || "Bank Transaction",
            category: category,
            type: t.type || 'debit',
            date: t.date || new Date(),
            rawText: t.rawText || "",
            merchant: t.merchant || "",
          };
        })
        .filter(t => t.amount > 0);

      setPreviewData(previewData);

      if (previewData.length === 0) {
        Alert.alert('No Valid Transactions', 'Couldn\'t extract valid transaction details.');
      } else {
        // Select all by default
        const allIndices = new Set(previewData.map((_, i) => i));
        setSelectedTransactions(allIndices);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to parse SMS. Please try again.');
      setPreviewData([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportTransactions = async () => {
    if (!previewData || selectedTransactions.size === 0 || !user?.uid) return;
    
    setIsImporting(true);
    try {
      const transactionsToImport = previewData
        .filter((_, i) => selectedTransactions.has(i))
        .map(t => ({
          amount: t.amount,
          category: t.category || "Other",
          description: t.description || "",
          type: t.type,
          date: t.date,
        }));

      await addTransactionsBatch(transactionsToImport, user.uid);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Success!',
        `Imported ${transactionsToImport.length} transaction${transactionsToImport.length > 1 ? 's' : ''}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Import Error', error.message || 'Failed to import transactions.');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleTransaction = (index: number) => {
    Haptics.selectionAsync();
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleAll = () => {
    Haptics.selectionAsync();
    if (selectedTransactions.size === previewData?.length) {
      setSelectedTransactions(new Set());
    } else {
      const allIndices = new Set(previewData?.map((_, i) => i));
      setSelectedTransactions(allIndices);
    }
  };

  const clearAll = () => {
    setSmsText('');
    setPreviewData(null);
    setSelectedTransactions(new Set());
  };

  const handleUseSample = () => {
    const sampleText = SAMPLE_SMS.join('\n\n');
    setSmsText(sampleText);
    parseSMS(sampleText);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {previewData ? 'Review SMS Import' : 'Import from SMS'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {!previewData ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* INSTRUCTIONS */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={[styles.instructionCard, { backgroundColor: theme.card }]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${theme.tint}20` }]}>
                <Ionicons name="chatbubbles" size={40} color={theme.tint} />
              </View>
              <Text style={[styles.instructionTitle, { color: theme.text }]}>
                How to Import from SMS
              </Text>
              <View style={styles.stepsContainer}>
                <View style={styles.step}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.text }]}>
                    Open your Messages app
                  </Text>
                </View>
                <View style={styles.step}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.text }]}>
                    Select bank SMS messages
                  </Text>
                </View>
                <View style={styles.step}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.text }]}>
                    Copy the messages
                  </Text>
                </View>
                <View style={styles.step}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.text }]}>
                    Return here and paste
                  </Text>
                </View>
              </View>
            </MotiView>

            {/* QUICK TEST */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 100 }}
            >
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: `${theme.tint}15`, borderColor: theme.tint }]}
                onPress={handleUseSample}
              >
                <Ionicons name="flash" size={20} color={theme.tint} />
                <Text style={[styles.testButtonText, { color: theme.tint }]}>
                  Try with Sample SMS
                </Text>
              </TouchableOpacity>
            </MotiView>

            {/* SMS INPUT */}
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 200 }}
            >
              <TouchableOpacity
                style={[
                  styles.smsInputContainer,
                  {
                    backgroundColor: theme.card,
                    borderColor: smsText ? theme.tint : theme.border,
                  }
                ]}
                onPress={handlePasteSMS}
                disabled={isParsing}
                activeOpacity={0.8}
              >
                {smsText ? (
                  <View style={styles.smsPreview}>
                    <View style={[styles.smsBadge, { backgroundColor: `${theme.tint}20` }]}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.tint} />
                      <Text style={[styles.smsBadgeText, { color: theme.tint }]}>
                        SMS Ready
                      </Text>
                    </View>
                    <Text style={[styles.smsText, { color: theme.text }]} numberOfLines={4}>
                      {smsText.substring(0, 200)}{smsText.length > 200 ? '...' : ''}
                    </Text>
                    <TouchableOpacity onPress={handlePasteSMS} style={styles.pasteAgainButton}>
                      <Ionicons name="clipboard-outline" size={18} color={theme.tint} />
                      <Text style={[styles.pasteAgainText, { color: theme.tint }]}>
                        Paste Again
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pastePlaceholder}>
                    <View style={[styles.clipboardIcon, { backgroundColor: `${theme.tint}20` }]}>
                      <Ionicons name="clipboard-outline" size={44} color={theme.tint} />
                    </View>
                    <Text style={[styles.pastePlaceholderTitle, { color: theme.text }]}>
                      No SMS Pasted Yet
                    </Text>
                    <Text style={[styles.pastePlaceholderText, { color: theme.subtext }]}>
                      Tap here to paste from clipboard
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </MotiView>

            {/* PARSE BUTTON */}
            {smsText && !isParsing && (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <TouchableOpacity
                  style={[styles.parseButton, { backgroundColor: theme.tint }]}
                  onPress={() => parseSMS(smsText)}
                >
                  <Ionicons name="search" size={22} color="white" />
                  <Text style={styles.parseButtonText}>Parse Transactions</Text>
                </TouchableOpacity>
              </MotiView>
            )}

            {isParsing && (
              <View style={styles.parsingContainer}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={[styles.parsingText, { color: theme.text }]}>
                  Parsing SMS messages...
                </Text>
              </View>
            )}

            {/* INFO NOTE */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 300 }}
              style={[styles.noteCard, { backgroundColor: `${theme.tint}10` }]}
            >
              <Ionicons name="information-circle" size={20} color={theme.tint} />
              <Text style={[styles.noteText, { color: theme.text }]}>
                Your SMS data is processed locally on your device. Nothing is sent to any server.
              </Text>
            </MotiView>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {/* PREVIEW HEADER */}
            <View style={[styles.statementInfo, { backgroundColor: theme.card }]}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: `${theme.tint}20` }]}>
                  <Ionicons name="chatbubbles" size={20} color={theme.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: theme.subtext }]}>Found</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {previewData.length} SMS Transactions
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: `${theme.tint}20` }]}>
                  <Ionicons name="list" size={20} color={theme.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: theme.subtext }]}>Selected</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {selectedTransactions.size} of {previewData.length}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleAll}
                  style={[styles.selectAllBtn, { backgroundColor: theme.background }]}
                >
                  <Text style={[styles.selectAllText, { color: theme.tint }]}>
                    {selectedTransactions.size === previewData.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* TRANSACTIONS LIST */}
            <FlatList
              data={previewData}
              contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item, index }) => {
                const isSelected = selectedTransactions.has(index);
                const categoryIcon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS['Other'];

                return (
                  <TouchableOpacity
                    onPress={() => toggleTransaction(index)}
                    style={[
                      styles.transactionItem,
                      {
                        backgroundColor: theme.card,
                        borderColor: isSelected ? theme.tint : theme.border,
                        opacity: isSelected ? 1 : 0.6,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? theme.tint : theme.border,
                          backgroundColor: isSelected ? theme.tint : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>

                    <View
                      style={[
                        styles.categoryIconBox,
                        { backgroundColor: `${item.type === 'credit' ? '#10B981' : '#EF4444'}20` },
                      ]}
                    >
                      <Ionicons
                        name={categoryIcon as any}
                        size={20}
                        color={item.type === 'credit' ? '#10B981' : '#EF4444'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txnDesc, { color: theme.text }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={[styles.txnSub, { color: theme.subtext }]}>
                        {item.category} • {item.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                      {item.merchant && (
                        <Text style={[styles.merchantText, { color: theme.tint }]} numberOfLines={1}>
                          {item.merchant}
                        </Text>
                      )}
                    </View>

                    <Text style={[styles.txnAmount, { color: item.type === 'credit' ? '#10B981' : '#EF4444' }]}>
                      {item.type === 'credit' ? '+' : '-'}₹{item.amount.toFixed(0)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* FOOTER */}
            <View style={{ backgroundColor: theme.background }}>
              <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.footerBtn,
                    { backgroundColor: theme.card, flex: 1, borderWidth: 1, borderColor: theme.border },
                  ]}
                  onPress={clearAll}
                >
                  <Text style={[styles.footerBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.footerBtn, { backgroundColor: theme.tint, flex: 2 }]}
                  onPress={handleImportTransactions}
                  disabled={isImporting || selectedTransactions.size === 0}
                >
                  {isImporting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={22} color="white" />
                      <Text style={[styles.footerBtnText, { color: 'white' }]}>
                        Import {selectedTransactions.size}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  content: { padding: 20 },
  instructionCard: { padding: 32, borderRadius: 24, alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  instructionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  stepsContainer: { gap: 16, width: '100%' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: 'white', fontSize: 14, fontWeight: '900' },
  stepText: { fontSize: 15, flex: 1, fontWeight: '600' },
  testButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginBottom: 20, gap: 8, borderWidth: 2 },
  testButtonText: { fontSize: 15, fontWeight: '800' },
  smsInputContainer: { borderRadius: 20, marginBottom: 20, overflow: 'hidden', minHeight: 200, borderWidth: 2, borderStyle: 'dashed' },
  smsPreview: { padding: 20 },
  smsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  smsBadgeText: { fontSize: 12, fontWeight: '800' },
  smsText: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  pasteAgainButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  pasteAgainText: { fontSize: 14, fontWeight: '700' },
  pastePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  clipboardIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pastePlaceholderTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  pastePlaceholderText: { fontSize: 14, textAlign: 'center', fontWeight: '600' },
  parseButton: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
  parseButtonText: { color: 'white', fontSize: 18, fontWeight: '900' },
  parsingContainer: { alignItems: 'center', paddingVertical: 30, marginBottom: 20 },
  parsingText: { fontSize: 16, marginTop: 12, fontWeight: '700' },
  noteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  noteText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  statementInfo: { padding: 20, marginHorizontal: 20, marginTop: 12, borderRadius: 20, gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '800' },
  selectAllBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  selectAllText: { fontSize: 13, fontWeight: '800' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 2, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  categoryIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  txnSub: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  merchantText: { fontSize: 11, fontWeight: '700' },
  txnAmount: { fontSize: 17, fontWeight: '900' },
  footer: { flexDirection: 'row', padding: 16, paddingBottom: 24, gap: 12, borderTopWidth: 1 },
  footerBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  footerBtnText: { fontWeight: '900', fontSize: 15 },
});