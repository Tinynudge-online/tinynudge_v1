import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// Push services of the browsers we support (Chrome/Edge via FCM, Firefox, Safari, legacy Edge).
function isPushServiceEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port) return false;
  const host = url.hostname.toLowerCase();
  return (
    host === 'fcm.googleapis.com' ||
    host === 'updates.push.services.mozilla.com' ||
    host.endsWith('.push.apple.com') ||
    host.endsWith('.notify.windows.com')
  );
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  // Validate and extract only the expected Web Push subscription fields
  const { endpoint, keys, context } = body ?? {};
  if (
    typeof endpoint !== 'string' ||
    endpoint.length === 0 ||
    endpoint.length > 500 ||
    typeof keys?.auth !== 'string' ||
    typeof keys?.p256dh !== 'string' ||
    keys.auth.length > 256 ||
    keys.p256dh.length > 256
  ) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }
  // The daily reminder job POSTs to this URL, so only accept real push services.
  if (!isPushServiceEndpoint(endpoint)) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const db = getAdminDb();
  // Keyed by endpoint so re-subscribes are idempotent
  const key = Buffer.from(endpoint).toString('base64').slice(-40);
  const docId = `${uid}_${key}`;
  // An endpoint belongs to one browser; if it was registered under another
  // account (sign-out → sign-in as someone else), drop the old owner's record.
  const existing = await db.collection('push_subscriptions').where('subscription.endpoint', '==', endpoint).get();
  const batch = db.batch();
  existing.docs.forEach((d) => {
    if (d.id !== docId) batch.delete(d.ref);
  });
  batch.set(db.collection('push_subscriptions').doc(docId), {
    uid,
    subscription: { endpoint, keys: { auth: keys.auth, p256dh: keys.p256dh } },
    // Inside the Android app, reminder taps must reopen the site in app context.
    context: context === 'android-twa' ? 'android-twa' : 'web',
    updatedAt: new Date().toISOString(),
  });
  await batch.commit();

  return NextResponse.json({ ok: true });
}
