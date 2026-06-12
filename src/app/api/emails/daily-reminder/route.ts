import { NextRequest, NextResponse } from 'next/server';
import { LoopsClient } from 'loops';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyCronSecret } from '@/lib/cron-auth';

const loops = new LoopsClient(process.env.LOOPS_API_KEY!);

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db
    .collection('user_preferences')
    .where('emailDailyReminders', '==', true)
    .get();

  const results = await Promise.allSettled(
    snap.docs.map((d) => {
      const { email } = d.data();
      if (!email) return Promise.resolve({ skipped: true });
      return loops.sendEvent({ email, eventName: 'daily_reminder' });
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  return NextResponse.json({ sent, failed });
}
