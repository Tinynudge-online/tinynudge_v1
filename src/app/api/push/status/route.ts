import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUid } from '@/lib/api-auth';

// Is THIS device registered for push under the signed-in account? A browser or phone can
// keep a push subscription from a previous account, so the device alone can't say whether
// the current account will receive reminders on it.
export async function POST(req: NextRequest) {
  const uid = await getRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const endpoint = typeof body.endpoint === 'string' && body.endpoint.length <= 500 ? body.endpoint : undefined;
  const fcmToken = typeof body.fcmToken === 'string' && body.fcmToken.length <= 4096 ? body.fcmToken : undefined;
  if (!endpoint && !fcmToken) return NextResponse.json({ error: 'endpoint or fcmToken required' }, { status: 400 });

  try {
    const db = getAdminDb();
    if (endpoint) {
      const snap = await db.collection('push_subscriptions').where('uid', '==', uid).get();
      const registered = snap.docs.some(d => (d.data() as { subscription?: { endpoint?: string } }).subscription?.endpoint === endpoint);
      return NextResponse.json({ registered });
    }
    const snap = await db.collection('fcm_tokens').where('uid', '==', uid).get();
    const registered = snap.docs.some(d => (d.data() as { token?: string }).token === fcmToken);
    return NextResponse.json({ registered });
  } catch (err) {
    console.error('push status failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
