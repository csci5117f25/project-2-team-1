import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAUsn_hkxg7FmiQPt89s-r8S24A4MDIlVk",
  authDomain: "gyst-1ba35.firebaseapp.com",
  projectId: "gyst-1ba35",
  storageBucket: "gyst-1ba35.firebasestorage.app",
  messagingSenderId: "483812494206",
  appId: "1:483812494206:web:cbbab26bfdea6d5868012f"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
