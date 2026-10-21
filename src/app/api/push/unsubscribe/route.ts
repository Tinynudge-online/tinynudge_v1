import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUid } from '@/lib/api-auth';

// Removes one device's push record for the signed-in user: a web push
// subscription (by endpoint) and/or a native FCM token. Only the caller's own
// records are touched. Succeeds even if nothing matched.
export async function POST(req: NextRequest) {
  const uid = await getRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const endpoint = typeof body.endpoint === 'string' && body.endpoint.length <= 500 ? body.endpoint : undefined;
  const fcmToken = typeof body.fcmToken === 'string' && body.fcmToken.length <= 4096 ? body.fcmToken : undefined;
  if (!endpoint && !fcmToken) {
    return NextResponse.json({ error: 'endpoint or fcmToken required' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const [webSnap, fcmSnap] = await Promise.all([
      endpoint
        ? db.collection('push_subscriptions').where('uid', '==', uid).get()
        : Promise.resolve(null),
      fcmToken
        ? db.collection('fcm_tokens').where('uid', '==', uid).get()
        : Promise.resolve(null),
    ]);

    const batch = db.batch();
    let removed = 0;
    webSnap?.docs.forEach((d) => {
      const sub = (d.data() as { subscription?: { endpoint?: string } }).subscription;
      if (sub?.endpoint === endpoint) { batch.delete(d.ref); removed++; }
    });
    fcmSnap?.docs.forEach((d) => {
      if ((d.data() as { token?: string }).token === fcmToken) { batch.delete(d.ref); removed++; }
    });
    if (removed > 0) await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('push unsubscribe failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
