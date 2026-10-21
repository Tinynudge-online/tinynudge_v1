import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  linkWithCredential,
  linkWithPopup,
} from 'firebase/auth';
import { auth } from '@/app/firebase';
import { getAppContext } from '@/lib/app-context';
import { friendlyAuthMessage } from '@/lib/auth-errors';

// Adding a sign-in method to the CURRENT account (Account → Sign-in methods). This keeps one
// account, and one set of data, whichever way someone signs in on the website, the Android
// app or the iPhone app. Example: an iPhone user who chose Apple's "Hide My Email" links
// Google here, so signing in with Google on the website opens the same account.

export type LinkResult = { ok: true } | { ok: false; message: string };

export type LinkableProvider = 'google.com' | 'apple.com' | 'password';

export function getLinkedProviders(): string[] {
  return auth.currentUser?.providerData.map((p) => p.providerId) ?? [];
}

/** Apple's "Hide My Email" addresses can't be used to sign in with a password. */
export function isRelayEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@privaterelay.appleid.com');
}

function describeLinkError(error: unknown, label: string): LinkResult {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled') {
    return { ok: false, message: '' }; // the person cancelled: say nothing
  }
  if (code === 'auth/credential-already-in-use') {
    return { ok: false, message: `That ${label} account is already used by a different TinyNudge account, so it can't be added here. Sign in with it instead, or use another ${label} account.` };
  }
  if (code === 'auth/provider-already-linked') return { ok: true };
  if (code === 'auth/requires-recent-login') {
    return { ok: false, message: 'For your security, please sign out and sign in again, then try once more.' };
  }
  if (code === 'auth/popup-blocked') {
    return { ok: false, message: 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.' };
  }
  const friendly = friendlyAuthMessage(error);
  if (friendly) return { ok: false, message: friendly };
  console.error(`Linking ${label} failed:`, error);
  return { ok: false, message: `Couldn't add ${label}. Please try again.` };
}

export async function linkGoogle(): Promise<LinkResult> {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: 'Please sign in again.' };
  try {
    if (getAppContext() === 'ios-app') {
      // Google blocks OAuth inside the iPhone web view, so use the native sheet.
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
      const idToken = result.credential?.idToken;
      if (!idToken) return { ok: false, message: "Couldn't add Google. Please try again." };
      await linkWithCredential(user, GoogleAuthProvider.credential(idToken, result.credential?.accessToken ?? null));
    } else {
      await linkWithPopup(user, new GoogleAuthProvider());
    }
    await user.reload();
    return { ok: true };
  } catch (error) {
    return describeLinkError(error, 'Google');
  }
}

/** iPhone app only (Sign in with Apple on the website needs extra Apple setup). */
export async function linkApple(): Promise<LinkResult> {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: 'Please sign in again.' };
  if (getAppContext() !== 'ios-app') return { ok: false, message: 'Apple can be added from the iPhone app.' };
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
    const idToken = result.credential?.idToken;
    if (!idToken) return { ok: false, message: "Couldn't add Apple. Please try again." };
    const credential = new OAuthProvider('apple.com').credential({ idToken, rawNonce: result.credential?.nonce });
    await linkWithCredential(user, credential);
    await user.reload();
    return { ok: true };
  } catch (error) {
    return describeLinkError(error, 'Apple');
  }
}

export async function linkPassword(password: string): Promise<LinkResult> {
  const user = auth.currentUser;
  if (!user?.email) return { ok: false, message: 'This account has no email address to use for a password.' };
  if (isRelayEmail(user.email)) {
    return { ok: false, message: 'Your Apple sign-in hides your email, so add Google instead.' };
  }
  if (password.length < 6) return { ok: false, message: 'Please choose a password with at least 6 characters.' };
  try {
    await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
    await user.reload();
    return { ok: true };
  } catch (error) {
    return describeLinkError(error, 'password');
  }
}
