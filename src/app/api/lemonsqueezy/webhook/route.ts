import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { sendAccountEmail } from '@/lib/loops-server';
import type { LoopsTransactionalKey } from '@/lib/loops-transactional';
import { SEND_LS_OVERLAP_EMAILS } from '@/lib/email-config';
import { recomputePlan } from '@/lib/entitlements';

// Lemon Squeezy statuses after which the subscription won't bill again, so a
// new subscription may replace it as the user's current one.
const LS_REPLACEABLE_STATUSES = new Set(['expired', 'unpaid', 'cancelled']);

// Events that change the stored subscription's status.
const STATUS_EVENTS = new Set([
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  // Billing period has ended — status is 'expired', which revokes LS access.
  'subscription_expired',
  'subscription_payment_failed',
]);

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

  // A deleted account (/api/account/delete cancels the LS subscription, which
  // fires this webhook) must not be recreated or emailed.
  try {
    await getAdminAuth().getUser(userId);
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') return NextResponse.json({ ok: true });
    throw err;
  }

  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);

  // Only the Lemon Squeezy fields are written here; the plan itself is derived by
  // recomputePlan from both billing sources, so an LS event never downgrades a
  // user who is also subscribed through Apple in-app purchase (and vice versa).
  // Which LS statuses keep premium: see LS_ACTIVE_STATUSES in lib/entitlements.
  //
  // Each update runs in a transaction that checks the event belongs to the
  // subscription stored on the user, so a late or retried event for an older
  // subscription can't change the status of the current one.
  let outcome: 'applied' | 'ignored' | 'missing' = 'ignored';
  if (eventName === 'subscription_created') {
    outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.data() ?? {};
      const storedId = data.lsSubscriptionId != null ? String(data.lsSubscriptionId) : '';
      const storedStatus = String(data.subscriptionStatus ?? '');
      // Replace the stored subscription only when it won't bill again (or is the same one).
      if (storedId && storedId !== subscriptionId && !LS_REPLACEABLE_STATUSES.has(storedStatus)) {
        console.warn(
          `webhook: ignoring subscription_created ${subscriptionId} for ${userId}; subscription ${storedId} is still ${storedStatus}`
        );
        return 'ignored' as const;
      }
      tx.set(
        userRef,
        { lsCustomerId: customerId, lsSubscriptionId: subscriptionId, subscriptionStatus: status || 'active' },
        { merge: true }
      );
      return 'applied' as const;
    });
  } else if (STATUS_EVENTS.has(eventName)) {
    // subscription_payment_failed's data is the invoice; its subscription is in attributes.
    const eventSubscriptionId =
      eventName === 'subscription_payment_failed'
        ? String(payload.data?.attributes?.subscription_id ?? '')
        : subscriptionId;
    // 'cancelled' keeps premium — access continues until subscription_expired fires.
    // Payment failures keep premium during the dunning retry window; LS sends
    // subscription_expired if it can't be resolved.
    const nextStatus =
      eventName === 'subscription_expired'
        ? status || 'expired'
        : eventName === 'subscription_payment_failed'
          ? 'past_due'
          : status;
    outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      // Status changes only apply to an existing users doc, so a doc deleted
      // mid-flight isn't recreated.
      if (!snap.exists) return 'missing' as const;
      const data = snap.data() ?? {};
      const storedId = data.lsSubscriptionId != null ? String(data.lsSubscriptionId) : '';
      if (storedId && storedId !== eventSubscriptionId) {
        console.warn(
          `webhook: ignoring ${eventName} for subscription ${eventSubscriptionId} of ${userId}; current subscription is ${storedId}`
        );
        return 'ignored' as const;
      }
      tx.update(userRef, { subscriptionStatus: nextStatus });
      return 'applied' as const;
    });
  } else if (eventName === 'subscription_payment_recovered') {
    // No status change of its own (subscription_updated carries it); just email.
    outcome = 'applied';
  }

  if (outcome !== 'applied') return NextResponse.json({ ok: true });
  if (eventName !== 'subscription_payment_recovered') await recomputePlan(userId);

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
