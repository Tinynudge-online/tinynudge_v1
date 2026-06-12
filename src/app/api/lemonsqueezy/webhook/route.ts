import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const digest = createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (!timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName: string = payload.meta?.event_name ?? '';
  const userId: string | undefined = payload.meta?.custom_data?.user_id;
  const subscriptionId: string = String(payload.data?.id ?? '');
  const customerId: string = String(payload.data?.attributes?.customer_id ?? '');
  const status: string = payload.data?.attributes?.status ?? '';

  if (!userId) return NextResponse.json({ ok: true });

  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);

  if (eventName === 'subscription_created') {
    await userRef.set(
      { plan: 'premium', lsCustomerId: customerId, lsSubscriptionId: subscriptionId, subscriptionStatus: status },
      { merge: true }
    );
  } else if (
    eventName === 'subscription_updated' ||
    eventName === 'subscription_cancelled' ||
    eventName === 'subscription_expired' ||
    eventName === 'subscription_resumed'
  ) {
    const isPremium = status === 'active' || status === 'past_due';
    await userRef.set(
      { plan: isPremium ? 'premium' : 'free', subscriptionStatus: status },
      { merge: true }
    );
  }

  return NextResponse.json({ ok: true });
}
