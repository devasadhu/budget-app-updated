//app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useThemeStore } from '../_lib/useThemeStore';

export default function AuthLayout() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade', 
        // Ensures the background color matches the theme during transitions
        contentStyle: { backgroundColor: theme.background }
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Sign In' 
        }} 
      />
      <Stack.Screen 
        name="signup" 
        options={{ 
          title: 'Create Account' 
        }} 
      />
    </Stack>
  );
}