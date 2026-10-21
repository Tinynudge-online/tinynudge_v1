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
