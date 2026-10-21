import { LoopsClient } from 'loops';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

const loops = new LoopsClient(process.env.LOOPS_API_KEY!);

// Explicit allowlist — prevents clients from injecting arbitrary Loops contact fields
const ALLOWED_PROPS = new Set([
  'firstName',
  'source',
  'currentStreak',
  'lastActiveDate',
  'lastNudgeId',
  'emailDailyReminders',
  'emailWeeklyProgress',
  'emailMonthlyInsights',
  'notifyStreakMilestones',
  'notifyReEngagement',
  'notificationTime',
]);

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let decoded: { email?: string };
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch (err) {
    console.error('loops/contact verifyIdToken failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = decoded.email;
  if (!email) {
    return NextResponse.json({ error: 'Token has no email' }, { status: 400 });
  }

  const body = await req.json();

  // Only pass through explicitly allowed properties; drop everything else
  // (including any client-supplied email — identity comes from the verified token)
  const properties: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_PROPS.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) {
      properties[key] = value as string | number | boolean;
    }
  }

  try {
    const result = await loops.updateContact({ email, properties });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Loops updateContact error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
