import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  FieldValue,
  getFirestore,
  type DocumentReference,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { LoopsClient, RateLimitExceededError } from 'loops';
import webpush from 'web-push';
import { LOOPS_TRANSACTIONAL_IDS } from './loops-transactional';

initializeApp();

const loopsApiKey = defineSecret('LOOPS_API_KEY');
const vapidPrivateKey = defineSecret('VAPID_PRIVATE_KEY');

// Keep in sync with the VAPID public key in src/lib/push-config.ts
const VAPID_PUBLIC_KEY =
  'BLMHFfY6-mbCZnSFCXKBgXPrQDer7IBwuPjun_ZHDkhr1YmhcYResP06nGopx3SgTjh2EzOhezVS4aU9_BWaoek';
const VAPID_SUBJECT = 'mailto:tinynudge@gmail.com';

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
  lastPushReminderDate?: string;
  emailDailyReminders?: boolean;
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

// ─── push notifications ──────────────────────────────────────────────────────

// Never include child data (names etc.) in a push — it shows on the lock screen.
const PUSH_REMINDER = {
  title: "Tonight's nudge is ready 🌙",
  body: 'A tiny moment of connection is waiting for you.',
  url: '/',
};

type PushPayload = typeof PUSH_REMINDER;

function withTwaSource(url: string): string {
  const u = new URL(url, 'https://www.tinynudge.online');
  u.searchParams.set('source', 'twa');
  return `${u.pathname}${u.search}${u.hash}`;
}

// A user's registered devices: web push subscriptions (push_subscriptions) and
// native FCM tokens (fcm_tokens), both keyed by owner `uid`.
type PushDevices = {
  web: QueryDocumentSnapshot[];
  fcm: QueryDocumentSnapshot[];
  timezone?: string;
};

// Loads every push device once, grouped by owner. Having enabled push on a
// device is the opt-in, independent of the email preferences.
async function loadPushDevices(db: Firestore): Promise<Map<string, PushDevices>> {
  const [webSnap, fcmSnap] = await Promise.all([
    db.collection('push_subscriptions').get(),
    db.collection('fcm_tokens').get(),
  ]);
  const byUid = new Map<string, PushDevices>();
  const add = (doc: QueryDocumentSnapshot, kind: 'web' | 'fcm') => {
    const { uid, timezone } = doc.data() as { uid?: string; timezone?: string };
    if (!uid) return;
    let devices = byUid.get(uid);
    if (!devices) {
      devices = { web: [], fcm: [] };
      byUid.set(uid, devices);
    }
    devices[kind].push(doc);
    if (typeof timezone === 'string' && timezone && !devices.timezone) devices.timezone = timezone;
  };
  webSnap.docs.forEach((doc) => add(doc, 'web'));
  fcmSnap.docs.forEach((doc) => add(doc, 'fcm'));
  return byUid;
}

// FCM error codes meaning the token will never work again.
const STALE_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// Sends the payload to every device of one user. Deletes subscriptions/tokens
// the push services report as gone. Returns how many deliveries succeeded.
async function sendPushToDevices(devices: PushDevices, payload: PushPayload): Promise<number> {
  let delivered = 0;

  const webSends = devices.web.map(async (doc) => {
    const { subscription } = doc.data() as { subscription?: webpush.PushSubscription };
    if (!subscription?.endpoint) {
      await doc.ref.delete().catch(() => undefined);
      return;
    }
    // Subscriptions saved inside the Android app (TWA) open with ?source=twa so
    // the site keeps its in-app context (no web checkout inside the Play app).
    const { context } = doc.data() as { context?: string };
    const body = context === 'android-twa' ? { ...payload, url: withTwaSource(payload.url) } : payload;
    try {
      await webpush.sendNotification(subscription, JSON.stringify(body), { TTL: 6 * 60 * 60 });
      delivered++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await doc.ref.delete().catch(() => undefined);
      } else {
        console.error(`push: web push failed (${statusCode ?? 'unknown'})`, err);
      }
    }
  });

  const fcmSends = devices.fcm.map(async (doc) => {
    const { token } = doc.data() as { token?: string };
    if (!token) {
      await doc.ref.delete().catch(() => undefined);
      return;
    }
    try {
      await getMessaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: { url: payload.url },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      delivered++;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code && STALE_FCM_CODES.has(code)) {
        await doc.ref.delete().catch(() => undefined);
      } else {
        console.error(`push: FCM send failed (${code ?? 'unknown'})`, err);
      }
    }
  });

  await Promise.all([...webSends, ...fcmSends]);
  return delivered;
}

// ─── daily nudge reminder ────────────────────────────────────────────────────

// Runs every hour. At the reminder time each user picked in their own timezone
// (default 6:00 PM), if they haven't completed a nudge today:
//  - fires `nudge_ready` by email for users with emailDailyReminders on;
//  - sends a push to every device the user enabled push on (web push + FCM),
//    regardless of the email preference.
// Email and push are de-duplicated separately (lastDailyReminderDate /
// lastPushReminderDate), so each goes out at most once per user per local day.
export const dailyNudgeReminders = onSchedule(
  { schedule: '0 * * * *', secrets: [loopsApiKey, vapidPrivateKey] },
  async () => {
    const loops = new LoopsClient(loopsApiKey.value());
    const db = getFirestore();

    // If the VAPID key is missing/invalid, still send email and FCM pushes.
    let webPushReady = false;
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, vapidPrivateKey.value().trim());
      webPushReady = true;
    } catch (err) {
      console.error('dailyNudgeReminders: VAPID setup failed, web push disabled', err);
    }

    const [prefSnap, pushDevices] = await Promise.all([
      db.collection('user_preferences').where('emailDailyReminders', '==', true).get(),
      loadPushDevices(db).catch((err) => {
        console.error('dailyNudgeReminders: failed to load push devices', err);
        return new Map<string, PushDevices>();
      }),
    ]);

    // Everyone who might get a reminder: email opt-ins plus push device owners
    // (who may have email reminders off, or no preferences doc at all).
    const candidates = new Map<string, { ref: DocumentReference; pref?: UserPreferences }>();
    for (const doc of prefSnap.docs) {
      candidates.set(doc.id, { ref: doc.ref, pref: doc.data() as UserPreferences });
    }
    for (const uid of pushDevices.keys()) {
      if (candidates.has(uid)) continue;
      const ref = db.doc(`user_preferences/${uid}`);
      try {
        const snap = await ref.get();
        candidates.set(uid, { ref, pref: snap.exists ? (snap.data() as UserPreferences) : undefined });
      } catch (err) {
        console.error(`dailyNudgeReminders: failed to read preferences for ${uid}`, err);
      }
    }

    let sent = 0;
    let pushed = 0;
    let skipped = 0;

    for (const [uid, { ref: prefRef, pref }] of candidates) {
      const allDevices = pushDevices.get(uid);
      const devices: PushDevices | undefined = allDevices && {
        ...allDevices,
        web: webPushReady ? allDevices.web : [],
      };

      // No preferences doc → default time, in the device's timezone if known, else UTC.
      const { hour, date: localDate } = localNow(pref?.timezone || devices?.timezone);
      if (hour !== parseHour(pref?.notificationTime)) continue;

      const email = pref?.emailDailyReminders === true ? pref.email : undefined;
      const wantsEmail = !!email && pref?.lastDailyReminderDate !== localDate;
      const wantsPush =
        !!devices &&
        devices.web.length + devices.fcm.length > 0 &&
        pref?.lastPushReminderDate !== localDate;
      if (!wantsEmail && !wantsPush) { skipped++; continue; }

      // Skip if the user already completed a nudge today (lastCompletedDate is the user's local date)
      const userSnap = await db.doc(`users/${uid}`).get();
      const lastCompleted = userSnap.exists
        ? (userSnap.data() as { lastCompletedDate?: string }).lastCompletedDate
        : undefined;

      if (lastCompleted === localDate) { skipped++; continue; }

      if (wantsPush && devices) {
        try {
          // Never push to (or recreate data for) an account that is being deleted.
          const tombstone = await db.doc(`deleted_users/${uid}`).get();
          if (tombstone.exists || !userSnap.exists) { skipped++; continue; }
          const delivered = await sendPushToDevices(devices, PUSH_REMINDER);
          if (delivered > 0) {
            if (pref) {
              await prefRef.update({ lastPushReminderDate: localDate });
            } else {
              // create() fails instead of recreating a doc if one appeared meanwhile.
              await prefRef.create({ lastPushReminderDate: localDate }).catch(() =>
                prefRef.update({ lastPushReminderDate: localDate })
              );
            }
            pushed++;
          }
        } catch (err) {
          console.error(`dailyNudgeReminders: push failed for ${uid}`, err);
        }
      }

      if (!wantsEmail || !email) continue;

      // Pick a nudge title — prefer a skipped ("saved for later") activity,
      // fall back to the first active one. Purely for email personalisation.
      let nudgeTitle: string | undefined;
      try {
        const skippedSnap = await db
          .collection('user_activities')
          .where('user_id', '==', uid)
          .where('status', '==', 'skipped')
          .limit(1)
          .get();
        if (!skippedSnap.empty) {
          nudgeTitle = (skippedSnap.docs[0].data() as { title?: string }).title;
        } else {
          const activeSnap = await db
            .collection('user_activities')
            .where('user_id', '==', uid)
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
        await prefRef.update({ lastDailyReminderDate: localDate });
        sent++;
      } catch (err) {
        console.error(`dailyNudgeReminders: failed for ${email}`, err);
        skipped++;
      }

      // Stay within 10 req/sec
      if (sent > 0 && sent % 10 === 0) await delay(1100);
    }

    console.log(`dailyNudgeReminders: sent=${sent}, pushed=${pushed}, skipped=${skipped}`);
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

// ─── deleted account cleanup ─────────────────────────────────────────────────

// /api/account/delete writes deleted_users/{uid} with `cleanupAfter` (about one
// hour after deletion, when every ID token issued before it has expired). A
// client or job that was mid-write during the deletion can recreate docs, so this
// repeats the sweep once. `cleanupAfter` is removed afterwards so each tombstone
// is processed once; the tombstone itself stays so Firestore rules keep blocking
// writes from that uid.
const DELETED_ACCOUNT_COLLECTIONS: { name: string; field: string }[] = [
  { name: 'user_connections', field: 'user_id' },
  { name: 'user_activities', field: 'user_id' },
  { name: 'blind_date_entries', field: 'user_id' },
  { name: 'watched_films', field: 'user_id' },
  { name: 'meal_plans', field: 'user_id' },
  { name: 'push_subscriptions', field: 'uid' },
  { name: 'fcm_tokens', field: 'uid' },
];

async function deleteWhere(db: Firestore, collection: string, field: string, uid: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await db.collection(collection).where(field, '==', uid).select().limit(450).get();
    if (snap.empty) return deleted;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < 450) return deleted;
  }
}

export const cleanupDeletedAccounts = onSchedule('30 * * * *', async () => {
  const db = getFirestore();
  const nowIso = new Date().toISOString();
  const snap = await db.collection('deleted_users').where('cleanupAfter', '<=', nowIso).limit(200).get();

  let cleaned = 0;
  for (const tomb of snap.docs) {
    const uid = tomb.id;
    try {
      let removed = 0;
      for (const { name, field } of DELETED_ACCOUNT_COLLECTIONS) {
        removed += await deleteWhere(db, name, field, uid);
      }
      const batch = db.batch();
      batch.delete(db.doc(`users/${uid}`));
      batch.delete(db.doc(`user_preferences/${uid}`));
      batch.update(tomb.ref, { cleanupAfter: FieldValue.delete(), cleanedAt: nowIso });
      await batch.commit();
      if (removed > 0) console.warn(`cleanupDeletedAccounts: removed ${removed} late docs for ${uid}`);
      cleaned++;
    } catch (err) {
      console.error(`cleanupDeletedAccounts: failed for ${uid}`, err);
    }
  }

  console.log(`cleanupDeletedAccounts: cleaned=${cleaned}`);
});
