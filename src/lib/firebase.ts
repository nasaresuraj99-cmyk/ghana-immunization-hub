import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getFirestore, 
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  enableIndexedDbPersistence
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-IZkSs3muNFkgKC2KMEbArhJXcg8lyAY",
  authDomain: "imu-tracker-system.firebaseapp.com",
  projectId: "imu-tracker-system",
  storageBucket: "imu-tracker-system.firebasestorage.app",
  messagingSenderId: "930304179796",
  appId: "1:930304179796:web:8310c25c0264c0b5a3b7c1",
  measurementId: "G-RM7BBL7PGK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser with support)
let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {
  // Analytics not supported
});

// Initialize Firestore with offline persistence
const db = getFirestore(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // Current browser doesn't support persistence
    console.warn('Firestore persistence not supported in this browser');
  }
});

// Initialize Auth with persistence
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence failed:', err);
});

// Auth helper functions
export const loginWithEmail = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signupWithEmail = async (email: string, password: string, displayName: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (result.user) {
    await updateProfile(result.user, { displayName });
    // Send email verification
    await sendEmailVerification(result.user);
  }
  return result;
};

export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
};

export const logout = async () => {
  return signOut(auth);
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { 
  app, 
  analytics, 
  db, 
  auth,
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query,
  where
};

export type { User };
