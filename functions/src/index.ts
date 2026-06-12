import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { LoopsClient } from 'loops';

initializeApp();

const loopsApiKey = defineSecret('LOOPS_API_KEY');

async function sendLoopsEventToSegment(
  eventName: string,
  preferenceField: string
): Promise<void> {
  const loops = new LoopsClient(loopsApiKey.value());
  const db = getFirestore();

  const snap = await db
    .collection('user_preferences')
    .where(preferenceField, '==', true)
    .get();

  await Promise.allSettled(
    snap.docs.map((d) => {
      const { email } = d.data() as { email?: string };
      if (!email) return Promise.resolve();
      return loops.sendEvent({ email, eventName });
    })
  );
}

// Daily at 9:00 AM UTC
export const dailyReminder = onSchedule(
  { schedule: '0 9 * * *', secrets: [loopsApiKey] },
  async () => {
    await sendLoopsEventToSegment('daily_reminder', 'emailDailyReminders');
  }
);

// Every Monday at 9:00 AM UTC
export const weeklyProgress = onSchedule(
  { schedule: '0 9 * * 1', secrets: [loopsApiKey] },
  async () => {
    await sendLoopsEventToSegment('weekly_progress', 'emailWeeklyProgress');
  }
);

// 1st of every month at 9:00 AM UTC
export const monthlyInsights = onSchedule(
  { schedule: '0 9 1 * *', secrets: [loopsApiKey] },
  async () => {
    await sendLoopsEventToSegment('monthly_insights', 'emailMonthlyInsights');
  }
);
