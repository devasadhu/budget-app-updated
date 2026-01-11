import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyB4XRLYPYw7g9HP3BRnob8GPB3vJiSJMns",
  authDomain: "budget-ab2e2.firebaseapp.com",
  projectId: "budget-ab2e2",
  storageBucket: "budget-ab2e2.firebasestorage.app",
  messagingSenderId: "130513705228",
  appId: "1:130513705228:web:a4f22c9c5fc651454fd129",
  measurementId: "G-4MCSZQ46DM"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = (() => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  } else {
    try {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (e) {
      return getAuth(app); 
    }
  }
})();

export const db = getFirestore(app);