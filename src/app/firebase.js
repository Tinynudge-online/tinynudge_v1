import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: "AIzaSyCdOs4Et9B--kZQLpbMaTKAgnsLrBlSBBo",
  authDomain: "tinynudge-38b25.firebaseapp.com",
  projectId: "tinynudge-38b25",
  storageBucket: "tinynudge-38b25.firebasestorage.app",
  messagingSenderId: "169555706895",
  appId: "1:169555706895:web:c2ff8f37837e77473bcf7a",
  measurementId: "G-ZX6KVDYLH0"
};

// True only inside the Capacitor iOS/Android shell (never during SSR or on the website).
const isNative = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

const app = initializeApp(firebaseConfig);
// In the native shell, getAuth's default browser persistence/popup resolver doesn't work
// reliably in WKWebView, so use IndexedDB persistence (sign-in happens via native SDKs).
export const auth = isNative
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);
export const db = getFirestore(app);
// Firebase Analytics sets cookies, so it starts only after the cookie banner
// (CookieYes) has run: layout.tsx resolves window.__tnConsentReady for that,
// with false inside the apps (no consent banner there, so no analytics).
export const analytics =
  typeof window !== 'undefined' && !isNative
    ? (window.__tnConsentReady || Promise.resolve())
        .then((allowed) => (allowed === false ? null : getAnalytics(app)))
        .catch(() => null)
    : null;
