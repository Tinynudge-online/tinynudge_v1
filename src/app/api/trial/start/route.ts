import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    console.error('trial/start verifyIdToken failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
      const data = snap.data()!;
      if (data.plan === 'premium') throw Object.assign(new Error('Already premium'), { code: 'ALREADY_PREMIUM' });
      if (data.trialUsed) throw Object.assign(new Error('Trial already used'), { code: 'TRIAL_USED' });
      tx.update(userRef, {
        plan: 'trial',
        trialStartDate: now.toISOString(),
        trialEndDate: trialEnd.toISOString(),
        trialUsed: true,
      });
    });
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (err?.code === 'TRIAL_USED') return NextResponse.json({ error: 'Trial already used' }, { status: 409 });
    if (err?.code === 'ALREADY_PREMIUM') return NextResponse.json({ error: 'Already on premium plan' }, { status: 409 });
    console.error('trial/start transaction failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({
    trialStartDate: now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
  });
}
