import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { sendAccountEmail } from '@/lib/loops-server';
import type { LoopsTransactionalKey } from '@/lib/loops-transactional';
import { SEND_LS_OVERLAP_EMAILS } from '@/lib/email-config';

// Lemon Squeezy statuses that mean the subscription is still active/accessible.
// 'cancelled' = user cancelled but billing period hasn't ended yet — keep access.
// 'past_due'  = payment failed, dunning in progress — keep access during retry window.
const ACTIVE_STATUSES = new Set(['active', 'past_due', 'cancelled']);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const digest = createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!.trim())
    .update(rawBody)
    .digest('hex');

  const digestBuffer = Buffer.from(digest, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  if (digestBuffer.length !== signatureBuffer.length || !timingSafeEqual(digestBuffer, signatureBuffer)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
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
    eventName === 'subscription_resumed'
  ) {
    // 'cancelled' keeps plan='premium' — access continues until subscription_expired fires.
    const isPremium = ACTIVE_STATUSES.has(status);
    await userRef.set(
      { plan: isPremium ? 'premium' : 'free', subscriptionStatus: status },
      { merge: true }
    );
  } else if (eventName === 'subscription_expired') {
    // Billing period has ended — revoke access now.
    await userRef.set({ plan: 'free', subscriptionStatus: status }, { merge: true });
  } else if (eventName === 'subscription_payment_failed') {
    // Keep premium during the dunning retry window; LS will send subscription_expired if unresolvable.
    await userRef.set({ subscriptionStatus: 'past_due' }, { merge: true });
  }

  await sendBillingEmail(eventName, userId, String(payload.data?.id ?? ''), payload.data?.attributes ?? {});

  return NextResponse.json({ ok: true });
}

// Lemon Squeezy event → Loops transactional (billing) email. These are account
// emails, so they're sent regardless of the user's marketing preferences.
const BILLING_EMAILS: Partial<Record<string, LoopsTransactionalKey>> = {
  subscription_created: 'premium_started',
  subscription_payment_failed: 'payment_failed',
  subscription_payment_recovered: 'payment_recovered',
  subscription_cancelled: 'subscription_cancelled',
  subscription_resumed: 'subscription_resumed',
  subscription_expired: 'subscription_expired',
};

function formatDate(iso: unknown): string | undefined {
  if (typeof iso !== 'string' || !iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// The signed "update payment method" URL for a subscription (falls back to the
// customer portal). Fetched at send time because these URLs expire.
async function getUpdatePaymentUrl(subscriptionId: unknown): Promise<string | undefined> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey || (typeof subscriptionId !== 'string' && typeof subscriptionId !== 'number')) return undefined;
  try {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(String(subscriptionId))}`, {
      headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return undefined;
    const urls = (await res.json())?.data?.attributes?.urls;
    const url = urls?.update_payment_method || urls?.customer_portal;
    return typeof url === 'string' && url ? url : undefined;
  } catch {
    return undefined;
  }
}

async function sendBillingEmail(lsEvent: string, userId: string, objectId: string, attributes: Record<string, any>) {
  const key = BILLING_EMAILS[lsEvent];
  if (!key) return;
  if (key in SEND_LS_OVERLAP_EMAILS && !SEND_LS_OVERLAP_EMAILS[key as keyof typeof SEND_LS_OVERLAP_EMAILS]) return;
  // Never fail the webhook because of an email problem — LS would keep retrying.
  try {
    // Use the account email so it matches the user's Loops contact.
    const account = await getAdminAuth().getUser(userId);
    const email = account.email ?? attributes.user_email;
    if (!email) return;

    // Send exactly the variables each template uses (see scripts/loops/emails.mjs).
    const dataVariables: Record<string, string> = {
      firstName: account.displayName?.trim().split(/\s+/)[0] || 'there',
    };
    if (key === 'subscription_cancelled') {
      dataVariables.accessEndsDate = formatDate(attributes.ends_at) ?? 'the end of your billing period';
    }
    if (key === 'payment_failed') {
      // This event's payload is the invoice, which has no payment-update link,
      // so fetch it from the subscription.
      dataVariables.updatePaymentUrl =
        (await getUpdatePaymentUrl(attributes.subscription_id)) ?? 'https://www.tinynudge.online';
    }

    // Lemon Squeezy retries webhooks; the key makes Loops drop duplicate sends.
    const idempotencyKey = `ls:${lsEvent}:${objectId}:${attributes.updated_at ?? ''}`;
    await sendAccountEmail(key, email, dataVariables, idempotencyKey);
  } catch (err) {
    console.error(`webhook: billing email ${key} failed`, err);
  }
}
