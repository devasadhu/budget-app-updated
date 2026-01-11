// _lib/useAuthStore.ts
import { create } from 'zustand';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'; 
import { auth } from './firebase'; 

interface AuthStore {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    isInitialized: boolean; // NEW: Track if auth has been initialized
    initializeAuth: () => () => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    isInitialized: false, // NEW: Start as false

    initializeAuth: () => {
        set({ isLoading: true, isInitialized: false });
        
        // Return the unsubscribe function from onAuthStateChanged
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('🔐 Auth state changed:', user ? `User: ${user.uid}` : 'No user');
            set({ 
                user: user, 
                isLoggedIn: !!user, 
                isLoading: false,
                isInitialized: true // NEW: Mark as initialized
            });
        });
        
        return unsubscribe;
    },

    signOut: async () => {
        set({ isLoading: true });
        try {
            await firebaseSignOut(auth);
            set({ 
                user: null, 
                isLoggedIn: false, 
                isLoading: false,
                isInitialized: true 
            });
        } catch (error) {
            set({ isLoading: false });
            console.error('Sign out error:', error);
        }
    },
}));