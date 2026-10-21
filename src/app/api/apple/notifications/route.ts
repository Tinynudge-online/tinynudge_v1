import { NextRequest, NextResponse } from 'next/server';
import {
  APPLE_PREMIUM_PRODUCT_ID,
  applyAppleTransaction,
  decodeNotificationData,
  findUidForAppleTransaction,
  isRetryableAppleError,
  verifySignedNotification,
} from '@/lib/apple-iap';

// App Store Server Notifications V2 endpoint (no auth — the payload is signed by
// Apple and verified against Apple's root certificates). Set this URL as both the
// Production and Sandbox server URL in App Store Connect:
//   https://www.tinynudge.online/api/apple/notifications
//
// Handled: SUBSCRIBED, DID_RENEW, EXPIRED, DID_FAIL_TO_RENEW (grace period /
// billing retry), GRACE_PERIOD_EXPIRED, REFUND, REVOKE, REFUND_REVERSED,
// DID_CHANGE_RENEWAL_STATUS, DID_CHANGE_RENEWAL_PREF, OFFER_REDEEMED,
// RENEWAL_EXTENDED. The entitlement is derived from the signed transaction and
// renewal info themselves, so the type mostly matters for logging.
const HANDLED_TYPES = new Set([
  'SUBSCRIBED',
  'DID_RENEW',
  'EXPIRED',
  'DID_FAIL_TO_RENEW',
  'GRACE_PERIOD_EXPIRED',
  'REFUND',
  'REVOKE',
  'REFUND_REVERSED',
  'DID_CHANGE_RENEWAL_STATUS',
  'DID_CHANGE_RENEWAL_PREF',
  'OFFER_REDEEMED',
  'RENEWAL_EXTENDED',
]);

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const signedPayload = body?.signedPayload;
  if (typeof signedPayload !== 'string' || !signedPayload) {
    return NextResponse.json({ error: 'Missing signedPayload' }, { status: 400 });
  }

  let verified: Awaited<ReturnType<typeof verifySignedNotification>>;
  let decoded: Awaited<ReturnType<typeof decodeNotificationData>>;
  try {
    verified = await verifySignedNotification(signedPayload);
    decoded = await decodeNotificationData(verified.notification);
  } catch (err) {
    console.error('apple/notifications: verification failed', err);
    // A non-2xx makes Apple retry later, which is what we want for transient failures.
    if (isRetryableAppleError(err)) {
      return NextResponse.json({ error: 'Verification temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { notification, environment } = verified;
  const { transaction, renewalInfo } = decoded;
  const type = notification.notificationType ?? '';
  const subtype = notification.subtype ?? '';

  if (!HANDLED_TYPES.has(type) || !transaction) {
    // TEST, PRICE_INCREASE, CONSUMPTION_REQUEST, etc. — nothing to update.
    console.log(`apple/notifications: ignored ${type}${subtype ? `/${subtype}` : ''} (${environment})`);
    return NextResponse.json({ ok: true });
  }
  if (transaction.productId !== APPLE_PREMIUM_PRODUCT_ID) {
    console.warn(`apple/notifications: ignored ${type} for unknown product ${transaction.productId}`);
    return NextResponse.json({ ok: true });
  }

  try {
    const uid = await findUidForAppleTransaction(
      transaction.appAccountToken ?? renewalInfo?.appAccountToken,
      transaction.originalTransactionId
    );
    if (!uid) {
      // e.g. the account was deleted, or the purchase hasn't been verified by the app yet
      // (the app's /api/apple/verify call will link it).
      console.warn(`apple/notifications: no user for ${type} originalTransactionId=${transaction.originalTransactionId}`);
      return NextResponse.json({ ok: true });
    }

    const result = await applyAppleTransaction(
      uid,
      transaction,
      renewalInfo,
      environment,
      notification.signedDate ?? transaction.signedDate ?? Date.now(),
      'notification'
    );
    console.log(
      `apple/notifications: ${type}${subtype ? `/${subtype}` : ''} uid=${uid} plan=${result.plan} ` +
        `expiresAt=${result.expiresAt} applied=${result.applied} (${environment})`
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`apple/notifications: ${type} failed`, err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
