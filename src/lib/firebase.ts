// Firebase setup for user and order records

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from 'firebase/storage'
import { signInAnonymously } from 'firebase/auth';

// Use env values; fall back to known defaults (dev only) so login/register still function if .env missing
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC5AYugEWA3kM2pIAYMTglBdkS7WpmtVTw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tea-stall-75f69.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tea-stall-75f69",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tea-stall-75f69.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "992180561408",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:992180561408:web:25b43900a3249f2d909ae5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8Y0HZSC07R"
};

// Reuse existing app in dev to avoid duplicate initialization errors during HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Guard analytics for browsers only (avoids errors in unsupported environments)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : undefined;
export const auth = getAuth(app);

// Enhanced Firebase initialization with better error handling
let authInitialized = false;
let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;

const initializeAuth = async () => {
  if (authInitialized) return;
  
  try {
    await signInAnonymously(auth);
    console.log('[Firebase] Signed in anonymously successfully');
    authInitialized = true;
    
    // Dispatch success event for UI feedback
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firebase-auth-success'));
    }
  } catch (error) {
    const errorMessage = error && (error as Error).message ? (error as Error).message : String(error);
    console.warn(`[Firebase] Anonymous sign-in failed (attempt ${authRetryCount + 1}/${MAX_AUTH_RETRIES}):`, errorMessage);
    
    // Retry with exponential backoff for transient errors
    if (authRetryCount < MAX_AUTH_RETRIES) {
      authRetryCount++;
      const delay = Math.pow(2, authRetryCount) * 1000; // 2s, 4s, 8s
      setTimeout(() => {
        initializeAuth();
      }, delay);
    } else {
      // After max retries, dispatch error for UI handling
      if (typeof window !== 'undefined') {
        const message = errorMessage.includes('permission') || errorMessage.includes('auth') 
          ? 'Missing or insufficient permissions'
          : 'Connection failed';
        window.dispatchEvent(new CustomEvent('firebase-auth-error', { 
          detail: { message, originalError: errorMessage } 
        }));
      }
    }
  }
};

if (import.meta.env.DEV) {
  const missing = Object.entries(firebaseConfig).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.warn('Missing Firebase config keys:', missing.join(', '));
  }
  // Debug: show which project you're connected to (keys are public in frontend anyway)
  // Remove this log for production if desired.
  console.log('[Firebase] Using project:', firebaseConfig.projectId, 'authDomain:', firebaseConfig.authDomain);
  
  // Initialize authentication with retry logic
  initializeAuth();
}

// Export the auth initialization function for manual retry
export { initializeAuth };

// Install Firebase using npm
// Run the following command in your project directory:
// npm install firebase
