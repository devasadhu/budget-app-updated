// app/(tabs)/import-sms-screen.tsx
"use client"

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/theme';
import { SMSParserService } from '../../src/services/smsParserService';
import { useAuthStore } from '../_lib/useAuthStore';
import { useThemeStore } from '../_lib/useThemeStore';
import { useTransactionStore } from '../_lib/useTransactionStore';

// Define PreviewTransaction interface matching your CSV import
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
  'Food': 'fast-food',
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
  "Paytm Payments Bank: Rs.500.00 debited for mobile recharge on 18-12-2024. Balance Rs.2,450.00",
];

// Auto-categorization function
const categorizeTransaction = (description: string): string => {
  if (!description || description.trim().length === 0) {
    return 'Other';
  }
  
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

  const handlePasteSMS = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().length > 0) {
        setSmsText(text);
        parseSMS(text);
      } else {
        Alert.alert('Clipboard Empty', 'Copy a bank SMS message first, then try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read clipboard. Please try again.');
    }
  };

  const parseSMS = async (text: string) => {
    setIsParsing(true);
    try {
      console.log('=== RAW TEXT FROM CLIPBOARD ===');
      console.log(text);
      console.log('=== END RAW TEXT ===');
      
      // SIMPLER APPROACH: Split by common SMS separators
      // Try multiple splitting strategies
      let smsMessages: string[] = [];
      
      // Strategy 1: Split by double newlines (common for pasted SMS)
      const byDoubleNewline = text.split(/\n\s*\n/);
      if (byDoubleNewline.length > 1) {
        smsMessages = byDoubleNewline
          .map(msg => msg.replace(/\n/g, ' ').trim())
          .filter(msg => msg.length > 20);
      } 
      // Strategy 2: Split by single newlines and filter
      else {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Group lines into SMS messages
        let currentGroup: string[] = [];
        const groups: string[][] = [];
        
        lines.forEach(line => {
          // Check if line looks like start of new SMS
          const looksLikeNewSMS = line.match(/^(?:[A-Z\s]+:|Rs\.|INR|₹|Dear|Your|A\/c|Avl|Available)/i);
          
          if (looksLikeNewSMS && currentGroup.length > 0) {
            groups.push([...currentGroup]);
            currentGroup = [];
          }
          
          currentGroup.push(line);
        });
        
        // Add last group
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        
        smsMessages = groups.map(group => group.join(' ').trim()).filter(msg => msg.length > 20);
      }
      
      // Strategy 3: If still no messages, treat the whole text as one message
      if (smsMessages.length === 0 && text.length > 20) {
        smsMessages = [text.trim()];
      }
      
      console.log('SMS messages found:', smsMessages);
      
      // Filter to only bank SMS
      const bankSMS = smsMessages.filter(msg => {
        return SMSParserService.isBankSMS(msg);
      });
      
      console.log('Bank SMS messages:', bankSMS);
      
      if (bankSMS.length === 0) {
        Alert.alert(
          'No Bank SMS Found',
          'The pasted text doesn\'t appear to contain bank SMS messages.\n\n' +
          'Please paste a transaction SMS from your bank that includes:\n' +
          '• Bank name\n' +
          '• Amount (Rs. or INR)\n' +
          '• Transaction type (debited/credited)\n' +
          '• Date'
        );
        setPreviewData([]);
        setIsParsing(false);
        return;
      }
      
      // Parse SMS using your service
      const parsed = SMSParserService.batchParseSMS(bankSMS);
      
      console.log('Parsed transactions:', parsed);
      
      if (!parsed || parsed.length === 0) {
        Alert.alert(
          'Could Not Parse',
          'We found SMS messages but couldn\'t extract transaction details.\n\n' +
          'Try using the "Try with Sample SMS" button to see if parsing works.'
        );
        setPreviewData([]);
        setIsParsing(false);
        return;
      }
      
      // Convert to PreviewTransaction format
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
        .filter(t => t.amount > 0); // Only include transactions with valid amounts

      setPreviewData(previewData);

      if (previewData.length === 0) {
        Alert.alert(
          'No Valid Transactions',
          'We found SMS messages but couldn\'t extract valid transaction details.\n\n' +
          'Please check if your SMS format is supported.'
        );
      } else {
        Alert.alert(
          'Success!',
          `Found ${previewData.length} transaction${previewData.length > 1 ? 's' : ''}. ` +
          'Review them below and tap "Import" to save.'
        );
      }
    } catch (error: any) {
      console.error('Error parsing SMS:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to parse SMS. Please try again with a different SMS.'
      );
      setPreviewData([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportTransactions = async () => {
    if (!previewData || previewData.length === 0 || !user?.uid) return;
    
    setIsImporting(true);
    try {
      // Prepare transactions for Firebase
      const transactionsForFirebase = previewData.map(t => ({
        amount: t.amount,
        category: t.category || "Other",
        description: t.description || "",
        type: t.type,
        date: t.date,
        source: 'sms' as const,
        merchant: t.merchant || "",
        paymentMethod: "", // You can extract this from SMS or leave empty
      }));

      console.log('Importing transactions:', transactionsForFirebase);

      // Import using your existing method
      await addTransactionsBatch(transactionsForFirebase, user.uid);
      
      Alert.alert(
        'Success! 🎉',
        `Successfully imported ${transactionsForFirebase.length} transaction${transactionsForFirebase.length > 1 ? 's' : ''}.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error importing transactions:', error);
      Alert.alert(
        'Import Error',
        error.message || 'Failed to import transactions. Please try again.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const clearAll = () => {
    setSmsText('');
    setPreviewData(null);
  };

  const handleUseSample = () => {
    const sampleText = SAMPLE_SMS.join('\n\n');
    setSmsText(sampleText);
    parseSMS(sampleText);
  };

  const removeTransaction = (index: number) => {
    if (!previewData) return;
    
    const newData = [...previewData];
    newData.splice(index, 1);
    setPreviewData(newData.length > 0 ? newData : null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1e1b4b', '#312e81'] : ['#4f46e5', '#6366f1']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {previewData ? 'Review SMS Import' : 'Import from SMS'}
          </Text>
          <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!previewData ? (
          <>
            {/* Instructions Card */}
            <BlurView 
              intensity={30} 
              tint={isDarkMode ? "dark" : "light"} 
              style={[
                styles.instructionCard,
                { backgroundColor: theme.card + '90' }
              ]}
            >
              <View style={styles.instructionIcon}>
                <Ionicons name="information-circle" size={28} color={theme.tint} />
              </View>
              <View style={styles.instructionContent}>
                <Text style={[styles.instructionTitle, { color: theme.text }]}>
                  How to Import from SMS
                </Text>
                <View style={styles.stepsContainer}>
                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Open your bank SMS
                    </Text>
                  </View>
                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Tap & hold to select all text
                    </Text>
                  </View>
                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Tap "Copy" or "Select All → Copy"
                    </Text>
                  </View>
                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.tint }]}>
                      <Text style={styles.stepNumberText}>4</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Return here and tap "Paste SMS"
                    </Text>
                  </View>
                </View>
              </View>
            </BlurView>

            {/* Quick Test Button */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.tint + '20', borderColor: theme.tint }]}
              onPress={handleUseSample}
            >
              <Ionicons name="flash" size={20} color={theme.tint} />
              <Text style={[styles.testButtonText, { color: theme.tint }]}>
                Try with Sample SMS
              </Text>
            </TouchableOpacity>

            {/* SMS Input Area */}
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
                  <View style={styles.smsPreviewHeader}>
                    <View style={styles.smsBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.tint} />
                      <Text style={[styles.smsBadgeText, { color: theme.tint }]}>
                        SMS Ready
                      </Text>
                    </View>
                    <Text style={[styles.smsCountText, { color: theme.subtext }]}>
                      {smsText.split('\n').filter(l => l.trim()).length} lines
                    </Text>
                  </View>
                  <Text style={[styles.smsText, { color: theme.text }]} numberOfLines={4}>
                    {smsText.substring(0, 200)}{smsText.length > 200 ? '...' : ''}
                  </Text>
                  <TouchableOpacity 
                    onPress={handlePasteSMS}
                    style={styles.pasteAgainButton}
                  >
                    <Ionicons name="clipboard-outline" size={20} color={theme.tint} />
                    <Text style={[styles.pasteAgainText, { color: theme.tint }]}>
                      Paste Again
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pastePlaceholder}>
                  <View style={[styles.clipboardIcon, { backgroundColor: theme.tint + '20' }]}>
                    <Ionicons name="clipboard-outline" size={44} color={theme.tint} />
                  </View>
                  <Text style={[styles.pastePlaceholderTitle, { color: theme.text }]}>
                    No SMS Pasted Yet
                  </Text>
                  <Text style={[styles.pastePlaceholderText, { color: theme.subtext }]}>
                    Tap here to paste SMS from clipboard
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Parse Button */}
            {smsText && !isParsing && (
              <TouchableOpacity
                style={[
                  styles.parseButton,
                  { backgroundColor: theme.tint }
                ]}
                onPress={() => parseSMS(smsText)}
                disabled={isParsing || !smsText}
              >
                <Ionicons name="search" size={22} color="white" />
                <Text style={styles.parseButtonText}>
                  Parse Transactions
                </Text>
              </TouchableOpacity>
            )}

            {isParsing && (
              <View style={styles.parsingContainer}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={[styles.parsingText, { color: theme.text }]}>
                  Parsing SMS messages...
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Preview Header */}
            <View style={styles.previewHeader}>
              <Text style={[styles.previewHeaderText, { color: theme.text }]}>
                {previewData.length} transactions ready to import
              </Text>
              <Text style={[styles.previewSubtext, { color: theme.subtext }]}>
                Tap any item to remove it
              </Text>
            </View>

            {/* Transactions List */}
            <View style={styles.transactionsList}>
              {previewData.map((item, index) => {
                const categoryIcon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS['Other'];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.previewItem,
                      { backgroundColor: theme.card, borderColor: theme.border }
                    ]}
                    onPress={() => removeTransaction(index)}
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
                      {item.merchant && (
                        <Text style={[styles.merchantText, { color: theme.tint }]}>
                          {item.merchant}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.previewAmount, { color: item.type === 'credit' ? '#10B981' : '#EF4444' }]}>
                      {item.type === 'credit' ? '+' : '-'}₹{item.amount.toFixed(0)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Import Button */}
            <TouchableOpacity
              style={[
                styles.importButton,
                { 
                  backgroundColor: theme.tint,
                  opacity: isImporting ? 0.7 : 1,
                }
              ]}
              onPress={handleImportTransactions}
              disabled={isImporting || !previewData || previewData.length === 0}
            >
              {isImporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={24} color="white" />
                  <Text style={styles.importButtonText}>
                    Import {previewData.length} Transaction{previewData.length > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              style={[styles.backButtonSecondary, { borderColor: theme.border }]}
              onPress={clearAll}
            >
              <Text style={[styles.backButtonText, { color: theme.text }]}>
                Back to SMS Paste
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  clearButton: {
    padding: 8,
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  instructionCard: {
    flexDirection: 'row',
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionIcon: {
    padding: 16,
    paddingRight: 0,
  },
  instructionContent: {
    flex: 1,
    padding: 16,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepsContainer: {
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  smsInputContainer: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: 180,
  },
  smsPreview: {
    padding: 20,
  },
  smsPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  smsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  smsCountText: {
    fontSize: 12,
  },
  smsText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  pasteAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  pasteAgainText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pastePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  clipboardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pastePlaceholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  pastePlaceholderText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
  },
  parseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  parsingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  parsingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  previewHeader: {
    marginTop: 20,
    marginBottom: 20,
  },
  previewHeaderText: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  previewSubtext: {
    fontSize: 13,
    fontWeight: '600',
  },
  transactionsList: {
    gap: 12,
    marginBottom: 24,
  },
  previewItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLeft: {
    flex: 1,
  },
  previewDesc: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewSub: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  merchantText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewAmount: {
    fontSize: 17,
    fontWeight: '900',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    marginBottom: 16,
  },
  importButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  backButtonSecondary: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});