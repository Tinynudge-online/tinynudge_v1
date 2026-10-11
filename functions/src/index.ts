import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { LoopsClient, RateLimitExceededError } from 'loops';
import { LOOPS_TRANSACTIONAL_IDS } from './loops-transactional';

initializeApp();

const loopsApiKey = defineSecret('LOOPS_API_KEY');

// ─── helpers ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [200, 600, 1500];
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      // The loops SDK throws RateLimitExceededError on 429 (it has no `status` field).
      const isRateLimit =
        err instanceof RateLimitExceededError ||
        (err instanceof Error && err.name === 'RateLimitExceededError');
      if (isRateLimit && i < 2) {
        await delay(delays[i]);
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

// The user's sign-in email and first name — used for account emails (trial,
// billing), which are sent regardless of marketing preferences.
async function getAccount(uid: string): Promise<{ email?: string; firstName: string }> {
  try {
    const user = await getAuth().getUser(uid);
    return {
      email: user.email ?? undefined,
      firstName: user.displayName?.trim().split(/\s+/)[0] || 'there',
    };
  } catch {
    return { firstName: 'there' };
  }
}

async function getAccountEmail(uid: string): Promise<string | undefined> {
  return (await getAccount(uid)).email;
}

// ─── preference helpers ─────────────────────────────────────────────────────

type UserPreferences = {
  email?: string;
  notificationTime?: string;
  timezone?: string;
  lastDailyReminderDate?: string;
  notifyReEngagement?: boolean;
};

// Keep in sync with DEFAULT_EMAIL_PREFERENCES in src/lib/email-preferences.ts
const DEFAULT_NOTIFICATION_TIME = '6:00 PM';

// '6:00 PM' → 18
function parseHour(time: string | undefined): number {
  const match = /^(\d{1,2}):\d{2}\s*(AM|PM)$/i.exec(time ?? DEFAULT_NOTIFICATION_TIME);
  if (!match) return 18;
  let hour = Number(match[1]) % 12;
  if (match[2].toUpperCase() === 'PM') hour += 12;
  return hour;
}

// Current hour (0-23) and date (YYYY-MM-DD) in the given timezone.
function localNow(timezone: string | undefined): { hour: number; date: string } {
  const now = new Date();
  try {
    const tz = timezone || 'UTC';
    const hour = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
    );
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
    return { hour, date };
  } catch {
    return { hour: now.getUTCHours(), date: now.toISOString().split('T')[0] };
  }
}

// ─── weekly progress & monthly insights ──────────────────────────────────────

// Sends a summary event carrying the user's real numbers for the period.
async function sendProgressSummaries(
  eventName: 'weekly_progress' | 'monthly_insights',
  preferenceField: 'emailWeeklyProgress' | 'emailMonthlyInsights',
  periodDays: number
): Promise<void> {
  const loops = new LoopsClient(loopsApiKey.value());
  const db = getFirestore();
  const since = new Date(Date.now() - periodDays * 86400000).toISOString();

  const prefSnap = await db
    .collection('user_preferences')
    .where(preferenceField, '==', true)
    .get();

  let sent = 0;
  let skipped = 0;

  for (const prefDoc of prefSnap.docs) {
    const { email } = prefDoc.data() as UserPreferences;
    if (!email) { skipped++; continue; }

    try {
      const [userSnap, completedSnap] = await Promise.all([
        db.doc(`users/${prefDoc.id}`).get(),
        db.collection('user_activities')
          .where('user_id', '==', prefDoc.id)
          .where('status', '==', 'completed')
          .get(),
      ]);
      const user = (userSnap.data() ?? {}) as {
        currentStreak?: number; longestStreak?: number; totalActivitiesCompleted?: number;
      };
      const completedThisPeriod = completedSnap.docs.filter((d) => {
        const completedAt = (d.data() as { completed_at?: string }).completed_at;
        return !!completedAt && completedAt >= since;
      }).length;

      await withRetry(() =>
        loops.sendEvent({
          email,
          eventName,
          contactProperties: { currentStreak: user.currentStreak ?? 0 },
          eventProperties: {
            completedThisPeriod,
            currentStreak: user.currentStreak ?? 0,
            longestStreak: user.longestStreak ?? 0,
            totalCompleted: user.totalActivitiesCompleted ?? 0,
          },
        })
      );
      sent++;
    } catch (err) {
      console.error(`${eventName}: failed for ${email}`, err);
      skipped++;
    }

    // Stay within 10 req/sec
    if (sent > 0 && sent % 10 === 0) await delay(1100);
  }

  console.log(`${eventName}: sent=${sent}, skipped=${skipped}`);
}

// Every Monday at 9:00 AM UTC
export const weeklyProgress = onSchedule(
  { schedule: '0 9 * * 1', secrets: [loopsApiKey] },
  async () => {
    await sendProgressSummaries('weekly_progress', 'emailWeeklyProgress', 7);
  }
);

// 1st of every month at 9:00 AM UTC
export const monthlyInsights = onSchedule(
  { schedule: '0 9 1 * *', secrets: [loopsApiKey] },
  async () => {
    await sendProgressSummaries('monthly_insights', 'emailMonthlyInsights', 30);
  }
);

// ─── daily nudge reminder ────────────────────────────────────────────────────

// Runs every hour. Fires `nudge_ready` for users with emailDailyReminders on,
// at the reminder time they picked in their own timezone, if they haven't
// completed a nudge today. At most one per user per local day.
export const dailyNudgeReminders = onSchedule(
  { schedule: '0 * * * *', secrets: [loopsApiKey] },
  async () => {
    const loops = new LoopsClient(loopsApiKey.value());
    const db = getFirestore();

    const prefSnap = await db
      .collection('user_preferences')
      .where('emailDailyReminders', '==', true)
      .get();

    let sent = 0;
    let skipped = 0;

    for (const prefDoc of prefSnap.docs) {
      const pref = prefDoc.data() as UserPreferences;
      const email = pref.email;
      if (!email) { skipped++; continue; }

      const { hour, date: localDate } = localNow(pref.timezone);
      if (hour !== parseHour(pref.notificationTime)) continue;
      if (pref.lastDailyReminderDate === localDate) { skipped++; continue; }

      // Skip if the user already completed a nudge today (lastCompletedDate is the user's local date)
      const userSnap = await db.doc(`users/${prefDoc.id}`).get();
      const lastCompleted = userSnap.exists
        ? (userSnap.data() as { lastCompletedDate?: string }).lastCompletedDate
        : undefined;

      if (lastCompleted === localDate) { skipped++; continue; }

      // Pick a nudge title — prefer a skipped ("saved for later") activity,
      // fall back to the first active one. Purely for email personalisation.
      let nudgeTitle: string | undefined;
      try {
        const skippedSnap = await db
          .collection('user_activities')
          .where('user_id', '==', prefDoc.id)
          .where('status', '==', 'skipped')
          .limit(1)
          .get();
        if (!skippedSnap.empty) {
          nudgeTitle = (skippedSnap.docs[0].data() as { title?: string }).title;
        } else {
          const activeSnap = await db
            .collection('user_activities')
            .where('user_id', '==', prefDoc.id)
            .where('status', '==', 'active')
            .limit(1)
            .get();
          if (!activeSnap.empty) {
            nudgeTitle = (activeSnap.docs[0].data() as { title?: string }).title;
          }
        }
      } catch {
        // non-fatal — send without nudge title
      }

      try {
        await withRetry(() =>
          loops.sendEvent({
            email,
            eventName: 'nudge_ready',
            ...(nudgeTitle && { eventProperties: { nudgeTitle } }),
          })
        );
        await prefDoc.ref.update({ lastDailyReminderDate: localDate });
        sent++;
      } catch (err) {
        console.error(`dailyNudgeReminders: failed for ${email}`, err);
        skipped++;
      }

      // Stay within 10 req/sec
      if (sent > 0 && sent % 10 === 0) await delay(1100);
    }

    console.log(`dailyNudgeReminders: sent=${sent}, skipped=${skipped}`);
  }
);

// ─── re-engage inactive parents ──────────────────────────────────────────────

// Fires `parent_inactive` for users whose lastCompletedDate is 5+ days ago
// and who haven't received a re-engagement email in the last 7 days.
// Runs at 10 AM UTC daily.
export const reEngageInactive = onSchedule(
  { schedule: '0 10 * * *', secrets: [loopsApiKey] },
  async () => {
    const loops = new LoopsClient(loopsApiKey.value());
    const db = getFirestore();

    const now = new Date();
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    // Users who had activity but went silent — lastCompletedDate is a date string
    // Lexicographic comparison works correctly for ISO YYYY-MM-DD strings
    const usersSnap = await db
      .collection('users')
      .where('lastCompletedDate', '<=', fiveDaysAgoStr)
      .get();

    let sent = 0;
    let skipped = 0;

    for (let i = 0; i < usersSnap.docs.length; i++) {
      const userDoc = usersSnap.docs[i];
      const uid = userDoc.id;
      const userData = userDoc.data() as {
        lastCompletedDate?: string;
        lastReEngagedAt?: string;
        currentStreak?: number;
      };

      // Skip if re-engaged within the last 7 days
      if (
        userData.lastReEngagedAt &&
        userData.lastReEngagedAt >= sevenDaysAgoIso
      ) {
        skipped++;
        continue;
      }

      // Look up email from user_preferences and check opt-in
      const prefSnap = await db.doc(`user_preferences/${uid}`).get();
      if (!prefSnap.exists) { skipped++; continue; }
      const prefData = prefSnap.data() as { email?: string; notifyReEngagement?: boolean };
      // Respect user preference — default true if field not yet set
      if (prefData.notifyReEngagement === false) { skipped++; continue; }
      const email = prefData.email;
      if (!email) { skipped++; continue; }

      try {
        await withRetry(() =>
          loops.sendEvent({
            email,
            eventName: 'parent_inactive',
            contactProperties: {
              currentStreak: userData.currentStreak ?? 0,
            },
          })
        );
        // Track when we last re-engaged to avoid spamming
        await db.doc(`users/${uid}`).update({ lastReEngagedAt: now.toISOString() });
        sent++;
      } catch (err) {
        console.error(`reEngageInactive: failed for ${email}`, err);
        skipped++;
      }

      // Stay within 10 req/sec
      if ((i + 1) % 10 === 0) {
        await delay(1100);
      }
    }

    console.log(`reEngageInactive: sent=${sent}, skipped=${skipped}`);
  }
);

// ─── trial ending reminder ────────────────────────────────────────────────────

// Fires `trial_ending` for users whose trial expires in ≤ 48 hours and who
// haven't yet upgraded to premium. Runs at 8 AM UTC daily.
export const trialEndingReminder = onSchedule(
  { schedule: '0 8 * * *', secrets: [loopsApiKey] },
  async () => {
    const loops = new LoopsClient(loopsApiKey.value());
    const db = getFirestore();

    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    // Find trials that end within the next 48 hours and are still on trial plan
    const usersSnap = await db
      .collection('users')
      .where('plan', '==', 'trial')
      .where('trialEndDate', '<=', in48h)
      .get();

    let sent = 0;
    let skipped = 0;

    for (let i = 0; i < usersSnap.docs.length; i++) {
      const userDoc = usersSnap.docs[i];
      const uid = userDoc.id;
      const userData = userDoc.data() as {
        trialEndDate?: string;
        trialEndReminderSentAt?: string;
      };

      // Only send once per trial
      if (userData.trialEndReminderSentAt) { skipped++; continue; }

      // Skip if the trial has already expired — we'd be sending a "ending soon" for the past
      if (!userData.trialEndDate || userData.trialEndDate <= now.toISOString()) { skipped++; continue; }

      const email = await getAccountEmail(uid);
      if (!email) { skipped++; continue; }

      const trialEndDate = userData.trialEndDate
        ? new Date(userData.trialEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
        : 'soon';

      try {
        await withRetry(() =>
          loops.sendEvent({
            email,
            eventName: 'trial_ending',
            eventProperties: { trialEndDate },
          })
        );
        await db.doc(`users/${uid}`).update({ trialEndReminderSentAt: now.toISOString() });
        sent++;
      } catch (err) {
        console.error(`trialEndingReminder: failed for ${email}`, err);
        skipped++;
      }

      if ((i + 1) % 10 === 0) await delay(1100);
    }

    console.log(`trialEndingReminder: sent=${sent}, skipped=${skipped}`);
  }
);

// ─── trial expiry ─────────────────────────────────────────────────────────────

// Downgrades expired trials to free, pauses all but the oldest connection
// (free plan allows one), and sends the Trial Ended email. Runs hourly so it
// arrives close to the actual expiry. The /api/plan/refresh route does the
// same on sign-in; whichever runs first wins via the transaction check.
export const expireTrials = onSchedule(
  { schedule: '15 * * * *', secrets: [loopsApiKey] },
  async () => {
    const loops = new LoopsClient(loopsApiKey.value());
    const db = getFirestore();
    const nowIso = new Date().toISOString();

    const usersSnap = await db
      .collection('users')
      .where('plan', '==', 'trial')
      .where('trialEndDate', '<=', nowIso)
      .get();

    let sent = 0;
    let skipped = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      try {
        const trialEndDate = await db.runTransaction(async (tx) => {
          const snap = await tx.get(userDoc.ref);
          const data = snap.data() as { plan?: string; trialEndDate?: string } | undefined;
          if (data?.plan !== 'trial' || !data.trialEndDate || data.trialEndDate > nowIso) return null;
          tx.update(userDoc.ref, { plan: 'free' });
          return data.trialEndDate;
        });
        if (!trialEndDate) { skipped++; continue; }

        // Free plan keeps one connection active — pause the rest.
        const connSnap = await db.collection('user_connections').where('user_id', '==', uid).get();
        const toPause = connSnap.docs
          .sort((a, b) => String(a.data().created_at).localeCompare(String(b.data().created_at)))
          .slice(1);
        for (const conn of toPause) {
          const batch = db.batch();
          batch.update(conn.ref, { is_paused: true });
          const actSnap = await db
            .collection('user_activities')
            .where('user_id', '==', uid)
            .where('connection_id', '==', conn.id)
            .where('status', '==', 'active')
            .get();
          actSnap.docs.forEach((a) => batch.update(a.ref, { status: 'paused' }));
          await batch.commit();
        }

        const { email, firstName } = await getAccount(uid);
        if (!email) { skipped++; continue; }
        // Same idempotency key as /api/plan/refresh, so the email is delivered once
        // even if both paths handle this trial.
        await withRetry(() =>
          loops.sendTransactionalEmail({
            transactionalId: LOOPS_TRANSACTIONAL_IDS.trial_ended,
            email,
            dataVariables: { firstName },
            headers: { 'Idempotency-Key': `trial_ended:${uid}:${trialEndDate}` },
          })
        );
        sent++;
      } catch (err) {
        console.error(`expireTrials: failed for ${uid}`, err);
        skipped++;
      }

      if (sent > 0 && sent % 10 === 0) await delay(1100);
    }

    console.log(`expireTrials: sent=${sent}, skipped=${skipped}`);
  }
);
