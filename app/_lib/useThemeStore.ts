// _lib/useThemeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // Default to system preference if no saved value exists
      isDarkMode: Appearance.getColorScheme() === 'dark',

      toggleTheme: () => set((state) => ({ 
        isDarkMode: !state.isDarkMode 
      })),

      setTheme: (isDark: boolean) => set({ 
        isDarkMode: isDark 
      }),
    }),
    {
      name: 'smartbudget-theme-storage', // unique name for AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);