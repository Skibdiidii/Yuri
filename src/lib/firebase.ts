import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAuSAJNKtudSpIg1Z4CKp5DpJsvUrIUPnk",
  authDomain: "ngxcbb-84108.firebaseapp.com",
  projectId: "ngxcbb-84108",
  storageBucket: "ngxcbb-84108.firebasestorage.app",
  messagingSenderId: "506280326599",
  appId: "1:506280326599:web:1c2332f9554127d60755e2",
  measurementId: "G-LCH1Z5JMVX"
};


const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);
export const auth = getAuth(app);


export const analytics = typeof window !== 'undefined' ? isSupported().then(supported => supported ? getAnalytics(app) : null) : null;

export default app;
