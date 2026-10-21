import { auth } from '@/app/firebase';
import { SERVICE_WORKER_URL, VAPID_PUBLIC_KEY } from '@/lib/push-config';
import { getAppContext } from '@/lib/app-context';

async function getToken(): Promise<string | null> {
  try { return (await auth.currentUser?.getIdToken()) ?? null; } catch { return null; }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
}

function sameKey(a: ArrayBuffer | null | undefined, b: ArrayBuffer): boolean {
  if (!a) return true; // browser doesn't expose the key — assume it matches
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function hasServiceWorker(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/** True when this browser can receive Web Push (service worker + PushManager + Notification). */
export function isWebPushSupported(): boolean {
  return hasServiceWorker() && 'PushManager' in window && 'Notification' in window;
}

/**
 * Register the service worker (offline page + push handling).
 * Call on every page load — does NOT ask for notification permission.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!hasServiceWorker()) return null;
  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  } catch (err) {
    console.error('[push-client] service worker registration failed:', err);
    return null;
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!hasServiceWorker()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? (await registerServiceWorker());
}

/** True if this device already has an active push subscription and permission is granted. */
export async function isWebPushEnabled(): Promise<boolean> {
  if (!isWebPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return false;

    // The browser may still hold a subscription saved under a previous account, so ask
    // the backend whether the signed-in account has this device registered. If that check
    // can't run (offline), trust the browser rather than show a misleading "off".
    const token = await getToken();
    if (!token) return true;
    const res = await fetch('/api/push/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => null);
    if (!res?.ok) return true;
    return (await res.json()).registered === true;
  } catch {
    return false;
  }
}

/**
 * Request notification permission, subscribe this device to Web Push, and
 * send the subscription to the backend (stored in Firestore).
 * Must be called from an explicit user action (button tap).
 * Idempotent on the backend. Resolves true when push is enabled.
 */
export async function enableWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;

  try {
    const registration = await getRegistration();
    if (!registration) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const serverKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();
    // Drop a subscription made with a different (old) VAPID key — the server couldn't send to it
    if (subscription && !sameKey(subscription.options.applicationServerKey, serverKey)) {
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: serverKey,
      });
    }

    const token = await getToken();
    if (!token) return false;

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // context lets the server send TWA reminders a link that keeps the in-app context.
      body: JSON.stringify({ ...subscription.toJSON(), context: getAppContext() }),
    });
    return res.ok;
  } catch (err) {
    console.error('[push-client] enabling push failed:', err);
    return false;
  }
}

/**
 * Remove this device's push subscription from the backend and the browser.
 * Resolves true when the device is no longer subscribed.
 */
export async function disableWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return true;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return true;

    const token = await getToken();
    if (token) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch((err) => console.error('[push-client] backend unsubscribe failed:', err));
    }

    return await subscription.unsubscribe();
  } catch (err) {
    console.error('[push-client] disabling push failed:', err);
    return false;
  }
}

/**
 * @deprecated Use enableWebPush() from an explicit button, and
 * registerServiceWorker() on load. Kept for compatibility.
 */
export async function registerPushNotifications(): Promise<void> {
  await enableWebPush();
}
