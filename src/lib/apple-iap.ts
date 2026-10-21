import {
  Environment,
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
} from '@apple/app-store-server-library';
import { getAdminDb } from '@/lib/firebase-admin';
import { computePlan, planUpdates, type Plan } from '@/lib/entitlements';
import { getAppleRootCertificates } from '@/lib/apple-certs';

// App Store identifiers (see STORE contracts).
export const APPLE_BUNDLE_ID = 'online.tinynudge.app';
export const APPLE_PREMIUM_PRODUCT_ID = 'online.tinynudge.premium.monthly';

// Environment variables:
//   APPLE_APP_APPLE_ID  The app's numeric Apple ID (App Store Connect > App
//                       Information > Apple ID). REQUIRED to verify Production
//                       (real App Store) purchases. Without it only Sandbox
//                       (TestFlight / App Review) purchases can be verified.

export type AppleSubscriptionStatus = 'active' | 'grace_period' | 'billing_retry' | 'expired' | 'revoked';

type VerifierEntry = { environment: Environment; verifier: SignedDataVerifier };

let verifiers: VerifierEntry[] | null = null;

// Production first, then Sandbox: TestFlight and App Review always use Sandbox,
// even against the production server. Verifiers are cached per instance so the
// library's verified-certificate cache is reused between requests.
function getVerifiers(): VerifierEntry[] {
  if (verifiers) return verifiers;
  const roots = getAppleRootCertificates();
  const list: VerifierEntry[] = [];
  const appAppleId = Number(process.env.APPLE_APP_APPLE_ID?.trim());
  if (Number.isInteger(appAppleId) && appAppleId > 0) {
    list.push({
      environment: Environment.PRODUCTION,
      verifier: new SignedDataVerifier(roots, true, Environment.PRODUCTION, APPLE_BUNDLE_ID, appAppleId),
    });
  } else {
    console.warn('apple-iap: APPLE_APP_APPLE_ID is not set — only Sandbox purchases can be verified');
  }
  list.push({
    environment: Environment.SANDBOX,
    verifier: new SignedDataVerifier(roots, true, Environment.SANDBOX, APPLE_BUNDLE_ID),
  });
  verifiers = list;
  return list;
}

function getVerifier(environment: string | undefined): SignedDataVerifier | null {
  return getVerifiers().find(v => v.environment === environment)?.verifier ?? null;
}

// Runs `fn` against each environment's verifier until one accepts the data.
async function verifyAnyEnvironment<T>(
  fn: (verifier: SignedDataVerifier) => Promise<T>
): Promise<{ result: T; environment: Environment }> {
  const isEnvMismatch = (err: unknown) =>
    err instanceof VerificationException && err.status === VerificationStatus.INVALID_ENVIRONMENT;
  let bestError: unknown = null;
  for (const { environment, verifier } of getVerifiers()) {
    try {
      return { result: await fn(verifier), environment };
    } catch (err) {
      // An environment mismatch just means "try the next verifier"; keep the
      // most informative error to report if every verifier rejects the data.
      if (!bestError || (isEnvMismatch(bestError) && !isEnvMismatch(err))) bestError = err;
    }
  }
  throw bestError ?? new Error('No Apple verifier available');
}

// True when verification failed for a transient reason (e.g. OCSP lookup
// failed) and the caller should ask the client/Apple to retry.
export function isRetryableAppleError(err: unknown): boolean {
  return err instanceof VerificationException && err.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE;
}

export async function verifySignedTransaction(signedTransaction: string) {
  const { result, environment } = await verifyAnyEnvironment(v => v.verifyAndDecodeTransaction(signedTransaction));
  return { transaction: result, environment };
}

export async function verifySignedNotification(signedPayload: string) {
  const { result, environment } = await verifyAnyEnvironment(v => v.verifyAndDecodeNotification(signedPayload));
  return { notification: result, environment };
}

// Decodes the transaction and renewal info inside a verified notification,
// using the verifier of the notification's own environment.
export async function decodeNotificationData(notification: ResponseBodyV2DecodedPayload): Promise<{
  transaction: JWSTransactionDecodedPayload | null;
  renewalInfo: JWSRenewalInfoDecodedPayload | null;
}> {
  const data = notification.data;
  const verifier = getVerifier(data?.environment);
  if (!data || !verifier) return { transaction: null, renewalInfo: null };
  const transaction = data.signedTransactionInfo
    ? await verifier.verifyAndDecodeTransaction(data.signedTransactionInfo)
    : null;
  const renewalInfo = data.signedRenewalInfo
    ? await verifier.verifyAndDecodeRenewalInfo(data.signedRenewalInfo)
    : null;
  return { transaction, renewalInfo };
}

// Derives the subscription state from Apple's signed data alone (independent
// of notification type/order, so retries and out-of-order delivery are safe).
export function deriveAppleState(
  transaction: JWSTransactionDecodedPayload,
  renewalInfo: JWSRenewalInfoDecodedPayload | null,
  now: number = Date.now()
): { status: AppleSubscriptionStatus; expiresAt: string | null } {
  if (transaction.revocationDate) {
    // Refunded or revoked (e.g. Family Sharing removed): access ends now.
    return { status: 'revoked', expiresAt: new Date(Math.min(transaction.revocationDate, now)).toISOString() };
  }
  const expires = transaction.expiresDate ?? null;
  const grace = renewalInfo?.gracePeriodExpiresDate ?? null;
  if (renewalInfo?.isInBillingRetryPeriod && grace && grace > now && (!expires || grace > expires)) {
    // Billing grace period: keep premium until Apple's grace period ends.
    return { status: 'grace_period', expiresAt: new Date(grace).toISOString() };
  }
  if (expires && expires > now) return { status: 'active', expiresAt: new Date(expires).toISOString() };
  return {
    status: renewalInfo?.isInBillingRetryPeriod ? 'billing_retry' : 'expired',
    expiresAt: expires ? new Date(expires).toISOString() : null,
  };
}

export type ApplyResult = { plan: Plan | null; expiresAt: string | null; applied: boolean };

// Where the signed data came from: the app (/api/apple/verify, client-supplied
// JWS) or an App Store Server Notification (pushed by Apple).
export type AppleDataSource = 'client' | 'notification';

// apple_transactions/{originalTransactionId}: per-subscription ordering and
// refund state, kept independently of which subscription is currently stored on
// the user. Without it, switching the user to another original transaction
// would let a saved pre-refund JWS be replayed. Admin SDK only.
type AppleTransactionLedger = { uid?: string; lastSignedDate?: number; revoked?: boolean };

// Records an Apple subscription transaction on users/{uid} and recomputes the
// plan in the same Firestore transaction.
// `signedDate` (ms) orders updates: data signed before what's already been seen
// for the same original transaction is ignored, so e.g. a stale purchase
// transaction can't undo a later refund. A refunded/revoked subscription can only
// be restored by a newer notification from Apple (REFUND_REVERSED), never by a
// JWS the app sends.
export async function applyAppleTransaction(
  uid: string,
  transaction: JWSTransactionDecodedPayload,
  renewalInfo: JWSRenewalInfoDecodedPayload | null,
  environment: string,
  signedDate: number,
  source: AppleDataSource = 'client'
): Promise<ApplyResult> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);
  const otid = transaction.originalTransactionId;
  const ledgerRef = otid ? db.collection('apple_transactions').doc(otid) : null;
  const state = deriveAppleState(transaction, renewalInfo);

  return db.runTransaction(async (tx) => {
    const [snap, ledgerSnap] = await Promise.all([
      tx.get(userRef),
      ledgerRef ? tx.get(ledgerRef) : Promise.resolve(null),
    ]);
    if (!snap.exists) return { plan: null, expiresAt: null, applied: false };
    const data = snap.data()!;
    const ledger = (ledgerSnap?.exists ? ledgerSnap.data() : {}) as AppleTransactionLedger;
    const ledgerSignedDate = typeof ledger.lastSignedDate === 'number' ? ledger.lastSignedDate : 0;

    const sameSubscription = data.appleOriginalTransactionId === otid;
    const storedSignedDate = typeof data.appleSignedDate === 'number' ? data.appleSignedDate : 0;
    const isStale =
      ledgerSignedDate > signedDate || (sameSubscription && storedSignedDate > signedDate);
    const revokedReplay = ledger.revoked === true && state.status !== 'revoked' && source !== 'notification';
    // A different original transaction (e.g. a new purchase from another
    // Apple ID) never replaces a subscription that's still running longer.
    const currentLaterElsewhere =
      !sameSubscription &&
      data.appleSubscriptionStatus !== 'revoked' &&
      typeof data.appleExpiresAt === 'string' &&
      (!state.expiresAt || data.appleExpiresAt > state.expiresAt) &&
      new Date(data.appleExpiresAt).getTime() > Date.now();

    // Record what we've seen for this original transaction, whether or not it
    // becomes the user's current subscription.
    if (ledgerRef && !isStale && !revokedReplay) {
      tx.set(
        ledgerRef,
        {
          uid,
          lastSignedDate: Math.max(ledgerSignedDate, signedDate),
          revoked: state.status === 'revoked',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    if (isStale || revokedReplay || currentLaterElsewhere) {
      const updates = planUpdates(data);
      if (Object.keys(updates).length > 0) tx.update(userRef, updates);
      return {
        plan: computePlan(data).plan,
        expiresAt: typeof data.appleExpiresAt === 'string' ? data.appleExpiresAt : null,
        applied: false,
      };
    }

    const appleFields: Record<string, unknown> = {
      appleOriginalTransactionId: transaction.originalTransactionId ?? null,
      appleProductId: transaction.productId ?? null,
      appleExpiresAt: state.expiresAt,
      appleSubscriptionStatus: state.status,
      appleEnvironment: environment,
      appleSignedDate: signedDate,
      appleUpdatedAt: new Date().toISOString(),
    };
    if (renewalInfo && renewalInfo.autoRenewStatus !== undefined) {
      appleFields.appleAutoRenew = renewalInfo.autoRenewStatus === 1;
    }
    const merged = { ...data, ...appleFields };
    tx.update(userRef, { ...appleFields, ...planUpdates(merged) });
    return { plan: computePlan(merged).plan, expiresAt: state.expiresAt, applied: true };
  });
}

// Finds the user an Apple transaction belongs to: by the appAccountToken we
// issued (/api/apple/account-token), else by the stored original transaction id.
export async function findUidForAppleTransaction(
  appAccountToken: string | undefined,
  originalTransactionId: string | undefined
): Promise<string | null> {
  const users = getAdminDb().collection('users');
  if (appAccountToken) {
    const snap = await users.where('appleAccountToken', '==', appAccountToken.toLowerCase()).limit(1).get();
    if (!snap.empty) return snap.docs[0].id;
  }
  if (originalTransactionId) {
    const snap = await users.where('appleOriginalTransactionId', '==', originalTransactionId).limit(1).get();
    if (!snap.empty) return snap.docs[0].id;
  }
  return null;
}
