// SmartBudget/app/modal-premium.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, Dimensions, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeStore } from './_lib/useThemeStore';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

const GRADIENTS = {
  primary: ['#6366F1', '#8B5CF6'] as const,
  success: ['#10B981', '#059669'] as const,
  warning: ['#F59E0B', '#D97706'] as const,
  info: ['#0EA5E9', '#3B82F6'] as const,
  purple: ['#8B5CF6', '#7C3AED'] as const,
};

export default function PremiumModalScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const actions = [
    {
      title: 'Manual Entry',
      description: 'Add a single expense or income',
      icon: 'add-circle',
      gradient: GRADIENTS.primary,
      href: '/add-transaction',
    },
    {
      title: 'Import CSV',
      description: 'Bulk upload from bank statements',
      icon: 'document-text',
      gradient: GRADIENTS.success,
      href: '/import-screen',
    },
    {
      title: 'Quick Budget',
      description: 'Set spending limits instantly',
      icon: 'pie-chart',
      gradient: GRADIENTS.warning,
      href: '/(tabs)/budget',
    },
    {
      title: 'AI Assistant',
      description: 'Get personalized financial advice',
      icon: 'sparkles',
      gradient: GRADIENTS.purple,
      href: '/buddy-ai',
    },
  ];

  const handlePress = (href: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.dismiss();
    router.push(href as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
        activeOpacity={1}
      />
      
      <MotiView
        from={{ opacity: 0, translateY: 100 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0, translateY: 100 }}
        transition={{ type: 'timing', duration: 300 }}
        style={[styles.modalContent, { backgroundColor: theme.background }]}
      >
        {/* Handle Bar */}
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Quick Actions</Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>
              What would you like to do?
            </Text>
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.grid}>
          {actions.map((action, index) => (
            <MotiView
              key={index}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 100, type: 'spring', damping: 15 }}
              style={styles.cardWrapper}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handlePress(action.href)}
              >
                <LinearGradient
                  colors={action.gradient}
                  style={styles.actionCard}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.iconCircle}>
                      <Ionicons name={action.icon as any} size={28} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{action.title}</Text>
                      <Text style={styles.cardDesc}>{action.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Close Button */}
        <MotiView 
          from={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 500 }}
          style={styles.footer}
        >
          <TouchableOpacity 
            style={[styles.closeBtn, { backgroundColor: theme.card }]} 
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
          >
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </MotiView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  actionCard: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  closeBtn: {
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});