// SmartBudget/app/(tabs)/_layout.tsx
// 🎨 MINIMALIST TAB LAYOUT - 4 CORE TABS ONLY

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { useThemeStore } from '../_lib/useThemeStore';
import { Colors } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// 🌟 PREMIUM TAB BAR ICON
const TabBarIcon = ({ name, color, focused }: { name: any; color: string; focused: boolean }) => (
  <View style={{ position: 'relative' }}>
    {focused && (
      <View style={[styles.activeIndicator, { backgroundColor: color + '20' }]}>
        <LinearGradient
          colors={[color + '40', color + '00'] as const}
          style={StyleSheet.absoluteFill}
        />
      </View>
    )}
    <Ionicons 
      name={name} 
      size={focused ? 28 : 24} 
      color={color}
      style={{ zIndex: 1 }}
    />
  </View>
);

export default function MinimalistTabLayout() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.subtext,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
          letterSpacing: 0.3,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          bottom: Platform.OS === 'ios' ? 35 : 25,
          left: 20,
          right: 20,
          height: 68,
          borderRadius: 24,
          paddingBottom: 12,
          paddingTop: 12,
          paddingHorizontal: 8,
          ...theme.shadow.large,
          overflow: 'hidden',
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDarkMode ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null
        ),
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          )
        }} 
      />
      
      {/* Activity Tab */}
      <Tabs.Screen 
        name="activity" 
        options={{ 
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "flash" : "flash-outline"} color={color} focused={focused} />
          )
        }} 
      />
      
      {/* Budget Tab */}
      <Tabs.Screen 
        name="budget" 
        options={{ 
          title: 'Budget',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "pie-chart" : "pie-chart-outline"} color={color} focused={focused} />
          )
        }} 
      />
      
      {/* Insights Tab */}
      <Tabs.Screen 
        name="insights" 
        options={{ 
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "analytics" : "analytics-outline"} color={color} focused={focused} />
          )
        }} 
      />

      {/* HIDDEN SCREENS - Not in tab bar but still accessible */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="transactions" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    top: -11,
    left: -11,
  },
});