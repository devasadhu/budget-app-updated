// SmartBudget/app/(tabs)/profile.tsx
// 🎨 PROFILE SCREEN - WITH NEW EXPO FILESYSTEM API
import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Share,
  Switch, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useAuthStore } from '../_lib/useAuthStore'; 
import { useTransactionStore } from '../_lib/useTransactionStore';
import { useBudgetStore } from '../_lib/useBudgetStore';
import { useThemeStore } from '../_lib/useThemeStore';
import { Colors } from '../../constants/theme';

interface SettingItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  isDestructive?: boolean;
  value?: string;
  children?: React.ReactNode;
  theme: any; 
  isLast?: boolean;
  delay?: number;
  iconGradient?: readonly [string, string, ...string[]];
}

const SettingItem = ({ 
  icon, 
  label, 
  onPress, 
  isDestructive, 
  value, 
  children, 
  theme, 
  isLast, 
  delay = 0,
  iconGradient 
}: SettingItemProps) => (
  <MotiView
    from={{ opacity: 0, translateX: -20 }}
    animate={{ opacity: 1, translateX: 0 }}
    transition={{ type: 'timing', duration: 400, delay }}
  >
    <TouchableOpacity 
      style={[
        styles.settingItem, 
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border }
      ]} 
      onPress={() => {
        if (onPress) {
          Haptics.selectionAsync();
          onPress();
        }
      }} 
      activeOpacity={0.7}
      disabled={!!children} 
    >
      <View style={styles.settingLeft}>
        <LinearGradient
          colors={isDestructive ? ['#EF4444', '#DC2626'] as const : iconGradient || ['#6366F1', '#8B5CF6', '#A855F7'] as const}
          style={styles.settingIcon}
        >
          <Ionicons 
            name={icon as any} 
            size={20} 
            color="white"
          />
        </LinearGradient>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {value && <Text style={[styles.settingValue, { color: theme.subtext }]}>{value}</Text>}
        {children ? children : <Ionicons name="chevron-forward" size={18} color={theme.subtext} />}
      </View>
    </TouchableOpacity>
  </MotiView>
);

export default function PremiumProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { transactions, clearTransactions } = useTransactionStore();
  const budgets = useBudgetStore((state) => state.budgets);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const userName = user?.displayName || user?.email?.split("@")[0] || "Buddy User";
  const userEmail = user?.email || "hello@smartbudget.com";

  // Days Active Logic - Count unique days with transactions
  const daysActive = React.useMemo(() => {
    if (transactions.length === 0) return 0;
    try {
      // Get unique dates (ignoring time)
      const uniqueDates = new Set(
        transactions.map(t => {
          const date = t.date instanceof Date ? t.date : new Date(t.date);
          return date.toDateString(); // "Mon Jan 13 2025"
        })
      );
      return uniqueDates.size;
    } catch { 
      return 0; 
    }
  }, [transactions]);

  // ✅ NEW EXPO FILE SYSTEM API - CSV EXPORT
  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("No Data", "Add some transactions first.");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Build CSV content
      let csvContent = "Date,Description,Category,Amount,Type\n";
      const sortedTransactions = [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      sortedTransactions.forEach(t => {
        const d = new Date(t.date).toLocaleDateString('en-GB');
        const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
        const cat = `"${(t.category || '').replace(/"/g, '""')}"`;
        const amt = Math.abs(t.amount).toFixed(2);
        const type = t.type === 'credit' ? 'Income' : 'Expense';
        csvContent += `${d},${desc},${cat},${amt},${type}\n`;
      });

      const fileName = `SmartBudget_Export_${new Date().toISOString().split('T')[0]}.csv`;
      
      // ✅ NEW API: Create file using File class
      const file = new File(Paths.cache, fileName);
      
      console.log('📁 Writing CSV to:', file.uri);

      // ✅ NEW API: Write using File.write()
      await file.write(csvContent);

      console.log('✅ File written successfully');

      // ✅ Check sharing availability and share
      const sharingAvailable = await Sharing.isAvailableAsync();
      console.log('📤 Sharing available:', sharingAvailable);

      if (sharingAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions',
          UTI: 'public.comma-separated-values-text'
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('🎉 Share dialog opened');
      } else {
        Alert.alert(
          "Export Successful", 
          `File saved to:\n${file.uri}`,
          [{ text: "OK" }]
        );
      }

    } catch (error: any) {
      console.error('❌ Export error:', error);
      Alert.alert(
        "Export Failed", 
        `Error: ${error.message}\n\nPlease try again or check app permissions.`
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDeleteData = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      "Delete All Data", 
      "This will wipe your entire transaction history. Are you sure?", 
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive", 
          onPress: async () => {
            await clearTransactions(user?.uid!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "All data cleared.");
          } 
        }
      ]
    );
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        } 
      }
    ]);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: "Check out SmartBudget - The best personal finance tracker! 💰📊",
        title: "SmartBudget App",
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const navigateToGamification = () => {
    router.push('/gamification' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* PROFILE HEADER */}
          <MotiView 
            from={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.profileHeader}
          >
            <LinearGradient
              colors={isDarkMode ? ['#4F46E5', '#7C3AED', '#C084FC'] as const : ['#6366F1', '#8B5CF6', '#A855F7'] as const}
              style={styles.avatarContainer}
            >
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
            </LinearGradient>
            <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
            <Text style={[styles.userEmail, { color: theme.subtext }]}>{userEmail}</Text>
          </MotiView>

          {/* STATS GRID */}
          <View style={styles.statsGrid}>
            <MotiView 
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600, delay: 100 }}
              style={[styles.statCard, { backgroundColor: theme.card }]}
            >
              <LinearGradient
                colors={['#0EA5E9', '#3B82F6'] as const}
                style={styles.statIconCircle}
              >
                <Ionicons name="swap-horizontal" size={20} color="white" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>{transactions.length}</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Transactions</Text>
            </MotiView>

            <MotiView 
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600, delay: 200 }}
              style={[styles.statCard, { backgroundColor: theme.card }]}
            >
              <LinearGradient
                colors={['#10B981', '#059669'] as const}
                style={styles.statIconCircle}
              >
                <Ionicons name="pie-chart" size={20} color="white" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>{budgets.length}</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Budgets</Text>
            </MotiView>

            <MotiView 
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600, delay: 300 }}
              style={[styles.statCard, { backgroundColor: theme.card }]}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706'] as const}
                style={styles.statIconCircle}
              >
                <Ionicons name="calendar" size={20} color="white" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>{daysActive}</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Days Active</Text>
            </MotiView>
          </View>

          {/* APPEARANCE */}
          <Text style={[styles.groupTitle, { color: theme.subtext }]}>APPEARANCE</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card }]}>
            <SettingItem 
              theme={theme} 
              icon="moon-outline" 
              label="Dark Mode" 
              isLast
              delay={400}
              iconGradient={['#6366F1', '#8B5CF6', '#A855F7'] as const}
            >
              <Switch 
                value={isDarkMode} 
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                trackColor={{ false: "#CBD5E1", true: theme.tint }}
                thumbColor={"#FFFFFF"}
              />
            </SettingItem>
          </View>

          {/* FEATURES */}
          <Text style={[styles.groupTitle, { color: theme.subtext }]}>FEATURES</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card }]}>
            <SettingItem 
              theme={theme} 
              icon="trophy" 
              label="Achievements & Badges"
              onPress={navigateToGamification}
              delay={500}
              iconGradient={['#F59E0B', '#D97706'] as const}
            />
            <SettingItem 
              theme={theme} 
              icon="chatbubble-ellipses-outline" 
              label="Chat with Buddy AI"
              onPress={() => router.push('/buddy-ai' as any)}
              isLast
              delay={550}
              iconGradient={['#818CF8', '#C084FC'] as const}
            />
          </View>

          {/* DATA MANAGEMENT */}
          <Text style={[styles.groupTitle, { color: theme.subtext }]}>DATA MANAGEMENT</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card }]}>
            <SettingItem 
              theme={theme} 
              icon="cloud-download-outline" 
              label="Export to CSV" 
              onPress={handleExportCSV}
              delay={600}
              iconGradient={['#10B981', '#059669'] as const}
            />
            <SettingItem 
              theme={theme} 
              icon="cloud-upload-outline" 
              label="Import Transactions" 
              onPress={() => router.push('/import-screen' as any)}
              delay={650}
              iconGradient={['#0EA5E9', '#3B82F6'] as const}
            />
            <SettingItem 
              theme={theme} 
              icon="trash-outline" 
              label="Delete All Data" 
              isDestructive 
              isLast 
              onPress={handleDeleteData}
              delay={700}
            />
          </View>

          {/* COMMUNITY */}
          <Text style={[styles.groupTitle, { color: theme.subtext }]}>COMMUNITY</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card }]}>
            <SettingItem 
              theme={theme} 
              icon="share-social-outline" 
              label="Share SmartBudget"
              onPress={handleShareApp}
              isLast
              delay={750}
              iconGradient={['#EC4899', '#F472B6'] as const}
            />
          </View>

          {/* LOGOUT */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 600, delay: 800 }}
          >
            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={handleLogout}
            >
              <LinearGradient
                colors={['#FEE2E2', '#FEE2E2'] as const}
                style={styles.logoutGradient}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>

          <View style={styles.footerInfo}>
            <Text style={[styles.versionText, { color: theme.subtext }]}>SmartBudget Premium</Text>
            <Text style={[styles.versionText, { color: theme.subtext, opacity: 0.5 }]}>
              Version 2.0.0 • Made with ❤️
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 140,
    paddingHorizontal: 20
  },
  profileHeader: { 
    alignItems: 'center', 
    marginBottom: 30 
  },
  avatarContainer: { 
    position: 'relative',
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 4, 
    borderColor: '#FFFFFF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 16, 
    elevation: 12 
  },
  avatarText: { 
    color: 'white', 
    fontSize: 42, 
    fontWeight: '900', 
    letterSpacing: -1 
  },
  premiumBadge: { 
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3, 
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  userName: { 
    fontSize: 26, 
    fontWeight: "900", 
    marginTop: 16, 
    letterSpacing: -0.8 
  },
  userEmail: { 
    fontSize: 14, 
    marginTop: 4, 
    fontWeight: '600' 
  },

  statsGrid: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 30 
  },
  statCard: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 20, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  statIconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { 
    fontSize: 24, 
    fontWeight: "900", 
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    textAlign: 'center' 
  },

  groupTitle: { 
    fontSize: 12, 
    fontWeight: "800", 
    marginBottom: 12, 
    marginLeft: 16, 
    textTransform: 'uppercase', 
    letterSpacing: 1.3,
    marginTop: 8
  },
  groupCard: { 
    borderRadius: 24, 
    paddingHorizontal: 16, 
    marginBottom: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 12, 
    elevation: 2 
  },

  settingItem: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingVertical: 16 
  },
  settingLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  settingIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLabel: { 
    fontSize: 16, 
    fontWeight: "700", 
    flex: 1 
  },
  settingValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginRight: 8 
  },

  logoutBtn: { 
    borderRadius: 20, 
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  logoutGradient: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 58, 
    gap: 10,
  },
  logoutBtnText: { 
    color: "#EF4444", 
    fontSize: 16, 
    fontWeight: "800" 
  },

  footerInfo: { 
    alignItems: 'center', 
    marginTop: 32, 
    marginBottom: 20 
  },
  versionText: { 
    fontSize: 12, 
    fontWeight: '700', 
    marginBottom: 4 
  }
});