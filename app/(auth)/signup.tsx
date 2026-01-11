// app/(auth)/signup.tsx
"use client"

import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import React, { useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { Colors } from "../../constants/theme"
import { auth, db } from "../_lib/firebase"
import { useThemeStore } from "../_lib/useThemeStore"

export default function SignupScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const handleSignup = async () => {
    setError("")
    if (!name || !email || !password) {
      setError("Please fill in all fields")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user;

      // 2. Update Firebase Auth profile with name
      await updateProfile(user, {
        displayName: name,
      });

      // 3. Create Firestore User Document with proper name
      await setDoc(doc(db, "users", user.uid), {
        userId: user.uid,
        email: user.email,
        displayName: name,
        fullName: name,
        createdAt: new Date().toISOString(),
        monthlyBudget: 0,
        profileImage: null,
      });

      // 4. Navigation handled by RootLayout Auth listener, 
      // but we use replace to ensure the stack is cleared.
      router.replace("/(tabs)"); 
      
    } catch (err: any) {
      const errorMessage = err.message || "Signup failed.";
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>Join SmartBudget and take control of your money</Text>
        </View>

        {/* Input Fields */}
        <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
          {/* Name Field - NEW */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: theme.subtext }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input, 
                { color: theme.text, backgroundColor: isDarkMode ? theme.background : '#F8FAFC', borderColor: theme.border },
                nameFocused && { borderColor: theme.tint }
              ]}
              placeholder="John Doe"
              placeholderTextColor={theme.subtext}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

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
              editable={!loading}
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
              editable={!loading}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.signupBtn, { backgroundColor: theme.tint }, loading && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.signupBtnText}>Get Started</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={() => router.push("/login")} 
          style={styles.footerLink}
        >
          <Text style={[styles.footerText, { color: theme.subtext }]}>
            Already have an account? <Text style={{ color: theme.tint, fontWeight: '700' }}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  header: { alignItems: "flex-start", marginBottom: 32, marginTop: 40 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 22 },
  formContainer: { borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  inputWrapper: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 14, padding: 16, fontSize: 16 },
  errorText: { color: "#EF4444", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 16 },
  signupBtn: { height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 8 },
  signupBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
  footerLink: { marginTop: 32, alignItems: "center" },
  footerText: { fontSize: 15 },
})