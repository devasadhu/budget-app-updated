// _lib/useAuthStore.ts
import {
    GoogleAuthProvider,
    User,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup
} from 'firebase/auth';
import { create } from 'zustand';
import { auth } from './firebase';

interface AuthStore {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    isInitialized: boolean;
    
    // Functions
    initializeAuth: () => () => void;
    signOut: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    isInitialized: false,

    initializeAuth: () => {
        set({ isLoading: true, isInitialized: false });
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('🔐 Auth state changed:', user ? `User: ${user.uid}` : 'No user');
            set({ 
                user: user, 
                isLoggedIn: !!user, 
                isLoading: false,
                isInitialized: true
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

    signIn: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            set({ 
                user: result.user, 
                isLoggedIn: true, 
                isLoading: false 
            });
        } catch (error) {
            set({ isLoading: false });
            console.error('Sign in error:', error);
            throw error;
        }
    },

    signUp: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            set({ 
                user: result.user, 
                isLoggedIn: true, 
                isLoading: false 
            });
        } catch (error) {
            set({ isLoading: false });
            console.error('Sign up error:', error);
            throw error;
        }
    },

    signInWithGoogle: async () => {
        set({ isLoading: true });
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            set({ 
                user: result.user, 
                isLoggedIn: true, 
                isLoading: false 
            });
        } catch (error) {
            set({ isLoading: false });
            console.error('Google sign in error:', error);
            throw error;
        }
    },
}));