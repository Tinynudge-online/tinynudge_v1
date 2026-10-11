import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

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

  const body = await req.json();

  // Validate and extract only the expected Web Push subscription fields
  const { endpoint, keys } = body ?? {};
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

  const db = getAdminDb();
  // Keyed by endpoint so re-subscribes are idempotent
  const key = Buffer.from(endpoint).toString('base64').slice(-40);
  await db.collection('push_subscriptions').doc(`${uid}_${key}`).set({
    uid,
    subscription: { endpoint, keys: { auth: keys.auth, p256dh: keys.p256dh } },
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
