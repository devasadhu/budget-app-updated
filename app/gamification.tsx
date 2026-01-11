// SmartBudget/app/gamification.tsx
// 🎮 GAMIFICATION DASHBOARD - Streaks, Badges, Achievements, Leaderboard
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import Svg, { Circle } from 'react-native-svg';

import { useGamificationStore, Badge, Achievement, DailyChallenge } from './_lib/useGamificationStore';
import { useAuthStore } from './_lib/useAuthStore';
import { useThemeStore } from './_lib/useThemeStore';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

// 🔥 STREAK CARD
const StreakCard = ({ currentStreak, longestStreak, theme }: any) => (
  <LinearGradient
    colors={['#EF4444', '#F97316'] as const}
    style={[styles.streakCard, { shadowColor: '#EF4444' }]}
  >
    <View style={styles.streakIcon}>
      <Ionicons name="flame" size={40} color="white" />
    </View>
    <View style={styles.streakContent}>
      <Text style={styles.streakNumber}>{currentStreak}</Text>
      <Text style={styles.streakLabel}>Day Streak</Text>
      <Text style={styles.streakRecord}>🏆 Best: {longestStreak} days</Text>
    </View>
  </LinearGradient>
);

// 🎖️ BADGE CARD
const BadgeCard = ({ badge, theme, index }: { badge: Badge; theme: any; index: number }) => {
  const progress = badge.progress || 0;
  const size = 90;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (circumference * progress) / 100;
  const isUnlocked = progress >= 100;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 100, type: 'spring' }}
      style={[styles.badgeCard, { backgroundColor: theme.card }]}
    >
      <View style={styles.badgeCircleContainer}>
        <Svg width={size} height={size}>
          <Circle
            stroke={theme.border}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={badge.color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.badgeIconContainer}>
          <LinearGradient
            colors={isUnlocked ? [badge.color, badge.color] : ['#94A3B8', '#64748B'] as const}
            style={styles.badgeIconGradient}
          >
            <Ionicons
              name={badge.icon as any}
              size={32}
              color="white"
            />
          </LinearGradient>
        </View>
      </View>
      <Text style={[styles.badgeName, { color: theme.text }]}>{badge.name}</Text>
      <Text style={[styles.badgeDescription, { color: theme.subtext }]} numberOfLines={2}>
        {badge.description}
      </Text>
      {!isUnlocked && badge.requirement && (
        <Text style={[styles.badgeProgress, { color: badge.color }]}>
          {Math.round(progress)}% Complete
        </Text>
      )}
      {isUnlocked && (
        <View style={[styles.unlockedBadge, { backgroundColor: badge.color + '20' }]}>
          <Ionicons name="checkmark-circle" size={16} color={badge.color} />
          <Text style={[styles.unlockedText, { color: badge.color }]}>Unlocked!</Text>
        </View>
      )}
    </MotiView>
  );
};

// 🏆 ACHIEVEMENT CARD
const AchievementCard = ({ achievement, theme, index }: { achievement: Achievement; theme: any; index: number }) => {
  const categoryColors: any = {
    budget: '#8B5CF6',
    savings: '#10B981',
    streak: '#EF4444',
    transactions: '#0EA5E9',
    special: '#F59E0B',
  };

  const color = categoryColors[achievement.category] || '#64748B';

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ delay: index * 80 }}
      style={[
        styles.achievementCard,
        { backgroundColor: theme.card },
        achievement.unlocked && { borderLeftWidth: 4, borderLeftColor: color },
      ]}
    >
      <LinearGradient
        colors={achievement.unlocked ? [color, color] : ['#94A3B8', '#64748B'] as const}
        style={styles.achievementIcon}
      >
        <Ionicons name={achievement.icon as any} size={24} color="white" />
      </LinearGradient>
      <View style={styles.achievementContent}>
        <Text style={[styles.achievementTitle, { color: theme.text }]}>
          {achievement.title}
        </Text>
        <Text style={[styles.achievementDescription, { color: theme.subtext }]}>
          {achievement.description}
        </Text>
        <View style={styles.achievementFooter}>
          <View style={[styles.pointsBadge, { backgroundColor: color + '20' }]}>
            <Ionicons name="star" size={12} color={color} />
            <Text style={[styles.pointsText, { color }]}>+{achievement.points}</Text>
          </View>
          {achievement.unlocked && achievement.unlockedAt && (
            <Text style={[styles.unlockedDate, { color: theme.subtext }]}>
              {new Date(achievement.unlockedAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>
      </View>
      {achievement.unlocked && (
        <View style={styles.achievementCheck}>
          <Ionicons name="checkmark-circle" size={28} color={color} />
        </View>
      )}
    </MotiView>
  );
};

// 📋 DAILY CHALLENGE CARD
const ChallengeCard = ({ challenge, onComplete, theme, index }: any) => (
  <MotiView
    from={{ opacity: 0, translateY: 10 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ delay: index * 100 }}
  >
    <TouchableOpacity
      style={[
        styles.challengeCard,
        { backgroundColor: theme.card },
        challenge.completed && styles.challengeCompleted,
      ]}
      onPress={() => !challenge.completed && onComplete(challenge.id)}
      disabled={challenge.completed}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={challenge.completed ? ['#10B981', '#059669'] : ['#6366F1', '#8B5CF6'] as const}
        style={styles.challengeIcon}
      >
        <Ionicons name={challenge.icon as any} size={20} color="white" />
      </LinearGradient>
      <View style={styles.challengeContent}>
        <Text style={[styles.challengeTitle, { color: theme.text }]}>
          {challenge.title}
        </Text>
        <Text style={[styles.challengeDescription, { color: theme.subtext }]}>
          {challenge.description}
        </Text>
      </View>
      <View style={styles.challengeRight}>
        <View style={[styles.challengePoints, { backgroundColor: '#F59E0B20' }]}>
          <Text style={styles.challengePointsText}>+{challenge.points}</Text>
        </View>
        {challenge.completed && (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        )}
      </View>
    </TouchableOpacity>
  </MotiView>
);

// 📊 MAIN SCREEN
export default function GamificationScreen() {
  const user = useAuthStore((state) => state.user);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const {
    stats,
    badges,
    achievements,
    dailyChallenges,
    initialize,
    completeDailyChallenge,
  } = useGamificationStore();

  useEffect(() => {
    if (user?.uid) {
      initialize(user.uid);
    }
  }, [user?.uid]);

  const levelProgress = ((stats.totalPoints % 500) / 500) * 100;
  const pointsToNextLevel = 500 - (stats.totalPoints % 500);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Achievements</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* LEVEL & POINTS CARD */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[styles.levelCard, { backgroundColor: theme.card }]}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500'] as const}
              style={styles.levelIcon}
            >
              <Text style={styles.levelNumber}>{stats.level}</Text>
            </LinearGradient>
            <View style={styles.levelContent}>
              <Text style={[styles.levelTitle, { color: theme.text }]}>Level {stats.level}</Text>
              <Text style={[styles.levelPoints, { color: theme.subtext }]}>
                {stats.totalPoints.toLocaleString()} points
              </Text>
              <View style={[styles.levelBar, { backgroundColor: theme.border }]}>
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6'] as const}
                  style={[styles.levelBarFill, { width: `${levelProgress}%` }]}
                />
              </View>
              <Text style={[styles.levelNext, { color: theme.subtext }]}>
                {pointsToNextLevel} points to Level {stats.level + 1}
              </Text>
            </View>
          </MotiView>

          {/* STREAK CARD */}
          <StreakCard
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
            theme={theme}
          />

          {/* DAILY CHALLENGES */}
          {dailyChallenges.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="today" size={20} color={theme.tint} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Today's Challenges
                </Text>
              </View>
              {dailyChallenges.map((challenge, idx) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onComplete={completeDailyChallenge}
                  theme={theme}
                  index={idx}
                />
              ))}
            </View>
          )}

          {/* BADGES */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield" size={20} color={theme.tint} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Badges</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {badges.map((badge, idx) => (
                <BadgeCard key={badge.id} badge={badge} theme={theme} index={idx} />
              ))}
            </ScrollView>
          </View>

          {/* UNLOCKED ACHIEVEMENTS */}
          {unlockedAchievements.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Unlocked ({unlockedAchievements.length})
                </Text>
              </View>
              {unlockedAchievements.map((achievement, idx) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  theme={theme}
                  index={idx}
                />
              ))}
            </View>
          )}

          {/* LOCKED ACHIEVEMENTS */}
          {lockedAchievements.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="lock-closed" size={20} color={theme.subtext} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Locked ({lockedAchievements.length})
                </Text>
              </View>
              {lockedAchievements.map((achievement, idx) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  theme={theme}
                  index={idx}
                />
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
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
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Level Card
  levelCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  levelIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  levelNumber: { color: 'white', fontSize: 32, fontWeight: '900' },
  levelContent: { flex: 1 },
  levelTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  levelPoints: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  levelBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  levelBarFill: { height: '100%', borderRadius: 3 },
  levelNext: { fontSize: 12, fontWeight: '600' },

  // Streak Card
  streakCard: {
    flexDirection: 'row',
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  streakIcon: { marginRight: 20 },
  streakContent: { flex: 1 },
  streakNumber: { color: 'white', fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  streakLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '800' },
  streakRecord: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginTop: 4 },

  // Section
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },

  // Badge Card
  badgeCard: {
    width: 140,
    padding: 16,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
  },
  badgeCircleContainer: { position: 'relative', marginBottom: 12 },
  badgeIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: { fontSize: 14, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  badgeDescription: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  badgeProgress: { fontSize: 11, fontWeight: '800', marginTop: 8 },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  unlockedText: { fontSize: 11, fontWeight: '800' },

  // Achievement Card
  achievementCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: { flex: 1 },
  achievementTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  achievementDescription: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  achievementFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsText: { fontSize: 11, fontWeight: '800' },
  unlockedDate: { fontSize: 11, fontWeight: '700' },
  achievementCheck: { marginLeft: 8 },

  // Challenge Card
  challengeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  challengeCompleted: { opacity: 0.6 },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  challengeContent: { flex: 1 },
  challengeTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  challengeDescription: { fontSize: 13, fontWeight: '600' },
  challengeRight: { alignItems: 'flex-end', gap: 8 },
  challengePoints: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  challengePointsText: { color: '#F59E0B', fontSize: 12, fontWeight: '900' },
});