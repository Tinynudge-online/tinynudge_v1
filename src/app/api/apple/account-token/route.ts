import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUid } from '@/lib/api-auth';

// Returns the user's StoreKit appAccountToken (a UUID created once and reused).
// The iOS app passes it with every purchase so App Store transactions and
// server notifications can be tied back to this TinyNudge account.
export async function POST(req: NextRequest) {
  const uid = await getRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);

  try {
    const appAccountToken = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) return null;
      const existing = snap.data()!.appleAccountToken;
      if (typeof existing === 'string' && existing) return existing;
      const token = randomUUID();
      tx.update(userRef, { appleAccountToken: token });
      return token;
    });
    if (!appAccountToken) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ appAccountToken });
  } catch (err) {
    console.error('apple/account-token failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
