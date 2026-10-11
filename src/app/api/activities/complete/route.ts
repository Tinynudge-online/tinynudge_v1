import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRequestUser, isPlausibleLocalDate } from '@/lib/api-auth';
import { sendLoopsEvent, syncContact } from '@/lib/loops-server';
import { STREAK_MILESTONES } from '@/lib/email-preferences';

// Marks an activity completed and updates streak, totals, scratch cards and
// the free-plan nudge count in one transaction. These user fields are
// write-protected from clients by Firestore rules.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { uid } = user;

  const body = await req.json().catch(() => ({}));
  const { activityId, localDate } = body as { activityId?: unknown; localDate?: unknown };
  if (typeof activityId !== 'string' || !activityId) {
    return NextResponse.json({ error: 'Missing activityId' }, { status: 400 });
  }
  if (!isPlausibleLocalDate(localDate)) {
    return NextResponse.json({ error: 'Invalid localDate' }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);
  const activityRef = db.collection('user_activities').doc(activityId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [userSnap, activitySnap] = await Promise.all([tx.get(userRef), tx.get(activityRef)]);
      if (!activitySnap.exists || activitySnap.data()!.user_id !== uid) {
        throw Object.assign(new Error('Activity not found'), { code: 'NOT_FOUND' });
      }
      if (activitySnap.data()!.status === 'completed') {
        throw Object.assign(new Error('Already completed'), { code: 'ALREADY_COMPLETED' });
      }
      if (!userSnap.exists) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
      const plan = userSnap.data()!;

      // Streak calculation (based on the user's local date)
      const today = localDate;
      const last: string | null = plan.lastCompletedDate ?? null;
      let streak: number = plan.currentStreak ?? 0;
      let freezes: number = plan.streakFreezes ?? 0;
      let streakSaved = false;
      const streakIncreased = last !== today;
      if (streakIncreased) {
        if (!last) {
          streak = 1;
        } else {
          const daysDiff = Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86400000);
          if (daysDiff === 1) {
            streak += 1;
          } else if (daysDiff === 2 && freezes > 0) {
            streak += 1;
            freezes -= 1;
            streakSaved = true;
          } else {
            streak = 1;
          }
        }
      }

      const newTotal = (plan.totalActivitiesCompleted ?? 0) + 1;
      const isPremiumActive = plan.plan === 'premium' ||
        (plan.plan === 'trial' && !!plan.trialEndDate && new Date() <= new Date(plan.trialEndDate));
      const earnedScratchCard = isPremiumActive && newTotal % 5 === 0;

      const updates: Record<string, unknown> = {
        currentStreak: streak,
        longestStreak: Math.max(plan.longestStreak ?? 0, streak),
        lastCompletedDate: today,
        streakFreezes: freezes,
        totalActivitiesCompleted: newTotal,
        scratchCardsAvailable: (plan.scratchCardsAvailable ?? 0) + (earnedScratchCard ? 1 : 0),
      };
      if (!isPremiumActive) updates.nudgeCount = (plan.nudgeCount ?? 0) + 1;

      const completedAt = new Date().toISOString();
      tx.update(activityRef, { status: 'completed', completed_at: completedAt });
      tx.update(userRef, updates);
      const nudgeId = activitySnap.data()!.nudge_id as string | undefined;
      return { updates, streakSaved, completedAt, streakIncreased, streak, nudgeId };
    });

    if (user.email) {
      // Keep the Loops contact's progress fields current. This must happen before
      // streak_milestone is sent: that email reads contact.currentStreak.
      try {
        await syncContact(user.email, {
          currentStreak: result.streak,
          lastActiveDate: localDate,
          ...(result.nudgeId && { lastNudgeId: result.nudgeId }),
        });
      } catch (err) {
        console.error('activities/complete: Loops contact sync failed', err);
      }

      // Streak milestone email — only on the day the streak grows, and only if opted in.
      if (result.streakIncreased && STREAK_MILESTONES.includes(result.streak)) {
        try {
          const prefSnap = await db.collection('user_preferences').doc(uid).get();
          if (prefSnap.data()?.notifyStreakMilestones !== false) {
            await sendLoopsEvent(user.email, 'streak_milestone', {
              eventProperties: { streak: result.streak },
              idempotencyKey: `streak_milestone:${uid}:${localDate}`,
            });
          }
        } catch (err) {
          console.error('activities/complete: streak milestone email failed', err);
        }
      }
    }

    return NextResponse.json({
      updates: result.updates,
      streakSaved: result.streakSaved,
      completedAt: result.completedAt,
    });
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (err?.code === 'ALREADY_COMPLETED') return NextResponse.json({ error: 'Already completed' }, { status: 409 });
    console.error('activities/complete failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
