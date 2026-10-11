import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUid } from '@/lib/api-auth';

const REWARD_TYPES = ['bonus_nudge', 'streak_freeze', 'extra_relation'] as const;
type RewardType = typeof REWARD_TYPES[number];

// Spends one scratch card and applies its reward. These user fields are
// write-protected from clients by Firestore rules.
export async function POST(req: NextRequest) {
  const uid = await getRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = (body as { type?: unknown }).type;
  if (!REWARD_TYPES.includes(type as RewardType)) {
    return NextResponse.json({ error: 'Invalid reward type' }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);

  try {
    const updates = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
      const plan = snap.data()!;
      const available = plan.scratchCardsAvailable ?? 0;
      if (available <= 0) throw Object.assign(new Error('No scratch cards'), { code: 'NO_CARDS' });

      const updates: Record<string, unknown> = { scratchCardsAvailable: available - 1 };
      if (type === 'bonus_nudge') {
        updates.bonusNudgesEarned = (plan.bonusNudgesEarned ?? 0) + 1;
      } else if (type === 'streak_freeze') {
        updates.streakFreezes = (plan.streakFreezes ?? 0) + 1;
      } else {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        updates.extraRelationExpiry = expiry.toISOString();
      }
      tx.update(userRef, updates);
      return updates;
    });
    return NextResponse.json({ updates });
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (err?.code === 'NO_CARDS') return NextResponse.json({ error: 'No scratch cards available' }, { status: 409 });
    console.error('scratch/apply failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
