// SmartBudget/components/PremiumCard.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Colors } from '../constants/theme';
import { useThemeStore } from '../app/_lib/useThemeStore';

interface PremiumCardProps {
  children: React.ReactNode;
  gradient?: string[];
  variant?: 'solid' | 'gradient' | 'glass';
  style?: ViewStyle;
  delay?: number;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ 
  children, 
  gradient, 
  variant = 'solid',
  style,
  delay = 0 
}) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  if (variant === 'gradient' && gradient) {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15, delay }}
      >
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, theme.shadow.large, style]}
        >
          {children}
        </LinearGradient>
      </MotiView>
    );
  }

  if (variant === 'glass') {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15, delay }}
        style={[
          styles.card,
          { 
            backgroundColor: theme.glassBackground,
            borderWidth: 1,
            borderColor: theme.glassBorder,
            overflow: 'hidden'
          },
          theme.shadow.medium,
          style
        ]}
      >
        {children}
      </MotiView>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 15, delay }}
      style={[
        styles.card,
        { backgroundColor: theme.card },
        theme.shadow.medium,
        style
      ]}
    >
      {children}
    </MotiView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
  }
});