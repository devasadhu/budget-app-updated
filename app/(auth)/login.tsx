// app/(auth)/login.tsx - USING YOUR THEME GRADIENTS
"use client"

import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword
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
  View
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
const FIREBASE_WEB_CLIENT_ID = '613170777672-lu42qtre12bjkhg55f752rrof8kiaj0r.apps.googleusercontent.com';

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

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: FIREBASE_WEB_CLIENT_ID,
    iosClientId: FIREBASE_WEB_CLIENT_ID, 
    androidClientId: FIREBASE_WEB_CLIENT_ID, 
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

  const handleLogin = async () => {
    setError("")
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace("/(tabs)") 
    } catch (err: any) {
      setError("Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => router.replace("/(tabs)"))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [response]);

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
      {/* Animated Background - USING THEME GRADIENT */}
      <LinearGradient
        colors={theme.primaryGradient}
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
                  ? ['rgba(129, 140, 248, 0.3)', 'rgba(129, 140, 248, 0.1)'] as const
                  : ['rgba(99, 102, 241, 0.3)', 'rgba(99, 102, 241, 0.1)'] as const
              }
              style={styles.logoContainer}
            >
              <Ionicons name="wallet" size={60} color="white" />
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

        {/* Form Content without the rectangular box container */}
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

          {/* Login Button with Animation - USING THEME GRADIENT */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.primaryGradient}
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

          {/* Social Login */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              { 
                backgroundColor: isDarkMode ? theme.card + '80' : 'rgba(255, 255, 255, 0.8)',
                borderColor: theme.border
              }
            ]}
            onPress={() => promptAsync()}
            disabled={loading || !request}
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
    paddingHorizontal: 24,
    paddingBottom: 40,
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
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: 'white',
    letterSpacing: -1.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 16,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
    marginTop: 8,
  },
  
  // Form Content (without rectangular container)
  formContent: {
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 32,
    textAlign: 'center',
  },
  
  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 15,
    paddingHorizontal: 16,
    fontSize: 16,
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
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
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
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
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