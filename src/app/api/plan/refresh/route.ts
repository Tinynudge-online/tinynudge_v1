import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUser } from '@/lib/api-auth';
import { sendAccountEmail } from '@/lib/loops-server';

function getNextResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

// Applies the monthly nudge-count reset and expired-trial downgrade.
// These fields are write-protected from clients by Firestore rules.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminDb();
  const userRef = db.collection('users').doc(user.uid);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) return { updates: {}, trialExpired: false, trialEndDate: null as string | null };
      const data = snap.data()!;
      const now = new Date();
      const updates: Record<string, unknown> = {};

      if (!data.nudgeResetDate) {
        updates.nudgeResetDate = getNextResetDate();
      } else if (now >= new Date(data.nudgeResetDate)) {
        updates.nudgeCount = 0;
        updates.nudgeResetDate = getNextResetDate();
      }

      const trialExpired = data.plan === 'trial' && !!data.trialEndDate && now > new Date(data.trialEndDate);
      if (trialExpired) updates.plan = 'free';

      if (Object.keys(updates).length > 0) tx.update(userRef, updates);
      return { updates, trialExpired, trialEndDate: (data.trialEndDate as string | undefined) ?? null };
    });
    // The expireTrials Cloud Function sends the same email with the same idempotency
    // key, so whichever path downgrades the user first, it's delivered once.
    if (result.trialExpired && user.email) {
      await sendAccountEmail(
        'trial_ended',
        user.email,
        { firstName: user.name?.trim().split(/\s+/)[0] || 'there' },
        `trial_ended:${user.uid}:${result.trialEndDate ?? ''}`
      ).catch(err => console.error('plan/refresh: trial_ended email failed', err));
    }
    return NextResponse.json({ updates: result.updates, trialExpired: result.trialExpired });
  } catch (err) {
    console.error('plan/refresh failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
