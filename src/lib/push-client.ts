import { auth } from '@/app/firebase';

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

/**
 * Register the service worker, request push permission, and send the
 * subscription to the backend so it's stored in Firestore.
 * Safe to call after every login — idempotent on the backend.
 */
export async function registerPushNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return; // push not configured

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const token = await getToken();
    if (!token) return;

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch (err) {
    console.error('[push-client] registration failed:', err);
  }
}
