// app/(auth)/login.tsx
"use client"

import React, { useState, useEffect } from "react" 
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native"
import { 
  signInWithEmailAndPassword,
  GoogleAuthProvider,     
  signInWithCredential, 
  signInWithPopup, 
  AuthError, 
} from "firebase/auth" 

import * as Google from 'expo-auth-session/providers/google'; 
import * as WebBrowser from 'expo-web-browser'; 

import { auth } from "../_lib/firebase" 
import { router } from "expo-router"
import { useThemeStore } from "../_lib/useThemeStore"
import { Colors } from "../../constants/theme"
import { Ionicons } from "@expo/vector-icons"

WebBrowser.maybeCompleteAuthSession();

// Replace with your actual Firebase/Google Client ID
const FIREBASE_WEB_CLIENT_ID = '613170777672-lu42qtre12bjkhg55f752rrof8kiaj0r.apps.googleusercontent.com';

export default function LoginScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: FIREBASE_WEB_CLIENT_ID,
    iosClientId: FIREBASE_WEB_CLIENT_ID, 
    androidClientId: FIREBASE_WEB_CLIENT_ID, 
  });

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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: isDarkMode ? theme.card : '#E0F2FE' }]}>
            <Text style={styles.logoText}>💰</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>Log in to manage your SmartBudget</Text>
        </View>

        {/* Input Fields */}
        <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: theme.subtext }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input, 
                { color: theme.text, backgroundColor: isDarkMode ? theme.background : '#F8FAFC', borderColor: theme.border },
                emailFocused && { borderColor: theme.tint }
              ]}
              placeholder="name@example.com"
              placeholderTextColor={theme.subtext}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: theme.subtext }]}>Password</Text>
            <TextInput
              style={[
                styles.input, 
                { color: theme.text, backgroundColor: isDarkMode ? theme.background : '#F8FAFC', borderColor: theme.border },
                passwordFocused && { borderColor: theme.tint }
              ]}
              placeholder="••••••••"
              placeholderTextColor={theme.subtext}
              secureTextEntry
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: theme.tint }, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: theme.border }]} />
            <Text style={[styles.orText, { color: theme.subtext }]}>OR</Text>
            <View style={[styles.line, { backgroundColor: theme.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: theme.border }]}
            onPress={() => promptAsync()}
            disabled={loading || !request}
          >
            <Ionicons name="logo-google" size={20} color={isDarkMode ? 'white' : '#4285F4'} />
            <Text style={[styles.googleBtnText, { color: theme.text }]}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={() => router.push("/(auth)/signup")} 
          style={styles.footerLink}
        >
          <Text style={[styles.footerText, { color: theme.subtext }]}>
            New here? <Text style={{ color: theme.tint, fontWeight: '700' }}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logoCircle: { width: 70, height: 70, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  logoText: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 15, marginTop: 4 },
  formContainer: { borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  inputWrapper: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 14, padding: 16, fontSize: 16 },
  errorText: { color: "#EF4444", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 16 },
  loginBtn: { height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 8 },
  loginBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  line: { flex: 1, height: 1 },
  orText: { marginHorizontal: 16, fontSize: 13, fontWeight: "600" },
  googleBtn: { height: 56, borderRadius: 16, borderWidth: 1.5, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  googleBtnText: { fontSize: 16, fontWeight: "700" },
  footerLink: { marginTop: 32, alignItems: "center" },
  footerText: { fontSize: 15 },
})