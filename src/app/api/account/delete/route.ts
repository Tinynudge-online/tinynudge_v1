import { NextRequest, NextResponse } from 'next/server';
import { LoopsClient } from 'loops';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { isAppleSubscriptionActive } from '@/lib/entitlements';

const SUPPORT_EMAIL = 'tinynudge@gmail.com';
const BATCH_LIMIT = 450;
// Deleting is irreversible, so require a sign-in from the last 5 minutes.
const MAX_AUTH_AGE_SECONDS = 300;
// ID tokens live for 1 hour; the cleanup job re-sweeps after they've all expired.
const CLEANUP_DELAY_MS = 65 * 60 * 1000;

// Collections whose docs belong to the user, and the field that holds the owner's uid.
const OWNED_COLLECTIONS: { name: string; field: string }[] = [
  { name: 'user_connections', field: 'user_id' },
  { name: 'user_activities', field: 'user_id' },
  { name: 'blind_date_entries', field: 'user_id' },
  { name: 'watched_films', field: 'user_id' },
  { name: 'meal_plans', field: 'user_id' },
  { name: 'push_subscriptions', field: 'uid' },
  { name: 'fcm_tokens', field: 'uid' },
];

// Lemon Squeezy statuses that will never bill again, so there's nothing to cancel.
const LS_FINAL_STATUSES = new Set(['cancelled', 'expired']);

type FirestoreDb = ReturnType<typeof getAdminDb>;

// Deletes every doc in `collection` where `field == uid`, in batches. Re-queries
// until empty so it copes with any number of docs and is safe to re-run.
async function deleteOwnedDocs(db: FirestoreDb, collection: string, field: string, uid: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await db.collection(collection).where(field, '==', uid).select().limit(BATCH_LIMIT).get();
    if (snap.empty) return deleted;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < BATCH_LIMIT) return deleted;
  }
}

// Cancels the Lemon Squeezy subscription. DELETE /v1/subscriptions/{id} stops all
// future renewals. A 404 means it no longer exists, which is fine.
async function cancelLemonSqueezySubscription(subscriptionId: string): Promise<void> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY environment variable is not set');
  const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${apiKey}` },
  });
  if (res.ok || res.status === 404) return;
  const body = await res.text().catch(() => '');
  throw new Error(`Lemon Squeezy cancel failed (${res.status}): ${body.slice(0, 300)}`);
}

async function deleteLoopsContact(email: string): Promise<void> {
  const key = process.env.LOOPS_API_KEY;
  if (!key) throw new Error('LOOPS_API_KEY environment variable is not set');
  try {
    await new LoopsClient(key).deleteContact({ email });
  } catch (err: any) {
    // No contact for this email: nothing to delete.
    if (err?.statusCode === 404) return;
    throw err;
  }
}

const REAUTH_RESPONSE = { error: 'Please sign in again to delete your account.', code: 'reauth_required' };

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify directly (not via getRequestUser) so revoked tokens are rejected and
  // the sign-in is recent: a leaked token alone can't delete the account.
  let user: { uid: string; email: string | null };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    if (Date.now() / 1000 - decoded.auth_time > MAX_AUTH_AGE_SECONDS) {
      return NextResponse.json(REAUTH_RESPONSE, { status: 401 });
    }
    user = { uid: decoded.uid, email: decoded.email ?? null };
  } catch (err: any) {
    if (err?.code === 'auth/id-token-revoked' || err?.code === 'auth/user-disabled') {
      return NextResponse.json(REAUTH_RESPONSE, { status: 401 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { uid } = user;

  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);

  // 1. Read billing state before anything is removed.
  let userData: Record<string, any> = {};
  try {
    const snap = await userRef.get();
    userData = snap.exists ? snap.data() ?? {} : {};
  } catch (err) {
    console.error('account/delete: reading users doc failed:', uid, err);
    return NextResponse.json(
      { error: `We couldn't delete your account right now. Nothing has been deleted. Please try again, or email ${SUPPORT_EMAIL}.` },
      { status: 500 }
    );
  }

  // Apple subscriptions can't be cancelled by the server; tell the UI to send the user to iOS Settings.
  const appleSubscriptionActive = isAppleSubscriptionActive(userData);

  // 2. Cancel Lemon Squeezy first. If that fails, stop before deleting anything so
  //    the user isn't left being billed for an account that no longer exists.
  const lsSubscriptionId = userData.lsSubscriptionId;
  if (
    (typeof lsSubscriptionId === 'string' || typeof lsSubscriptionId === 'number') &&
    String(lsSubscriptionId) &&
    !LS_FINAL_STATUSES.has(String(userData.subscriptionStatus ?? ''))
  ) {
    try {
      await cancelLemonSqueezySubscription(String(lsSubscriptionId));
    } catch (err) {
      console.error('account/delete: Lemon Squeezy cancel failed:', uid, err);
      return NextResponse.json(
        {
          error: `We couldn't cancel your subscription, so your account has not been deleted yet. Nothing has been deleted. Please try again, or email ${SUPPORT_EMAIL}.`,
        },
        { status: 502 }
      );
    }
  }

  // 3. Stop other sessions from writing while we delete. Revoking refresh tokens
  //    ends every session within the hour; the tombstone makes Firestore rules
  //    refuse writes from tokens issued before that (rules can't check revocation),
  //    and tells the cleanup job to re-sweep once those tokens have expired.
  const tombstoneRef = db.collection('deleted_users').doc(uid);
  try {
    await getAdminAuth().revokeRefreshTokens(uid);
    await tombstoneRef.set({
      deletedAt: new Date().toISOString(),
      cleanupAfter: new Date(Date.now() + CLEANUP_DELAY_MS).toISOString(),
    });
  } catch (err) {
    console.error('account/delete: revoking sessions failed:', uid, err);
    return NextResponse.json(
      { error: `We couldn't delete your account right now. Nothing has been deleted. Please try again, or email ${SUPPORT_EMAIL}.` },
      { status: 500 }
    );
  }

  // 4. Delete Firestore data. users/{uid} goes last so a retry still finds billing info.
  try {
    for (const { name, field } of OWNED_COLLECTIONS) {
      await deleteOwnedDocs(db, name, field, uid);
    }
    const batch = db.batch();
    batch.delete(db.collection('user_preferences').doc(uid));
    batch.delete(userRef);
    await batch.commit();
  } catch (err) {
    console.error('account/delete: Firestore delete failed:', uid, err);
    // The account still exists, so let the user keep using it after signing in again.
    await tombstoneRef.delete().catch(() => undefined);
    return NextResponse.json(
      {
        error: `Some of your data couldn't be deleted. Your sign-in is still active, so please try again, or email ${SUPPORT_EMAIL} and we'll finish it for you.`,
        appleSubscriptionActive,
      },
      { status: 500 }
    );
  }

  // 5. Delete the Loops contact. Non-fatal: the user's app data is already gone.
  let email = user.email;
  if (!email) {
    try {
      email = (await getAdminAuth().getUser(uid)).email ?? null;
    } catch (err) {
      console.error('account/delete: looking up email failed:', uid, err);
    }
  }
  if (email) {
    try {
      await deleteLoopsContact(email);
    } catch (err) {
      console.error('account/delete: Loops contact delete failed:', uid, err);
    }
  }

  // 6. Delete the Firebase Auth user last.
  try {
    await getAdminAuth().deleteUser(uid);
  } catch (err: any) {
    if (err?.code !== 'auth/user-not-found') {
      console.error('account/delete: deleting auth user failed:', uid, err);
      return NextResponse.json(
        {
          error: `Your data has been deleted, but we couldn't remove your sign-in. Please try again, or email ${SUPPORT_EMAIL} and we'll remove it for you.`,
          dataDeleted: true,
          appleSubscriptionActive,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, appleSubscriptionActive });
}
