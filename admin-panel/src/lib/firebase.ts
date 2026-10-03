import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD1s2_MLw413Y4XNFel3TjxYDMgU9kXIQw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "boxwood-atom-476404-b5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "boxwood-atom-476404-b5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "boxwood-atom-476404-b5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "917898093765",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:917898093765:web:b3fb32d82d0c4cf9657cac"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
