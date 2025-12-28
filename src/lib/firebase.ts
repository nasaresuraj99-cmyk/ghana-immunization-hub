import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from "firebase/firestore";

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

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});

export { 
  app, 
  analytics, 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc
};
