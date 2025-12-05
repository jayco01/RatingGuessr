import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "ratingguessr-v1-37586.firebasestorage.app",
  messagingSenderId: "588102126784",
  appId: "1:588102126784:web:7611d4d0f853d7a6e6b125",
  measurementId: "G-9Z4TTTH5V4"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// only load Analytics on the Client Side
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export const db = getFirestore(app);
export { app, analytics };