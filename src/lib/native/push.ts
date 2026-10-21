import { auth } from '@/app/firebase';
import { getAppContext } from '@/lib/app-context';

/**
 * Ask for notification permission (call only from an explicit button) and
 * register this device's FCM token with the backend. iOS app only.
 */
export async function enableNativePush(): Promise<boolean> {
  if (getAppContext() !== 'ios-app') return false;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const permission = await FirebaseMessaging.requestPermissions();
    if (permission.receive !== 'granted') return false;

    const { token: fcmToken } = await FirebaseMessaging.getToken();
    if (!fcmToken) return false;

    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return false;

    const res = await fetch('/api/push/fcm-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ token: fcmToken, platform: 'ios' }),
    });
    return res.ok;
  } catch (err) {
    console.error('[native-push] enable failed:', err);
    return false;
  }
}

/** This device's FCM token if notifications are already allowed (never prompts), else null. iOS app only. */
export async function getNativePushToken(): Promise<string | null> {
  if (getAppContext() !== 'ios-app') return null;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const { receive } = await FirebaseMessaging.checkPermissions();
    if (receive !== 'granted') return null;
    const { token } = await FirebaseMessaging.getToken();
    return token || null;
  } catch (err) {
    console.error('[native-push] token lookup failed:', err);
    return null;
  }
}

/** Is this device's token registered for the signed-in account? */
export async function isNativePushRegistered(): Promise<boolean> {
  const fcmToken = await getNativePushToken();
  const idToken = await auth.currentUser?.getIdToken();
  if (!fcmToken || !idToken) return false;
  const res = await fetch('/api/push/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fcmToken }),
  }).catch(() => null);
  return !!res?.ok && (await res.json()).registered === true;
}

/**
 * Stop notifications on this device for the signed-in account: remove the token from the
 * backend and delete it on the device. Used by "Turn off" and on sign-out. iOS app only.
 */
export async function disableNativePush(): Promise<boolean> {
  if (getAppContext() !== 'ios-app') return true;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const fcmToken = await getNativePushToken();
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken && fcmToken) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ fcmToken }),
      }).catch((err) => console.error('[native-push] backend unsubscribe failed:', err));
    }
    await FirebaseMessaging.deleteToken();
    return true;
  } catch (err) {
    console.error('[native-push] disable failed:', err);
    return false;
  }
}
