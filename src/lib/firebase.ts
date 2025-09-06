// Firebase setup for user and order records

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC5AYugEWA3kM2pIAYMTglBdkS7WpmtVTw",
  authDomain: "tea-stall-75f69.firebaseapp.com",
  projectId: "tea-stall-75f69",
  storageBucket: "tea-stall-75f69.firebasestorage.app",
  messagingSenderId: "992180561408",
  appId: "1:992180561408:web:25b43900a3249f2d909ae5",
  measurementId: "G-8Y0HZSC07R"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Install Firebase using npm
// Run the following command in your project directory:
// npm install firebase
