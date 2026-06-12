import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const getAuthDomain = () => {
  if (typeof window === 'undefined') return 'tinynudge-38b25.firebaseapp.com'
  const hostname = window.location.hostname
  if (hostname === 'www.tinynudge.online') return 'www.tinynudge.online'
  return 'tinynudge-38b25.firebaseapp.com'
}

const firebaseConfig = {
  apiKey: "AIzaSyCdOs4Et9B--kZQLpbMaTKAgnsLrBlSBBo",
  authDomain: getAuthDomain(),
  projectId: "tinynudge-38b25",
  storageBucket: "tinynudge-38b25.firebasestorage.app",
  messagingSenderId: "169555706895",
  appId: "1:169555706895:web:c2ff8f37837e77473bcf7a",
  measurementId: "G-ZX6KVDYLH0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
