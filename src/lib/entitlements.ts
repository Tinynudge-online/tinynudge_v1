import { getAdminDb } from '@/lib/firebase-admin';

// Single source of truth for users/{uid}.plan. A user can pay through Lemon
// Squeezy (web) and/or Apple in-app purchase (iOS app); every billing event
// recomputes the plan from BOTH sources so an event from one never downgrades
// a subscriber who is still paying through the other.
//
// users/{uid} entitlement fields (all server-only, see firestore.rules):
//   plan                      'free' | 'trial' | 'premium'
//   billingSource             'lemonsqueezy' | 'apple' (which source currently grants premium)
//   subscriptionStatus        Lemon Squeezy subscription status
//   lsSubscriptionId, lsCustomerId
//   appleAccountToken         UUID passed to StoreKit as appAccountToken
//   appleOriginalTransactionId
//   appleExpiresAt            ISO; premium while in the future (includes billing grace period)
//   appleSubscriptionStatus   'active' | 'grace_period' | 'billing_retry' | 'expired' | 'revoked'
//   appleProductId, appleEnvironment, appleAutoRenew, appleSignedDate, appleUpdatedAt

export type Plan = 'free' | 'trial' | 'premium';
export type BillingSource = 'lemonsqueezy' | 'apple';

// Lemon Squeezy statuses that mean the subscription is still active/accessible.
// 'cancelled' = user cancelled but billing period hasn't ended yet — keep access
//               (LS switches the status to 'expired' when the period ends).
// 'past_due'  = payment failed, dunning in progress — keep access during retry window.
// 'on_trial'  = LS-side trial period of a paid subscription.
export const LS_ACTIVE_STATUSES = new Set(['active', 'past_due', 'cancelled', 'on_trial']);

type EntitlementData = {
  plan?: unknown;
  trialEndDate?: unknown;
  subscriptionStatus?: unknown;
  billingSource?: unknown;
  appleExpiresAt?: unknown;
  appleSubscriptionStatus?: unknown;
};

export function isLemonSqueezyActive(data: EntitlementData): boolean {
  return typeof data.subscriptionStatus === 'string' && LS_ACTIVE_STATUSES.has(data.subscriptionStatus);
}

export function isAppleSubscriptionActive(data: EntitlementData, now: Date = new Date()): boolean {
  if (data.appleSubscriptionStatus === 'revoked') return false;
  if (typeof data.appleExpiresAt !== 'string' || !data.appleExpiresAt) return false;
  const expires = new Date(data.appleExpiresAt).getTime();
  return !Number.isNaN(expires) && expires > now.getTime();
}

// Pure plan computation from a users/{uid} document.
export function computePlan(data: EntitlementData, now: Date = new Date()): { plan: Plan; billingSource: BillingSource | null } {
  const ls = isLemonSqueezyActive(data);
  const apple = isAppleSubscriptionActive(data, now);
  if (ls || apple) {
    let billingSource: BillingSource;
    if (ls && apple) {
      // Paying through both: keep whatever was recorded first.
      billingSource = data.billingSource === 'apple' ? 'apple' : 'lemonsqueezy';
    } else {
      billingSource = apple ? 'apple' : 'lemonsqueezy';
    }
    return { plan: 'premium', billingSource };
  }
  // Nothing paid. A server trial keeps its 'trial' plan: the expiry path
  // (/api/plan/refresh + the expireTrials Cloud Function) downgrades expired
  // trials and sends the trial_ended email, keyed on plan === 'trial'.
  if (data.plan === 'trial' && typeof data.trialEndDate === 'string' && data.trialEndDate) {
    return { plan: 'trial', billingSource: null };
  }
  return { plan: 'free', billingSource: null };
}

// Fields to write so the stored plan matches computePlan (empty if unchanged).
// billingSource is only updated while premium, so it keeps the last source afterwards.
export function planUpdates(data: EntitlementData, now: Date = new Date()): Record<string, unknown> {
  const { plan, billingSource } = computePlan(data, now);
  const updates: Record<string, unknown> = {};
  if (data.plan !== plan) updates.plan = plan;
  if (billingSource && data.billingSource !== billingSource) updates.billingSource = billingSource;
  return updates;
}

// Re-reads users/{uid} and writes the correct plan. Returns the resulting plan,
// or null if the user document doesn't exist.
export async function recomputePlan(uid: string): Promise<Plan | null> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return null;
    const data = snap.data()!;
    const updates = planUpdates(data);
    if (Object.keys(updates).length > 0) tx.update(userRef, updates);
    return computePlan(data).plan;
  });
}
