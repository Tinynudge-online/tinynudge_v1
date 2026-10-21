import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  revokeAccessToken,
  signInWithCredential,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/app/firebase';
import { getAppContext } from '@/lib/app-context';

function assertIosApp(): void {
  if (getAppContext() !== 'ios-app') throw new Error('Native sign-in is only available in the iOS app.');
}

/**
 * Google sign-in through the native SDK (Google blocks OAuth inside WKWebView),
 * then hand the ID token to the Firebase JS SDK so the web layer owns the session.
 */
export async function nativeSignInWithGoogle(): Promise<UserCredential> {
  assertIosApp();
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error('Google sign-in did not return an ID token.');
  const credential = GoogleAuthProvider.credential(idToken, result.credential?.accessToken ?? null);
  return signInWithCredential(auth, credential);
}

/** Sign in with Apple through the native sheet, then sign in to Firebase JS with the raw nonce. */
export async function nativeSignInWithApple(): Promise<UserCredential> {
  assertIosApp();
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  const rawNonce = result.credential?.nonce;
  if (!idToken) throw new Error('Apple sign-in did not return an ID token.');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken, rawNonce });
  return signInWithCredential(auth, credential);
}

/** The sign-in methods linked to the current user (e.g. 'password', 'google.com', 'apple.com'). */
export function getSignInProviders(): string[] {
  return auth.currentUser?.providerData.map((p) => p.providerId) ?? [];
}

/**
 * Re-verify the signed-in user before an irreversible action (account deletion
 * requires a sign-in from the last few minutes). Uses the native sheets in the
 * iOS app and a popup (or the password) on the web. Throws if the user cancels.
 *
 * For Sign in with Apple users in the iOS app it also returns Apple's
 * authorization code, which revokeAppleSignIn() needs.
 */
export async function reauthenticateCurrentUser(password?: string): Promise<{ appleAuthorizationCode: string | null }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const providers = getSignInProviders();
  const isIos = getAppContext() === 'ios-app';

  if (isIos && providers.includes('apple.com')) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error('Apple sign-in did not return an ID token.');
    const credential = new OAuthProvider('apple.com').credential({ idToken, rawNonce: result.credential?.nonce });
    await reauthenticateWithCredential(user, credential);
    return { appleAuthorizationCode: result.credential?.authorizationCode ?? null };
  }

  if (providers.includes('google.com')) {
    if (isIos) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('Google sign-in did not return an ID token.');
      await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken, result.credential?.accessToken ?? null));
    } else {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
    }
    return { appleAuthorizationCode: null };
  }

  if (providers.includes('password')) {
    if (!user.email || !password) throw new Error('Please enter your password.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return { appleAuthorizationCode: null };
  }

  throw new Error('Please sign in again in the app you used to create your account, then try again.');
}

/**
 * Revokes the app's Sign in with Apple tokens (required by App Review when an
 * account is deleted). Needs the Apple provider in Firebase Auth configured
 * with the Services ID, Team ID, Key ID and private key.
 */
export async function revokeAppleSignIn(authorizationCode: string): Promise<void> {
  await revokeAccessToken(auth, authorizationCode);
}

/**
 * Sign out of the native Google / Apple session too (iOS app), so the next sign-in
 * on a shared device doesn't silently reuse the previous account. No-op elsewhere.
 */
export async function nativeSignOut(): Promise<void> {
  if (getAppContext() !== 'ios-app') return;
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.signOut();
  } catch (err) {
    console.error('[native-auth] sign-out failed:', err);
  }
}
