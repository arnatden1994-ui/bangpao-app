import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configuration from Firebase Console for project: Bangpao Public Health
export const firebaseConfig = {
  apiKey: "AIzaSyB6Z6Z_sE4eH6tszOhwT_YPP_SjjyYsfk8",
  authDomain: "bangpao-public-health.firebaseapp.com",
  projectId: "bangpao-public-health",
  storageBucket: "bangpao-firebasestorage.app",
  messagingSenderId: "720645763738",
  appId: "1:720645763738:web:09b1c21c715bc54187a523",
  measurementId: "G-0EHF4B50PK"
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
