// SmartBudget/app/receipt-scanner.tsx
// 📸 SIMPLIFIED RECEIPT SCANNER - Single Transaction Per Receipt
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

import { useThemeStore } from './_lib/useThemeStore';
import { useAuthStore } from './_lib/useAuthStore';
import { useTransactionStore } from './_lib/useTransactionStore';
import { Colors } from '../constants/theme';
import { receiptScannerService, ReceiptData, LineItem } from '../src/services/receiptScannerService';

export default function ReceiptScannerScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const user = useAuthStore((state) => state.user);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const [scanning, setScanning] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setImageUri(result.assets[0].uri);
      await scanReceipt(result.assets[0].uri);
    }
  };

  const scanReceipt = async (uri: string) => {
    setScanning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await receiptScannerService.scanReceipt(uri);

      if (result.success && result.data) {
        setReceiptData(result.data);
        setShowConfirmModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Scan Failed', result.error || 'Could not read receipt');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan receipt');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScanning(false);
    }
  };

  const saveTransaction = async () => {
    if (!user?.uid || !receiptData) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const item = receiptData.lineItems[0];

      // Create single transaction for the receipt
      await addTransaction({
        amount: -receiptData.totalAmount,
        category: item.category,
        description: item.name,
        type: 'debit',
        date: receiptData.date || new Date(),
      }, user.uid);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Success!', 
        `Added receipt for ₹${receiptData.totalAmount.toFixed(2)}`, 
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
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
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Scan Receipt</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* INSTRUCTIONS */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[styles.instructionCard, { backgroundColor: theme.card }]}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6'] as const}
              style={styles.instructionIcon}
            >
              <Ionicons name="receipt" size={32} color="white" />
            </LinearGradient>
            <Text style={[styles.instructionTitle, { color: theme.text }]}>
              Smart Receipt Scanner
            </Text>
            <Text style={[styles.instructionText, { color: theme.subtext }]}>
              Scan your receipt to automatically extract merchant and total amount
            </Text>
          </MotiView>

          {/* SCANNING INDICATOR */}
          {scanning && (
            <View style={[styles.scanningCard, { backgroundColor: theme.card }]}>
              <ActivityIndicator size="large" color={theme.tint} />
              <Text style={[styles.scanningText, { color: theme.text }]}>
                Analyzing receipt...
              </Text>
              <Text style={[styles.scanningSubtext, { color: theme.subtext }]}>
                Reading text from image
              </Text>
            </View>
          )}

          {/* IMAGE PREVIEW */}
          {imageUri && !scanning && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={[styles.previewCard, { backgroundColor: theme.card }]}
            >
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            </MotiView>
          )}

          {/* ACTION BUTTONS */}
          {!scanning && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 100 }}
            >
              <TouchableOpacity
                onPress={pickImage}
                style={styles.actionButton}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6', '#A855F7'] as const}
                  style={styles.actionGradient}
                >
                  <Ionicons name="images" size={28} color="white" />
                  <Text style={styles.actionText}>Choose Receipt from Gallery</Text>
                </LinearGradient>
              </TouchableOpacity>
            </MotiView>
          )}
        </ScrollView>

        {/* CONFIRMATION MODAL */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowConfirmModal(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              {/* Header with Icon */}
              <View style={styles.modalHeaderSection}>
                <LinearGradient
                  colors={['#10B981', '#059669'] as const}
                  style={styles.successIconCircle}
                >
                  <Ionicons name="checkmark-circle" size={32} color="white" />
                </LinearGradient>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Receipt Scanned Successfully
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>
                  Review the details below
                </Text>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close-circle" size={28} color={theme.subtext} />
                </TouchableOpacity>
              </View>

              {/* Receipt Details Card */}
              <View style={[styles.detailsCard, { backgroundColor: theme.background }]}>
                {/* Merchant */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrapper}>
                    <LinearGradient
                      colors={['#6366F1', '#8B5CF6'] as const}
                      style={styles.detailIcon}
                    >
                      <Ionicons name="storefront" size={18} color="white" />
                    </LinearGradient>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme.subtext }]}>Merchant</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {receiptData?.merchant}
                    </Text>
                  </View>
                </View>

                {/* Date */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrapper}>
                    <LinearGradient
                      colors={['#F59E0B', '#D97706'] as const}
                      style={styles.detailIcon}
                    >
                      <Ionicons name="calendar" size={18} color="white" />
                    </LinearGradient>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme.subtext }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {receiptData?.date ? formatDate(receiptData.date) : 'Today'}
                    </Text>
                  </View>
                </View>

                {/* Category */}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrapper}>
                    <LinearGradient
                      colors={['#EC4899', '#F472B6'] as const}
                      style={styles.detailIcon}
                    >
                      <Ionicons name="pricetag" size={18} color="white" />
                    </LinearGradient>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme.subtext }]}>Category</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {receiptData?.lineItems[0]?.category}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Total Amount Card */}
              <View style={[styles.totalCard, { backgroundColor: theme.background }]}>
                <LinearGradient
                  colors={['#10B981', '#059669'] as const}
                  style={styles.totalAmountGradient}
                >
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    ₹{receiptData?.totalAmount.toFixed(2)}
                  </Text>
                </LinearGradient>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={[styles.cancelBtn, { backgroundColor: theme.background }]}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={saveTransaction} 
                  style={styles.addBtn}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669'] as const}
                    style={styles.addBtnGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.addBtnText}>Add to Transactions</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
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
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  content: { padding: 20 },
  instructionCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  instructionIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  instructionText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  scanningCard: { padding: 40, borderRadius: 24, alignItems: 'center', marginBottom: 20 },
  scanningText: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  scanningSubtext: { fontSize: 14, marginTop: 8 },
  previewCard: { padding: 12, borderRadius: 20, marginBottom: 20 },
  previewImage: { width: '100%', height: 300, borderRadius: 16 },
  actionButton: { marginBottom: 16, borderRadius: 20, overflow: 'hidden' },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 64, gap: 12 },
  actionText: { color: 'white', fontSize: 18, fontWeight: '900' },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24,
    paddingBottom: 32,
  },
  modalHeaderSection: { 
    alignItems: 'center', 
    marginBottom: 24,
    position: 'relative',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    textAlign: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  
  detailsCard: { 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 16,
    gap: 16,
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  detailIconWrapper: {
    marginRight: 14,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: { 
    fontSize: 12, 
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: { 
    fontSize: 16, 
    fontWeight: '800',
  },
  
  totalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  totalAmountGradient: {
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: { 
    fontSize: 14, 
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: { 
    fontSize: 36, 
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1,
  },
  
  modalActions: { 
    flexDirection: 'row', 
    gap: 12,
  },
  cancelBtn: { 
    flex: 1, 
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { 
    fontSize: 16, 
    fontWeight: '800',
  },
  addBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16,
    gap: 8,
  },
  addBtnText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '800',
  },
});