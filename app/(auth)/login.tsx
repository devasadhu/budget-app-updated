// app/(auth)/login.tsx - Premium Login with All Client IDs
"use client"

import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from "react-native";

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors } from "../../constants/theme";
import { auth } from "../_lib/firebase";
import { useThemeStore } from "../_lib/useThemeStore";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// ✅ All Client IDs configured
const WEB_CLIENT_ID = '613170777672-lu42qtre12bjkhg55f752rrof8kiaj0r.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '613170777672-u2ti2f2fsacpdeujulqbu6rc0sdsln6e.apps.googleusercontent.com';
const IOS_CLIENT_ID = '613170777672-gvo1g577pgncudlpm4fd4hplh4p2ici1.apps.googleusercontent.com';

// 🎨 LIGHTER SOFT BLUE GRADIENTS FOR LOGIN PAGE (Like your screenshot)
const LOGIN_GRADIENTS = {
  light: ['#93C5FD', '#BFDBFE', '#DBEAFE'] as const, // Soft light blue
  dark: ['#1E40AF', '#2563EB', '#3B82F6'] as const, // Medium blue for dark mode
};

export default function PremiumLoginScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const particleAnim1 = useRef(new Animated.Value(0)).current;
  const particleAnim2 = useRef(new Animated.Value(0)).current;
  const particleAnim3 = useRef(new Animated.Value(0)).current;

  // ✅ Google Auth with all platforms configured
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Start animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.loop(
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(particleAnim1, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          }),
          Animated.timing(particleAnim1, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          })
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(particleAnim2, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
            delay: 1000,
            easing: Easing.inOut(Easing.sin)
          }),
          Animated.timing(particleAnim2, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          })
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(particleAnim3, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: true,
            delay: 2000,
            easing: Easing.inOut(Easing.sin)
          }),
          Animated.timing(particleAnim3, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          })
        ])
      )
    ]).start();
  }, []);

  // ✅ Email/Password Login
  const handleLogin = async () => {
    setError("")
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      console.log('✅ Email login successful');
      router.replace("/(tabs)") 
    } catch (err: any) {
      console.error('❌ Email login error:', err);
      setError("Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  // ✅ Handle Google Sign-In Response
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const { id_token } = response.params;

      if (!id_token) {
        console.error('❌ No ID token received');
        setError("Failed to get authentication token");
        setLoading(false);
        return;
      }

      console.log('✅ Google auth successful, signing in to Firebase...');
      setLoading(true);

      const credential = GoogleAuthProvider.credential(id_token);
      
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          console.log('✅ Firebase sign-in successful:', userCredential.user.email);
          router.replace("/(tabs)");
        })
        .catch((error) => {
          console.error('❌ Firebase sign-in error:', error);
          setError(error.message || "Failed to sign in with Google");
          Alert.alert('Sign-In Error', error.message);
        })
        .finally(() => setLoading(false));
    } else if (response.type === 'error') {
      console.error('❌ Google auth error:', response.error);
      setError('Google authentication failed. Please try again.');
      setLoading(false);
    } else if (response.type === 'cancel') {
      console.log('ℹ️ User cancelled Google sign-in');
      setLoading(false);
    }
  }, [response]);

  // ✅ Handle Google Sign-In Button
  const handleGoogleSignIn = async () => {
    setError("")
    
    try {
      if (Platform.OS === 'web') {
        // Web: Use popup
        setLoading(true);
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        router.replace("/(tabs)");
      } else {
        // Mobile: Use expo-auth-session
        if (!request) {
          Alert.alert('Error', 'Google sign-in is not ready. Please try again.');
          return;
        }
        
        console.log('🔵 Starting Google sign-in...');
        setLoading(true);
        await promptAsync();
        // Note: setLoading(false) will be handled in useEffect
      }
    } catch (err: any) {
      console.error('❌ Google sign-in error:', err);
      setError(err.message || "Google Sign-In failed. Please try again.");
      setLoading(false);
    }
  }

  const rotateInterpolate = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const particle1Y = particleAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100]
  });

  const particle2X = particleAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100]
  });

  const particle3Y = particleAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150]
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      {/* Animated Background - USING LIGHTER SOFT BLUE GRADIENT */}
      <LinearGradient
        colors={isDarkMode ? LOGIN_GRADIENTS.dark : LOGIN_GRADIENTS.light}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated particles */}
        <Animated.View style={[
          styles.floatingParticle,
          { 
            left: width * 0.2,
            top: height * 0.3,
            transform: [{ translateY: particle1Y }]
          }
        ]} />
        <Animated.View style={[
          styles.floatingParticle,
          { 
            left: width * 0.7,
            top: height * 0.5,
            transform: [{ translateX: particle2X }]
          }
        ]} />
        <Animated.View style={[
          styles.floatingParticle,
          { 
            left: width * 0.4,
            top: height * 0.7,
            transform: [{ translateY: particle3Y }]
          }
        ]} />
        
        {/* Floating circles */}
        <View style={[styles.floatingCircle, { top: 100, left: 50, width: 200, height: 200 }]} />
        <View style={[styles.floatingCircle, { bottom: 100, right: 50, width: 150, height: 150 }]} />
        <View style={[styles.floatingCircle, { top: 300, right: 100, width: 100, height: 100 }]} />
      </LinearGradient>

      {/* Blur overlay */}
      <BlurView intensity={80} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section with animations */}
        <Animated.View style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <LinearGradient
              colors={
                isDarkMode 
                  ? ['rgba(37, 99, 235, 0.4)', 'rgba(59, 130, 246, 0.3)'] as const
                  : ['rgba(147, 197, 253, 0.6)', 'rgba(191, 219, 254, 0.4)'] as const
              }
              style={styles.logoContainer}
            >
              <Ionicons name="wallet" size={height * 0.07} color="white" />
            </LinearGradient>
          </Animated.View>
          
          <Text style={styles.title}>SmartBudget</Text>
          <Text style={styles.subtitle}>Take control of your finances</Text>
          
          {/* Animated underline */}
          <Animated.View style={[
            styles.titleUnderline,
            { 
              transform: [
                { scaleX: scaleAnim }
              ]
            }
          ]} />
        </Animated.View>

        {/* Form Content */}
        <Animated.View style={[
          styles.formContent,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
            alignSelf: 'center',
            width: '100%',
            maxWidth: 400,
          }
        ]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.formSubtitle, { color: theme.subtext }]}>Sign in to continue your journey</Text>

          {/* Email Input with Icon */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputIconContainer, { backgroundColor: theme.tint + '20' }]}>
              <Ionicons name="mail" size={20} color={theme.tint} />
            </View>
            <TextInput
              style={[
                styles.input, 
                { 
                  color: theme.text,
                  borderColor: emailFocused ? theme.tint : theme.border,
                  backgroundColor: theme.card + '80'
                }
              ]}
              placeholder="Email address"
              placeholderTextColor={theme.subtext}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password Input with Icon */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputIconContainer, { backgroundColor: theme.tint + '20' }]}>
              <Ionicons name="lock-closed" size={20} color={theme.tint} />
            </View>
            <TextInput
              style={[
                styles.input, 
                { 
                  color: theme.text,
                  borderColor: passwordFocused ? theme.tint : theme.border,
                  backgroundColor: theme.card + '80',
                  flex: 1
                }
              ]}
              placeholder="Password"
              placeholderTextColor={theme.subtext}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color={theme.subtext} 
              />
            </TouchableOpacity>
          </View>

          {error ? (
            <View 
              style={[
                styles.errorContainer,
                { backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2' }
              ]}
            >
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={[styles.errorText, { color: isDarkMode ? '#FCA5A5' : '#DC2626' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Login Button with Animation - USING BRIGHT BLUE GRADIENT */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isDarkMode ? ['#2563EB', '#3B82F6'] as const : ['#3B82F6', '#60A5FA'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.subtext }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              { 
                backgroundColor: isDarkMode ? theme.card + '80' : 'rgba(255, 255, 255, 0.8)',
                borderColor: theme.border
              }
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading || (Platform.OS !== 'web' && !request)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.googleIconContainer,
              { backgroundColor: isDarkMode ? theme.background : '#FFF' }
            ]}>
              <Ionicons name="logo-google" size={20} color="#DB4437" />
            </View>
            <Text style={[
              styles.googleButtonText, 
              { color: theme.text }
            ]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <TouchableOpacity 
            onPress={() => router.push("/(auth)/signup")} 
            style={styles.signupContainer}
            disabled={loading}
          >
            <Text style={[styles.signupText, { color: theme.subtext }]}>
              New to SmartBudget?{' '}
              <Text style={[styles.signupLink, { color: theme.tint }]}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={[styles.footerText, { color: isDarkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(255,255,255,0.7)' }]}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: "center", 
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: height,
  },
  
  // Animated particles
  floatingParticle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.3,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Header
  header: {
    alignItems: "center",
    marginBottom: height * 0.04,
    marginTop: height * 0.05,
  },
  logoContainer: {
    width: height * 0.14,
    height: height * 0.14,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.025,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: height * 0.048,
    fontWeight: "900",
    color: 'white',
    letterSpacing: -1.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: height * 0.018,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 16,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#818CF8',
    borderRadius: 2,
    marginTop: 8,
  },
  
  // Form Content
  formContent: {
    padding: 20,
    marginBottom: height * 0.03,
  },
  formTitle: {
    fontSize: height * 0.036,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: height * 0.016,
    fontWeight: "600",
    marginBottom: height * 0.035,
    textAlign: 'center',
  },
  
  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.022,
  },
  inputIconContainer: {
    width: height * 0.058,
    height: height * 0.058,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: height * 0.058,
    borderWidth: 1.5,
    borderRadius: 15,
    paddingHorizontal: 16,
    fontSize: height * 0.018,
    fontWeight: '600',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  
  // Login Button
  loginButton: {
    height: height * 0.065,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: height * 0.028,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: "800",
  },
  
  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Google Button
  googleButton: {
    height: height * 0.065,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: height * 0.028,
  },
  googleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  
  // Sign Up
  signupContainer: {
    alignItems: "center",
  },
  signupText: {
    fontSize: 15,
    fontWeight: '600',
  },
  signupLink: {
    fontWeight: "800",
  },
  
  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 40,
  },
});