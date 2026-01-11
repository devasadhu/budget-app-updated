// lib/providers.tsx - COMPLETE FIXED VERSION
// Replace your entire file with this

"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "./firebase" 

// --- 1. DEFINE THE CONTEXT TYPE ---
interface AuthContextType {
  user: User | null;
  loading: boolean; 
}

// --- 2. INITIALIZE CONTEXT ---
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// --- 3. CUSTOM HOOK for easier access ---
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Safety timeout - if auth takes too long, proceed anyway
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timeout - proceeding with no user');
        setLoading(false);
      }
    }, 3000); // 3 second max wait

    if (!auth) {
      console.error("Firebase Auth object is undefined");
      setLoading(false);
      clearTimeout(timeout);
      return; 
    }
    
    const unsubscribe = onAuthStateChanged(
      auth, 
      (currentUser) => {
        console.log('Auth state changed:', currentUser ? 'User logged in' : 'No user');
        setUser(currentUser);
        setLoading(false);
        clearTimeout(timeout);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setLoading(false);
        clearTimeout(timeout);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []) 

  // ⭐️ KEY FIX: Always render children, don't block on loading
  return (
    <AuthContext.Provider value={{ user, loading }}> 
        {children}
    </AuthContext.Provider>
  );
}