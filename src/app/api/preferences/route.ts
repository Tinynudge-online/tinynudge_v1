import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUser } from '@/lib/api-auth';
import { syncContact } from '@/lib/loops-server';
import {
  BOOLEAN_PREFERENCE_KEYS,
  DEFAULT_EMAIL_PREFERENCES,
  NOTIFICATION_TIMES,
  type EmailPreferences,
} from '@/lib/email-preferences';

function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Saves the signed-in user's email preferences. The email address always comes
// from the verified token so it can't be pointed at someone else. Called on
// every sign-in (to create the doc with defaults and keep email/timezone fresh)
// and whenever a preference is changed.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.email) return NextResponse.json({ error: 'Account has no email' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const updates: Partial<EmailPreferences> = {};
  for (const key of BOOLEAN_PREFERENCE_KEYS) {
    if (typeof body[key] === 'boolean') updates[key] = body[key] as boolean;
  }
  if (typeof body.notificationTime === 'string' && NOTIFICATION_TIMES.includes(body.notificationTime)) {
    updates.notificationTime = body.notificationTime;
  }
  if (isValidTimezone(body.timezone)) updates.timezone = body.timezone;

  const db = getAdminDb();
  const ref = db.collection('user_preferences').doc(user.uid);

  try {
    const snap = await ref.get();
    const stored = snap.exists ? snap.data()! : {};
    const prefs = { ...DEFAULT_EMAIL_PREFERENCES };
    for (const key of Object.keys(DEFAULT_EMAIL_PREFERENCES) as (keyof EmailPreferences)[]) {
      if (typeof stored[key] === typeof prefs[key]) (prefs as Record<string, unknown>)[key] = stored[key];
    }
    Object.assign(prefs, updates);
    await ref.set({ ...prefs, email: user.email }, { merge: true });

    // Mirror to the Loops contact so Loops can filter on preferences too. Non-critical.
    await syncContact(user.email, prefs).catch(err =>
      console.error('preferences: Loops sync failed', err)
    );

    return NextResponse.json({ preferences: prefs });
  } catch (err) {
    console.error('preferences save failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
