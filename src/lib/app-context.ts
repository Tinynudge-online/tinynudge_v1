import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export type AppContext = 'web' | 'android-twa' | 'ios-app';
export type PurchaseChannel = 'lemonsqueezy' | 'apple-iap' | 'none';

const TWA_REFERRER = 'android-app://online.tinynudge.app';
// sessionStorage only: the TWA shares Chrome's cookies/localStorage with the
// normal website, so persisting there would leak "app mode" into the browser.
const SESSION_KEY = 'tn_app_ctx';

function readSession(): string | null {
  try { return window.sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}

function writeSession(value: AppContext): void {
  try { window.sessionStorage.setItem(SESSION_KEY, value); } catch { /* storage blocked */ }
}

/** Detect where the app is running. Always 'web' during SSR. */
export function getAppContext(): AppContext {
  if (typeof window === 'undefined') return 'web';

  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') return 'ios-app';
  } catch { /* Capacitor unavailable */ }

  if (readSession() === 'android-twa') return 'android-twa';

  let fromTwa = false;
  try {
    fromTwa = new URLSearchParams(window.location.search).get('source') === 'twa';
  } catch { /* ignore */ }
  if (!fromTwa && typeof document !== 'undefined' && document.referrer.startsWith(TWA_REFERRER)) {
    fromTwa = true;
  }

  if (fromTwa) {
    writeSession('android-twa');
    return 'android-twa';
  }
  return 'web';
}

/** App context for React components; null until mounted on the client. */
export function useAppContext(): AppContext | null {
  const [ctx, setCtx] = useState<AppContext | null>(null);
  useEffect(() => { setCtx(getAppContext()); }, []);
  return ctx;
}

export function getPurchaseChannel(ctx: AppContext): PurchaseChannel {
  if (ctx === 'web') return 'lemonsqueezy';
  if (ctx === 'ios-app') return 'apple-iap';
  return 'none';
}

export function isNativeApp(ctx: AppContext): boolean {
  return ctx !== 'web';
}
