// app/_lib/useGoalsStore.ts
import { create } from 'zustand';
import { firestoreService } from '../../src/services/firestoreService';

// --- 1. INTERFACE DEFINITIONS ---

export interface Goal {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    icon: string;
    color: string;
    createdAt: Date;
    targetDate?: Date;
}

// Data shape for creating a new goal
export type NewGoalInput = Omit<Goal, 'id' | 'currentAmount' | 'createdAt'>;

// Data shape for updating an existing goal
export type UpdateGoalInput = Partial<Omit<Goal, 'id' | 'userId' | 'createdAt'>>;

interface GoalsStore {
    goals: Goal[];
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null;
    
    // Core Actions
    fetchGoals: (userId: string) => Promise<void>;
    addGoal: (newGoalData: NewGoalInput) => Promise<void>;
    updateGoal: (goal: Goal, updates: UpdateGoalInput) => Promise<void>;
    deleteGoal: (goal: Goal) => Promise<void>;
    addContribution: (goalId: string, userId: string, amount: number) => Promise<void>;
    initialize: (userId: string) => void;
}

// A global flag to ensure initialization only happens once
let isInitialized = false;

// --- 2. THE ZUSTAND STORE ---

export const useGoalsStore = create<GoalsStore>((set, get) => ({
    goals: [],
    isLoading: false,
    error: null,
    lastFetched: null,

    /**
     * Initializes the store (placeholder for future functionality like subscriptions)
     */
    initialize: (userId: string) => {
        if (isInitialized) {
            console.log('⚠️ GoalsStore already initialized, skipping');
            return;
        }
        isInitialized = true;
        console.log('🚀 ========== GOALS STORE INITIALIZING ==========');
        console.log(`👤 User ID: ${userId}`);
        
        // Fetch initial data
        get().fetchGoals(userId);
        console.log('🚀 ================================================\n');
    },

    /**
     * Fetches all goal documents for the given user from Firestore.
     */
    fetchGoals: async (userId: string) => {
        console.log('\n📥 ========== FETCH GOALS STARTED ==========');
        console.log(`👤 User ID: ${userId}`);
        
        if (!userId) {
            console.log('⚠️ No userId provided, clearing goals');
            set({ isLoading: false, goals: [] });
            return;
        }

        const { lastFetched, isLoading } = get();
        const CACHE_LIFETIME = 60000; // 60 seconds

        // Cache Guard
        if (isLoading || (lastFetched && Date.now() - lastFetched < CACHE_LIFETIME && get().goals.length > 0)) {
            console.log('⚠️ Goal fetch skipped: Cache fresh or already loading');
            return;
        }
        
        console.log('🔄 Initiating goal fetch from Firestore...');
        set({ isLoading: true, error: null });

        try {
            const rawGoals = await firestoreService.fetchDocuments<Goal>(
                `users/${userId}/goals`
            );
            console.log(`✅ Fetched ${rawGoals.length} goals from Firestore`);
            
            // Convert Firestore timestamps to Date objects
            const goalsWithDates = rawGoals.map(goal => ({
                ...goal,
                createdAt: goal.createdAt instanceof Date ? goal.createdAt : new Date(goal.createdAt),
                targetDate: goal.targetDate ? (goal.targetDate instanceof Date ? goal.targetDate : new Date(goal.targetDate)) : undefined,
            }));

            set({ 
                goals: goalsWithDates, 
                isLoading: false,
                lastFetched: Date.now(),
            });
            console.log(`✅ Goals fetched successfully`);
            console.log('📥 ===========================================\n');
        } catch (err: any) {
            console.error("🔴 Failed to fetch goals:", err);
            set({ 
                error: err.message || "Failed to fetch goals.", 
                isLoading: false,
            });
            console.log('📥 ===========================================\n');
        }
    },

    /**
     * Adds a new goal document to Firestore and triggers a data refresh.
     */
    addGoal: async (newGoalData) => {
        console.log('🔵 ========== ADD GOAL STARTED ==========');
        console.log('📋 Goal data:', newGoalData);
        
        const { userId } = newGoalData;
        if (!userId) {
            console.error('🔴 No userId provided');
            throw new Error("User ID is required to add a goal.");
        }
        
        set({ error: null });

        try {
            const path = `users/${userId}/goals`;
            console.log('📍 Writing to path:', path);
            
            // Add createdAt and currentAmount
            const goalToAdd = {
                ...newGoalData,
                currentAmount: 0,
                createdAt: new Date(),
            };
            
            const docRef = await firestoreService.addDocument(path, goalToAdd);
            console.log('✅ Goal added with ID:', docRef.id);
            
            // Force a full refresh
            set({ lastFetched: null }); 
            await get().fetchGoals(userId);
            console.log('✅ Refresh complete');
            console.log('🔵 =======================================\n');

        } catch (err: any) {
            console.error("🔴 Failed to add goal:", err);
            set({ error: err.message || "Failed to add goal." });
            console.log('🔵 =======================================\n');
            throw err;
        }
    },

    /**
     * Updates a goal in Firestore and triggers a data refresh.
     */
    updateGoal: async (goal, updates) => {
        console.log('🔵 ========== UPDATE GOAL STARTED ==========');
        console.log('📋 Goal:', goal);
        console.log('📋 Updates:', updates);
        
        set({ error: null });
        const { userId, id: goalId } = goal;
        if (!userId) throw new Error("User ID is required to update a goal.");

        try {
            await firestoreService.updateDocument(
                `users/${userId}/goals/${goalId}`,
                updates
            );
            console.log('✅ Goal updated in Firestore');

            // Force a full refresh
            set({ lastFetched: null });
            await get().fetchGoals(userId);
            console.log('✅ Refresh complete');
            console.log('🔵 =========================================\n');
            
        } catch (err: any) {
            console.error("🔴 Failed to update goal:", err);
            set({ error: err.message || "Failed to update goal." });
            console.log('🔵 =========================================\n');
            throw err;
        }
    },

    /**
     * Deletes a goal from Firestore and triggers a data refresh.
     */
    deleteGoal: async (goal) => {
        console.log('🔵 ========== DELETE GOAL STARTED ==========');
        console.log('📋 Goal to delete:', goal);
        
        set({ error: null });
        const { userId, id: goalId } = goal;
        if (!userId) throw new Error("User ID is required to delete a goal.");

        try {
            await firestoreService.deleteDocument(
                `users/${userId}/goals/${goalId}`
            );
            console.log('✅ Goal deleted from Firestore');

            // Force a full refresh
            set({ lastFetched: null });
            await get().fetchGoals(userId);
            console.log('✅ Refresh complete');
            console.log('🔵 =========================================\n');

        } catch (err: any) {
            console.error("🔴 Failed to delete goal:", err);
            set({ error: err.message || "Failed to delete goal." });
            console.log('🔵 =========================================\n');
            throw err;
        }
    },

    /**
     * Adds a contribution to a goal's current amount.
     */
    addContribution: async (goalId: string, userId: string, amount: number) => {
        console.log('🔵 ========== ADD CONTRIBUTION STARTED ==========');
        console.log(`💰 Adding ${amount} to goal ${goalId}`);
        
        if (!userId) throw new Error("User ID is required to add contribution.");
        
        set({ error: null });

        try {
            const goal = get().goals.find(g => g.id === goalId);
            if (!goal) throw new Error("Goal not found");

            const newAmount = goal.currentAmount + amount;
            
            await firestoreService.updateDocument(
                `users/${userId}/goals/${goalId}`,
                { currentAmount: newAmount }
            );
            console.log(`✅ Contribution added. New amount: ${newAmount}`);

            // Force a full refresh
            set({ lastFetched: null });
            await get().fetchGoals(userId);
            console.log('✅ Refresh complete');
            console.log('🔵 ===============================================\n');
            
        } catch (err: any) {
            console.error("🔴 Failed to add contribution:", err);
            set({ error: err.message || "Failed to add contribution." });
            console.log('🔵 ===============================================\n');
            throw err;
        }
    },
}));