import { auth } from '@/app/firebase';
import { getAppContext } from '@/lib/app-context';

export const PREMIUM_PRODUCT_ID = 'online.tinynudge.premium.monthly';
const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

type VerifyResponse = { plan: 'premium' | 'free'; expiresAt: string | null };

function isIosApp(): boolean {
  return getAppContext() === 'ios-app';
}

function loadPlugin() {
  return import('@capgo/native-purchases');
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You need to be signed in.');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error;
    throw new Error(message || `Request to ${path} failed (${res.status})`);
  }
  return data as T;
}

function verifyTransaction(signedTransaction: string): Promise<VerifyResponse> {
  return postJson<VerifyResponse>('/api/apple/verify', { signedTransaction });
}

/** Localised price/title from the App Store, or null on web / when unavailable. */
export async function getPremiumProduct(): Promise<{ priceString: string; title: string } | null> {
  if (!isIosApp()) return null;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
    const { product } = await NativePurchases.getProduct({
      productIdentifier: PREMIUM_PRODUCT_ID,
      productType: PURCHASE_TYPE.SUBS,
    });
    if (!product) return null;
    return { priceString: product.priceString, title: product.title };
  } catch (err) {
    console.error('[purchases] getProduct failed:', err);
    return null;
  }
}

/** Buy the premium subscription; resolves 'purchased' only after the server has confirmed it. */
export async function purchasePremium(): Promise<'purchased' | 'cancelled' | 'pending'> {
  if (!isIosApp()) throw new Error('In-app purchases are only available in the iOS app.');
  const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
  const { appAccountToken } = await postJson<{ appAccountToken: string }>('/api/apple/account-token', {});

  let transaction;
  try {
    transaction = await NativePurchases.purchaseProduct({
      productIdentifier: PREMIUM_PRODUCT_ID,
      productType: PURCHASE_TYPE.SUBS,
      appAccountToken,
    });
  } catch (err) {
    // The iOS plugin rejects with "User cancelled" / "Transaction pending".
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel/i.test(message)) return 'cancelled';
    if (/pending/i.test(message)) return 'pending';
    throw err;
  }

  if (!transaction?.jwsRepresentation) throw new Error('Purchase completed but no signed transaction was returned.');
  const result = await verifyTransaction(transaction.jwsRepresentation);
  if (result.plan !== 'premium') throw new Error('Purchase could not be verified. Please try Restore Purchases.');
  return 'purchased';
}

/** Re-sync App Store purchases with the server. True if premium is active afterwards. */
export async function restorePurchases(): Promise<boolean> {
  if (!isIosApp()) throw new Error('Restoring purchases is only available in the iOS app.');
  const { NativePurchases } = await loadPlugin();
  await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases({ onlyCurrentEntitlements: true });

  let premium = false;
  for (const purchase of purchases) {
    if (purchase.productIdentifier !== PREMIUM_PRODUCT_ID || !purchase.jwsRepresentation) continue;
    try {
      const result = await verifyTransaction(purchase.jwsRepresentation);
      if (result.plan === 'premium') premium = true;
    } catch (err) {
      console.error('[purchases] verify during restore failed:', err);
    }
  }
  return premium;
}

/** Open Apple's subscription management screen. */
export async function openManageSubscriptions(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isIosApp()) {
    try {
      const { NativePurchases } = await loadPlugin();
      await NativePurchases.manageSubscriptions();
      return;
    } catch (err) {
      console.error('[purchases] manageSubscriptions failed, falling back to URL:', err);
    }
    const { openExternal } = await import('./browser');
    await openExternal(MANAGE_SUBSCRIPTIONS_URL);
    return;
  }
  window.open(MANAGE_SUBSCRIPTIONS_URL, '_blank', 'noopener');
}
