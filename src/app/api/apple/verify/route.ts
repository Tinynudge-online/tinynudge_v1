import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUid } from '@/lib/api-auth';
import {
  APPLE_PREMIUM_PRODUCT_ID,
  applyAppleTransaction,
  findUidForAppleTransaction,
  isRetryableAppleError,
  verifySignedTransaction,
} from '@/lib/apple-iap';

// Called by the iOS app after a purchase or restore with the StoreKit 2
// transaction JWS. Verifies it with Apple's root certificates, checks it is our
// app/product and belongs to this account, then updates the user's entitlement.
export async function POST(req: NextRequest) {
  const uid = await getRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const signedTransaction = body?.signedTransaction;
  if (typeof signedTransaction !== 'string' || !signedTransaction || signedTransaction.length > 20000) {
    return NextResponse.json({ error: 'Missing signedTransaction' }, { status: 400 });
  }

  let verified: Awaited<ReturnType<typeof verifySignedTransaction>>;
  try {
    // Also checks the bundle id (and app Apple id in Production).
    verified = await verifySignedTransaction(signedTransaction);
  } catch (err) {
    console.error('apple/verify: verification failed', err);
    if (isRetryableAppleError(err)) {
      return NextResponse.json({ error: 'Verification temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Invalid transaction' }, { status: 400 });
  }
  const { transaction, environment } = verified;

  if (transaction.productId !== APPLE_PREMIUM_PRODUCT_ID) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  }

  try {
    const userSnap = await getAdminDb().collection('users').doc(uid).get();
    if (!userSnap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const userToken = String(userSnap.data()!.appleAccountToken ?? '').toLowerCase();
    const txToken = transaction.appAccountToken?.toLowerCase();

    // The purchase must belong to this TinyNudge account: its appAccountToken is
    // ours, or (e.g. a restore after the token's account was deleted, or an
    // offer-code purchase without a token) nobody else has claimed it.
    if (!txToken || txToken !== userToken) {
      const owner = await findUidForAppleTransaction(txToken, transaction.originalTransactionId);
      if (owner && owner !== uid) {
        return NextResponse.json(
          { error: 'This App Store subscription is linked to a different TinyNudge account.' },
          { status: 409 }
        );
      }
    }

    const result = await applyAppleTransaction(
      uid,
      transaction,
      null,
      environment,
      transaction.signedDate ?? Date.now()
    );
    return NextResponse.json({
      plan: result.plan === 'premium' ? 'premium' : 'free',
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    console.error('apple/verify failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
