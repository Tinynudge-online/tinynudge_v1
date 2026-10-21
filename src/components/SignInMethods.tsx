'use client';

import React, { useState } from 'react';
import { Check, Heart } from 'lucide-react';
import { auth } from '@/app/firebase';
import { useAppContext } from '@/lib/app-context';
import {
  getLinkedProviders,
  isRelayEmail,
  linkApple,
  linkGoogle,
  linkPassword,
  type LinkResult,
} from '@/lib/link-accounts';

// Defined at module level so its identity is stable: a component created inside the card's
// render would remount on every keystroke and drop focus from the password box.
function Row({ label, linked, children }: { label: string; linked: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {linked ? (
        <span className="flex items-center gap-1 text-sm font-medium text-green-600"><Check className="w-4 h-4" />Connected</span>
      ) : children}
    </div>
  );
}

// "Sign-in methods" card for Account → Profile: shows which ways of signing in are connected
// to this account and lets the person add more, so the same account (and the same data) opens
// on the website, the Android app and the iPhone app.
export default function SignInMethods() {
  const appContext = useAppContext();
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [password, setPassword] = useState('');

  const providers = getLinkedProviders();
  const email = auth.currentUser?.email ?? null;
  const hasGoogle = providers.includes('google.com');
  const hasApple = providers.includes('apple.com');
  const hasPassword = providers.includes('password');
  const canAddPassword = !hasPassword && !!email && !isRelayEmail(email);

  const run = async (name: string, action: () => Promise<LinkResult>, done: string) => {
    if (busy) return;
    setBusy(name);
    setMessage(null);
    const result = await action();
    if (result.ok) {
      setMessage({ kind: 'ok', text: done });
      setPassword('');
    } else if (result.message) {
      setMessage({ kind: 'error', text: result.message });
    }
    setTick(t => t + 1);
    setBusy(null);
  };

  if (!appContext || !auth.currentUser) return null;

  const button = 'text-sm font-medium px-4 py-2 rounded-xl bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60 transition-colors';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
          <Heart className="w-4 h-4 text-white fill-white" />
        </div>
        Sign-in methods
      </h2>
      <p className="text-sm text-gray-500 mb-2">
        Connect more than one so your account, streak and Premium are the same on the website, the Android app and the iPhone app.
      </p>
      <div className="divide-y divide-gray-100">
        <Row label="Google" linked={hasGoogle}>
          <button type="button" className={button} disabled={!!busy} onClick={() => run('google', linkGoogle, 'Google is now connected.')}>
            {busy === 'google' ? 'Connecting…' : 'Connect Google'}
          </button>
        </Row>
        {(appContext === 'ios-app' || hasApple) && (
          <Row label="Apple" linked={hasApple}>
            <button type="button" className={button} disabled={!!busy} onClick={() => run('apple', linkApple, 'Apple is now connected.')}>
              {busy === 'apple' ? 'Connecting…' : 'Connect Apple'}
            </button>
          </Row>
        )}
        {(hasPassword || canAddPassword) && (
          <Row label={`Email & password${email ? ` (${email})` : ''}`} linked={hasPassword}>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); void run('password', () => linkPassword(password), 'Password added. You can now sign in with your email and password.'); }}
            >
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                aria-label="New password"
                className="w-36 sm:w-44 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button type="submit" className={button} disabled={!!busy || password.length < 6}>
                {busy === 'password' ? 'Adding…' : 'Add'}
              </button>
            </form>
          </Row>
        )}
      </div>
      {isRelayEmail(email) && !hasGoogle && (
        <p className="text-xs text-gray-500 mt-2">
          You signed in with Apple and chose to hide your email. Connect Google so you can also sign in on the website and the Android app.
        </p>
      )}
      <p className="text-xs text-gray-500 mt-3" aria-live="polite">
        {message && <span className={message.kind === 'ok' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{message.text}</span>}
      </p>
    </div>
  );
}
