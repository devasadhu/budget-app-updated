import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

import { useThemeStore } from './_lib/useThemeStore';
import { useAuthStore } from './_lib/useAuthStore';
import { useTransactionStore } from './_lib/useTransactionStore';
import { Colors } from '../constants/theme';
import { pdfParserService, ParsedTransaction } from '../src/services/pdfParserService';

export default function PDFImportScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const user = useAuthStore((state) => state.user);
  
  // Get both the action and the fetcher to solve the frontend delay
  const addTransactionsBatch = useTransactionStore((state) => state.addTransactionsBatch);
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions);

  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  const [parsedData, setParsedData] = useState<{
    transactions: ParsedTransaction[];
    bankName?: string;
    statementPeriod?: string;
    parseMethod: string;
    processingTime: number;
  } | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsParsing(true);
      setParseProgress('Reading PDF...');

      const pdfUri = result.assets[0].uri;

      const parseResult = await pdfParserService.parseBankStatement(
        pdfUri,
        (message: string) => setParseProgress(message)
      );

      setIsParsing(false);
      setParseProgress('');

      if (!parseResult || !parseResult.success) {
        Alert.alert('Import Failed', parseResult?.error || 'Could not parse PDF');
        return;
      }

      setParsedData({
        transactions: parseResult.transactions,
        bankName: parseResult.bankName,
        statementPeriod: parseResult.statementPeriod,
        parseMethod: parseResult.parseMethod,
        processingTime: parseResult.processingTime,
      });

      const allIndices = new Set(parseResult.transactions.map((_, i) => i));
      setSelectedTransactions(allIndices);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (error) {
      setIsParsing(false);
      setParseProgress('');
      console.error(error);
      Alert.alert('Error', 'An unexpected error occurred during parsing.');
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
    if (!parsedData) return;
    Haptics.selectionAsync();
    if (selectedTransactions.size === parsedData.transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      const allIndices = new Set(parsedData.transactions.map((_, i) => i));
      setSelectedTransactions(allIndices);
    }
  };

  const confirmImport = async () => {
    if (!parsedData || !user?.uid) return;

    const toImport = parsedData.transactions
      .filter((_, i) => selectedTransactions.has(i))
      .map(t => ({
        amount: t.amount,
        description: t.description,
        category: t.category || 'Other',
        type: t.type,
        date: t.date,
      }));

    if (toImport.length === 0) {
      Alert.alert('Selection Empty', 'Please select transactions to import.');
      return;
    }

    setIsParsing(true);
    setParseProgress('Syncing with Cloud...');

    try {
      // 1. Perform the batch write
      await addTransactionsBatch(toImport, user.uid);
      
      // 2. Force refresh the store immediately to update the frontend state
      await fetchTransactions(user.uid);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 3. Navigate using replace to force the dashboard to reflect new totals
      Alert.alert('Success', `Imported ${toImport.length} transactions.`, [
        { 
          text: 'OK', 
          onPress: () => router.replace('/(tabs)') 
        }
      ]);
    } catch (error) {
      console.error("Batch Import Error:", error);
      Alert.alert('Import Error', 'Data was saved but frontend might take a moment to sync.');
    } finally {
      setIsParsing(false);
      setParseProgress('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }]}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {parsedData ? 'Review Transactions' : 'Import Statement'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {!parsedData ? (
          <ScrollView contentContainerStyle={styles.content}>
            <MotiView 
              from={{ opacity: 0, translateY: 20 }} 
              animate={{ opacity: 1, translateY: 0 }} 
              style={[styles.instructionCard, { backgroundColor: theme.card }]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${theme.tint}20` }]}>
                <Ionicons name="document-text" size={40} color={theme.tint} />
              </View>
              <Text style={[styles.instructionTitle, { color: theme.text }]}>PDF Bank Import</Text>
              <Text style={[styles.instructionText, { color: theme.subtext }]}>
                Securely extract transactions from your bank statement. Supported: HDFC, ICICI, SBI.
              </Text>
            </MotiView>

            {isParsing ? (
              <View style={[styles.parsingCard, { backgroundColor: theme.card }]}>
                <ActivityIndicator size="large" color={theme.tint} />
                <Text style={[styles.parsingText, { color: theme.text }]}>{parseProgress}</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.uploadButton, { backgroundColor: theme.tint }]} onPress={handleFilePicker}>
                <Ionicons name="cloud-upload" size={28} color="white" />
                <Text style={styles.uploadButtonText}>Choose PDF</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={[styles.statementInfo, { backgroundColor: theme.card }]}>
              <View style={styles.infoRow}>
                <Ionicons name="business" size={20} color={theme.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: theme.subtext }]}>Bank Detected</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{parsedData.bankName || 'Unknown Bank'}</Text>
                </View>
                <TouchableOpacity onPress={toggleAll} style={styles.selectAllBtn}>
                  <Text style={{ color: theme.tint, fontWeight: '800' }}>
                    {selectedTransactions.size === parsedData.transactions.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={parsedData.transactions}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item, index }) => {
                const isSelected = selectedTransactions.has(index);
                return (
                  <TouchableOpacity
                    onPress={() => toggleTransaction(index)}
                    activeOpacity={0.7}
                    style={[styles.transactionItem, { 
                      backgroundColor: theme.card, 
                      borderColor: isSelected ? theme.tint : 'transparent',
                      borderWidth: 2,
                      opacity: isSelected ? 1 : 0.6
                    }]}
                  >
                    <View style={[styles.checkbox, { 
                      backgroundColor: isSelected ? theme.tint : 'transparent', 
                      borderColor: isSelected ? theme.tint : theme.border 
                    }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txnDesc, { color: theme.text }]} numberOfLines={1}>{item.description}</Text>
                      <Text style={[styles.txnSub, { color: theme.subtext }]}>{item.date.toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: item.type === 'credit' ? '#10B981' : '#EF4444' }]}>
                      {item.type === 'credit' ? '+' : '-'}₹{item.amount.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
              <TouchableOpacity style={[styles.footerBtn, { flex: 1 }]} onPress={() => setParsedData(null)}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.footerBtn, { backgroundColor: theme.tint, flex: 2, opacity: selectedTransactions.size === 0 ? 0.5 : 1 }]} 
                onPress={confirmImport}
                disabled={selectedTransactions.size === 0 || isParsing}
              >
                {isParsing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '900' }}>Import {selectedTransactions.size} Items</Text>
                )}
              </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: '900' },
  content: { padding: 20 },
  instructionCard: { padding: 30, borderRadius: 24, alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 70, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  instructionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 5 },
  instructionText: { fontSize: 14, textAlign: 'center', opacity: 0.7, lineHeight: 20 },
  parsingCard: { padding: 40, borderRadius: 24, alignItems: 'center' },
  parsingText: { marginTop: 15, fontWeight: '700' },
  uploadButton: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  uploadButtonText: { color: 'white', fontSize: 16, fontWeight: '900' },
  statementInfo: { padding: 20, marginHorizontal: 20, borderRadius: 20, marginTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  infoLabel: { fontSize: 12, opacity: 0.6 },
  infoValue: { fontSize: 15, fontWeight: '800' },
  selectAllBtn: { padding: 10 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 10, gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 15, fontWeight: '700' },
  txnSub: { fontSize: 12, opacity: 0.6 },
  txnAmount: { fontSize: 16, fontWeight: '900' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 20, gap: 15, borderTopWidth: 1, paddingBottom: 35 },
  footerBtn: { height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});