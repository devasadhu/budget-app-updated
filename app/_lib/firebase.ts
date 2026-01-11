import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  getReactNativePersistence, 
  Auth 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "your-firebase-api-key",
  authDomain: "smartbudget-53476.firebaseapp.com",
  projectId: "smartbudget-53476",
  storageBucket: "smartbudget-53476.firebasestorage.app",
  messagingSenderId: "613170777672",
  appId: "1:613170777672:web:840734dd75858de924527d",
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