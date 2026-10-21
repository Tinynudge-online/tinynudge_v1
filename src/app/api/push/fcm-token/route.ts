import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUid } from '@/lib/api-auth';

const PLATFORMS = ['ios'] as const;

function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Doc id for a device token: fcm_tokens/{uid}_{hash}.
function fcmTokenDocId(uid: string, token: string): string {
  return `${uid}_${createHash('sha256').update(token).digest('hex').slice(0, 40)}`;
}

// Stores the native app's FCM registration token so the daily reminder can be
// pushed to this device. Re-registering the same token is idempotent.
export async function POST(req: NextRequest) {
  const uid = await getRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { token, platform, timezone } = body;
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > 4096 ||
    !PLATFORMS.includes(platform as (typeof PLATFORMS)[number])
  ) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    // A token belongs to one device; if it was registered under another account
    // (sign-out → sign-in as someone else), drop the old owner's record.
    const existing = await db.collection('fcm_tokens').where('token', '==', token).get();
    const docId = fcmTokenDocId(uid, token);
    const batch = db.batch();
    existing.docs.forEach((d) => {
      if (d.id !== docId) batch.delete(d.ref);
    });
    batch.set(db.collection('fcm_tokens').doc(docId), {
      uid,
      token,
      platform,
      ...(isValidTimezone(timezone) && { timezone }),
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('fcm-token save failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
