// SmartBudget/app/_lib/useGamificationStore.ts
// 🎮 GAMIFICATION STORE - Streaks, Badges, Levels, Achievements
import { create } from 'zustand';
import { firestoreService } from '../../src/services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: Date;
  progress?: number; // 0-100
  requirement?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  category: 'budget' | 'savings' | 'streak' | 'transactions' | 'special';
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
}

export interface UserStats {
  level: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalTransactions: number;
  totalSavings: number;
  budgetsCreated: number;
  goalsCompleted: number;
  lastActivityDate: string;
}

interface GamificationStore {
  stats: UserStats;
  badges: Badge[];
  achievements: Achievement[];
  dailyChallenges: DailyChallenge[];
  isLoading: boolean;
  
  // Actions
  initialize: (userId: string) => Promise<void>;
  updateStreak: (userId: string) => Promise<void>;
  addPoints: (userId: string, points: number, reason: string) => Promise<void>;
  unlockAchievement: (userId: string, achievementId: string) => Promise<void>;
  updateBadgeProgress: (userId: string, badgeId: string, progress: number) => Promise<void>;
  completeDailyChallenge: (userId: string, challengeId: string) => Promise<void>;
  checkAndUnlockAchievements: (userId: string, transactions: any[], budgets: any[], goals: any[]) => Promise<void>;
  generateDailyChallenges: () => Promise<void>; // Added missing method
}

const ACHIEVEMENTS: Achievement[] = [
  // Budget Achievements
  { id: 'first_budget', title: 'Budget Master', description: 'Create your first budget', points: 50, icon: 'pie-chart', category: 'budget', unlocked: false },
  { id: 'budget_guru', title: 'Budget Guru', description: 'Create 5 budgets', points: 100, icon: 'analytics', category: 'budget', unlocked: false },
  { id: 'budget_adherence', title: 'Disciplined Spender', description: 'Stay within budget for 7 days', points: 150, icon: 'shield-checkmark', category: 'budget', unlocked: false },
  
  // Savings Achievements
  { id: 'first_goal', title: 'Goal Setter', description: 'Create your first savings goal', points: 50, icon: 'flag', category: 'savings', unlocked: false },
  { id: 'goal_reached', title: 'Dream Achiever', description: 'Complete a savings goal', points: 200, icon: 'trophy', category: 'savings', unlocked: false },
  { id: 'savings_star', title: 'Savings Star', description: 'Save ₹10,000', points: 150, icon: 'star', category: 'savings', unlocked: false },
  
  // Streak Achievements
  { id: 'week_streak', title: 'Week Warrior', description: '7-day tracking streak', points: 100, icon: 'flame', category: 'streak', unlocked: false },
  { id: 'month_streak', title: 'Month Master', description: '30-day tracking streak', points: 300, icon: 'rocket', category: 'streak', unlocked: false },
  { id: 'hundred_days', title: 'Centurion', description: '100-day tracking streak', points: 1000, icon: 'medal', category: 'streak', unlocked: false },
  
  // Transaction Achievements
  { id: 'first_transaction', title: 'First Step', description: 'Add your first transaction', points: 25, icon: 'create', category: 'transactions', unlocked: false },
  { id: 'transaction_100', title: 'Century Club', description: 'Track 100 transactions', points: 250, icon: 'list', category: 'transactions', unlocked: false },
  { id: 'categorization_pro', title: 'Organization Expert', description: 'Categorize 50 transactions', points: 150, icon: 'folder', category: 'transactions', unlocked: false },
  
  // Special Achievements
  { id: 'receipt_scanner', title: 'Tech Savvy', description: 'Use receipt scanner', points: 100, icon: 'camera', category: 'special', unlocked: false },
  { id: 'early_adopter', title: 'Early Adopter', description: 'Join SmartBudget', points: 50, icon: 'sparkles', category: 'special', unlocked: false },
  { id: 'friend_referral', title: 'Community Builder', description: 'Invite a friend', points: 150, icon: 'people', category: 'special', unlocked: false },
];

const BADGES: Badge[] = [
  { id: 'beginner', name: 'Beginner', description: 'Welcome to SmartBudget!', icon: 'leaf', color: '#10B981', progress: 100 },
  { id: 'tracker', name: 'Daily Tracker', description: '7-day streak', icon: 'calendar', color: '#0EA5E9', progress: 0, requirement: 7 },
  { id: 'saver', name: 'Super Saver', description: 'Save ₹5,000', icon: 'wallet', color: '#F59E0B', progress: 0, requirement: 5000 },
  { id: 'budgeter', name: 'Budget Pro', description: 'Create 3 budgets', icon: 'pie-chart', color: '#8B5CF6', progress: 0, requirement: 3 },
  { id: 'consistent', name: 'Consistent', description: '30-day streak', icon: 'flame', color: '#EF4444', progress: 0, requirement: 30 },
  { id: 'master', name: 'Finance Master', description: 'Reach Level 10', icon: 'trophy', color: '#FFD700', progress: 0, requirement: 10 },
];

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  stats: {
    level: 1,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalTransactions: 0,
    totalSavings: 0,
    budgetsCreated: 0,
    goalsCompleted: 0,
    lastActivityDate: new Date().toISOString().split('T')[0],
  },
  badges: BADGES,
  achievements: ACHIEVEMENTS,
  dailyChallenges: [],
  isLoading: false,

  initialize: async (userId: string) => {
    console.log('🎮 Initializing Gamification System...');
    set({ isLoading: true });

    try {
      // Load stats from Firestore
      const statsData = await firestoreService.fetchDocuments<UserStats>(`users/${userId}/gamification`);
      
      if (statsData.length > 0) {
        const stats = statsData[0];
        
        // Load badges and achievements
        const badgesData = await firestoreService.fetchDocuments<Badge>(`users/${userId}/badges`);
        const achievementsData = await firestoreService.fetchDocuments<Achievement>(`users/${userId}/achievements`);
        
        set({
          stats,
          badges: badgesData.length > 0 ? badgesData : BADGES,
          achievements: achievementsData.length > 0 ? achievementsData : ACHIEVEMENTS,
          isLoading: false,
        });
      } else {
        // First time user - create initial data
        await firestoreService.addDocument(`users/${userId}/gamification`, get().stats);
        
        // Award early adopter achievement
        await get().unlockAchievement(userId, 'early_adopter');
        
        set({ isLoading: false });
      }
      
      // Generate daily challenges
      await get().generateDailyChallenges();
      
      console.log('✅ Gamification initialized');
    } catch (error) {
      console.error('❌ Gamification init failed:', error);
      set({ isLoading: false });
    }
  },

  updateStreak: async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { stats } = get();
    
    // Check if already updated today
    if (stats.lastActivityDate === today) {
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // If last activity was yesterday, increment streak
    const newStreak = stats.lastActivityDate === yesterdayStr 
      ? stats.currentStreak + 1 
      : 1;
    
    const newStats = {
      ...stats,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, stats.longestStreak),
      lastActivityDate: today,
    };
    
    set({ stats: newStats });
    
    // Save to Firestore - find the stats document ID first
    try {
      const statsData = await firestoreService.fetchDocuments<UserStats>(`users/${userId}/gamification`);
      
      if (statsData.length > 0 && statsData[0].id) {
        await firestoreService.updateDocument(`users/${userId}/gamification/${statsData[0].id}`, newStats);
      } else {
        await firestoreService.addDocument(`users/${userId}/gamification`, newStats);
      }
    } catch (error) {
      console.error('Failed to save streak:', error);
    }
    
    // Check streak achievements
    if (newStreak === 7) await get().unlockAchievement(userId, 'week_streak');
    if (newStreak === 30) await get().unlockAchievement(userId, 'month_streak');
    if (newStreak === 100) await get().unlockAchievement(userId, 'hundred_days');
    
    // Update badges
    const trackerBadge = get().badges.find(b => b.id === 'tracker');
    if (trackerBadge) {
      await get().updateBadgeProgress(userId, 'tracker', Math.min(100, (newStreak / 7) * 100));
    }
    
    const consistentBadge = get().badges.find(b => b.id === 'consistent');
    if (consistentBadge) {
      await get().updateBadgeProgress(userId, 'consistent', Math.min(100, (newStreak / 30) * 100));
    }
    
    console.log(`🔥 Streak updated: ${newStreak} days`);
  },

  addPoints: async (userId: string, points: number, reason: string) => {
    const { stats } = get();
    const newTotalPoints = stats.totalPoints + points;
    const newLevel = Math.floor(newTotalPoints / 500) + 1; // 500 points per level
    
    const newStats = {
      ...stats,
      totalPoints: newTotalPoints,
      level: newLevel,
    };
    
    set({ stats: newStats });
    
    // Save to Firestore - find the stats document ID first
    try {
      const statsData = await firestoreService.fetchDocuments<UserStats>(`users/${userId}/gamification`);
      
      if (statsData.length > 0 && statsData[0].id) {
        // Update existing document
        await firestoreService.updateDocument(`users/${userId}/gamification/${statsData[0].id}`, newStats);
      } else {
        // Create new document if it doesn't exist
        await firestoreService.addDocument(`users/${userId}/gamification`, newStats);
      }
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
    
    // Update master badge
    const masterBadge = get().badges.find(b => b.id === 'master');
    if (masterBadge) {
      await get().updateBadgeProgress(userId, 'master', Math.min(100, (newLevel / 10) * 100));
    }
    
    console.log(`⭐ +${points} points for ${reason}. Total: ${newTotalPoints}, Level: ${newLevel}`);
  },

  unlockAchievement: async (userId: string, achievementId: string) => {
    const achievement = get().achievements.find(a => a.id === achievementId);
    
    if (!achievement || achievement.unlocked) {
      return;
    }
    
    const unlockedAchievement = {
      ...achievement,
      unlocked: true,
      unlockedAt: new Date(),
    };
    
    const newAchievements = get().achievements.map(a => 
      a.id === achievementId ? unlockedAchievement : a
    );
    
    set({ achievements: newAchievements });
    
    // Save to Firestore - use addDocument instead of updateDocument for first time
    try {
      await firestoreService.addDocument(`users/${userId}/achievements`, {
        ...unlockedAchievement,
        id: achievementId,
      });
    } catch (error) {
      // If document exists, try updating instead
      try {
        await firestoreService.updateDocument(`users/${userId}/achievements/${achievementId}`, unlockedAchievement);
      } catch (updateError) {
        console.error('Failed to save achievement:', updateError);
      }
    }
    
    // Add points
    await get().addPoints(userId, achievement.points, `Achievement: ${achievement.title}`);
    
    console.log(`🏆 Achievement unlocked: ${achievement.title} (+${achievement.points} points)`);
  },

  updateBadgeProgress: async (userId: string, badgeId: string, progress: number) => {
    const badge = get().badges.find(b => b.id === badgeId);
    
    if (!badge) return;
    
    // Handle potentially undefined progress with default value
    const currentProgress = badge.progress ?? 0;
    const updatedBadge = { ...badge, progress: Math.min(100, progress) };
    
    // Check if just completed
    if (currentProgress < 100 && updatedBadge.progress >= 100) {
      updatedBadge.unlockedAt = new Date();
      console.log(`🎖️ Badge earned: ${badge.name}!`);
    }
    
    const newBadges = get().badges.map(b => 
      b.id === badgeId ? updatedBadge : b
    );
    
    set({ badges: newBadges });
    
    // Save to Firestore - use addDocument for first time, then update
    try {
      await firestoreService.addDocument(`users/${userId}/badges`, {
        ...updatedBadge,
        id: badgeId,
      });
    } catch (error) {
      // If document exists, update it
      try {
        await firestoreService.updateDocument(`users/${userId}/badges/${badgeId}`, updatedBadge);
      } catch (updateError) {
        console.error('Failed to save badge:', updateError);
      }
    }
  },

  completeDailyChallenge: async (userId: string, challengeId: string) => {
    const challenge = get().dailyChallenges.find(c => c.id === challengeId);
    
    if (!challenge || challenge.completed) return;
    
    const completedChallenge = { ...challenge, completed: true };
    const newChallenges = get().dailyChallenges.map(c => 
      c.id === challengeId ? completedChallenge : c
    );
    
    set({ dailyChallenges: newChallenges });
    
    // Add points
    await get().addPoints(userId, challenge.points, `Challenge: ${challenge.title}`);
    
    console.log(`✅ Daily challenge completed: ${challenge.title} (+${challenge.points} points)`);
  },

  checkAndUnlockAchievements: async (userId: string, transactions: any[], budgets: any[], goals: any[]) => {
    // First transaction
    if (transactions.length === 1) {
      await get().unlockAchievement(userId, 'first_transaction');
    }
    
    // 100 transactions
    if (transactions.length >= 100) {
      await get().unlockAchievement(userId, 'transaction_100');
    }
    
    // First budget
    if (budgets.length === 1) {
      await get().unlockAchievement(userId, 'first_budget');
    }
    
    // 5 budgets
    if (budgets.length >= 5) {
      await get().unlockAchievement(userId, 'budget_guru');
    }
    
    // First goal
    if (goals.length === 1) {
      await get().unlockAchievement(userId, 'first_goal');
    }
    
    // Update badge progress
    const budgeterBadge = get().badges.find(b => b.id === 'budgeter');
    if (budgeterBadge && budgeterBadge.requirement) {
      await get().updateBadgeProgress(userId, 'budgeter', (budgets.length / budgeterBadge.requirement) * 100);
    }
  },

  generateDailyChallenges: async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already generated today
    const storedChallenges = await AsyncStorage.getItem('@daily_challenges');
    if (storedChallenges) {
      const parsed = JSON.parse(storedChallenges);
      if (parsed.date === today) {
        set({ dailyChallenges: parsed.challenges });
        return;
      }
    }
    
    // Generate new challenges
    const allChallenges = [
      { id: 'add_3_transactions', title: 'Track 3 Expenses', description: 'Add 3 transactions today', points: 30, icon: 'list' },
      { id: 'under_budget', title: 'Stay Under Budget', description: 'Don\'t exceed any budget category', points: 50, icon: 'shield-checkmark' },
      { id: 'scan_receipt', title: 'Scan a Receipt', description: 'Use the receipt scanner', points: 40, icon: 'camera' },
      { id: 'save_goal', title: 'Contribute to Goal', description: 'Add money to a savings goal', points: 50, icon: 'trending-up' },
      { id: 'review_insights', title: 'Check Insights', description: 'Review your financial insights', points: 20, icon: 'bulb' },
    ];
    
    // Pick 3 random challenges
    const shuffled = allChallenges.sort(() => 0.5 - Math.random());
    const todaysChallenges: DailyChallenge[] = shuffled.slice(0, 3).map(c => ({
      ...c,
      completed: false,
      date: today,
    }));
    
    set({ dailyChallenges: todaysChallenges });
    
    // Store
    await AsyncStorage.setItem('@daily_challenges', JSON.stringify({
      date: today,
      challenges: todaysChallenges,
    }));
  },
}));