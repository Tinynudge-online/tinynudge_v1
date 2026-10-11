# Loops.so Setup Guide — TinyNudge

> **Setup is complete.** All emails were built and published directly in Loops, and **Loops is the source of truth** for email content. Edit emails in the Loops dashboard. The old apply script has been deleted; don't recreate or re-run an automated setup, because it would duplicate emails and re-edit live workflows.

---

## 1. Get your API Key

1. Log in to Loops → **Settings → API**.
2. Copy your API key.
3. Add it to `.env.local`:
   ```
   LOOPS_API_KEY=your_key_here
   ```
4. Add it to Firebase Functions secret (used by Cloud Functions):
   ```bash
   firebase functions:secrets:set LOOPS_API_KEY
   # paste the key when prompted
   ```

---

## 2. Contact Properties

Before building loops, add these custom contact properties in Loops → **Contacts → Properties**:

| Property key        | Type    | Notes                                         |
|---------------------|---------|-----------------------------------------------|
| `firstName`         | String  | Set at signup                                 |
| `currentStreak`     | Number  | Updated on every nudge completion             |
| `lastActiveDate`    | String  | ISO date `YYYY-MM-DD`, updated on completion  |
| `lastNudgeId`       | String  | ID of the last completed nudge                |
| `source`            | String  | `email` or `google`                           |

> **Children's data (COPPA): never sent to Loops.** The app must not send `childName`, `relationshipType` or any other information about a child to Loops, in any contact update, event or transactional email. `src/lib/loops-server.ts` strips these keys from every payload as a safeguard. Emails that mention the child should use generic wording such as "your child".

---

## 3. Emails (done)

Every email exists and is published in Loops. Workflows (marketing and engagement) respect Loops unsubscribes. Transactional emails (account and billing) are always sent.

- **Transactional email IDs** are in `src/lib/loops-transactional.ts`, with a copy in `functions/src/loops-transactional.ts`. If you recreate a transactional email in Loops, update both files and redeploy.
- **Lemon Squeezy overlap:** Payment Failed and Subscription Cancelled are switched off in `src/lib/email-config.ts` until Lemon Squeezy's own versions of those emails are turned off.
- **Backup:** `npm run loops:snapshot` saves a read-only copy of every Loops email to `scripts/loops/backups/` (not committed).

The table below lists every email for reference. `LOOPS_EMAILS.md` holds the original draft copy; the live content is in Loops.

| # | Email | Trigger event | Respects user preference? | Copy |
|---|------|---------------|---------------------------|------|
| 1 | Welcome drip | `signup` | No (onboarding) | Sections 1, 1a, 1b |
| 2 | Daily nudge reminder | `nudge_ready` | "Daily nudge reminder" + chosen time | Section 2 |
| 3 | Streak milestone | `streak_milestone` | "Streak milestones" | Section 3 |
| 4 | Gentle check-in | `parent_inactive` | "Gentle check-in" | Section 4 |
| 5 | Trial started | `trial_started` | No (account) | Section 5 |
| 6 | Trial ending | `trial_ending` | No (account) | Section 6 |
| 7 | Trial ended | Transactional: `trial_ended` | No (account) | Section 7 |
| 8 | Welcome to Premium | Transactional: `premium_started` | No (billing) | Section 8 |
| 9 | Payment failed | Transactional: `payment_failed` | No (billing) | Section 9 |
| 10 | Payment recovered | Transactional: `payment_recovered` | No (billing) | Section 10 |
| 11 | Subscription cancelled | Transactional: `subscription_cancelled` | No (billing) | Section 11 |
| 12 | Subscription resumed | Transactional: `subscription_resumed` | No (billing) | Section 12 |
| 13 | Subscription ended | Transactional: `subscription_expired` | No (billing) | Section 13 |
| 14 | Weekly progress | `weekly_progress` | "Weekly progress" | Section 14 |
| 15 | Monthly insights | `monthly_insights` | "Monthly insights" | Section 15 |

> The app no longer sends `activity_completed`. After each completed nudge the server updates the contact's `currentStreak`, `lastActiveDate` and `lastNudgeId` directly.
>
> If you previously created a `daily_reminder` loop, delete it. That event is no longer sent (it duplicated `nudge_ready`).

### Lemon Squeezy webhook events

Emails 8–13 are sent by the Lemon Squeezy webhook as transactional emails (key shown in the table, not a Loops event). In Lemon Squeezy → **Settings → Webhooks**, make sure your webhook (pointing at `https://www.tinynudge.online/api/lemonsqueezy/webhook`) has these events ticked:

- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_payment_failed`
- `subscription_payment_recovered`

Lemon Squeezy also sends its own payment receipts, so TinyNudge doesn't send a separate receipt email.

---

## 4. Event Reference

| Event name | Fired by | Event properties (usable as merge fields) |
|---|---|---|
| `signup` | App | — (sets contact `firstName`, `source`) |
| `streak_milestone` | Server (milestone days 3, 7, 14, 30, 50, 100, 200, 365) | `streak`. The contact's `currentStreak` is updated first. |
| `nudge_ready` | `dailyNudgeReminders` function (hourly) | `nudgeTitle` (optional) |
| `parent_inactive` | `reEngageInactive` function (daily) | — (refreshes contact `currentStreak`) |
| `weekly_progress` | `weeklyProgress` function (Mon) | `completedThisPeriod`, `currentStreak`, `longestStreak`, `totalCompleted` |
| `monthly_insights` | `monthlyInsights` function (1st) | same as weekly |
| `trial_started` | App | — |
| `trial_ending` | `trialEndingReminder` function (daily) | `trialEndDate` |
| `trial_ended` | `expireTrials` function (hourly) or sign-in | — |
| `premium_started` | LS webhook | `renewsDate` |
| `payment_failed` | LS webhook | `updatePaymentUrl` (may be blank) |
| `payment_recovered` | LS webhook | — |
| `subscription_cancelled` | LS webhook | `accessEndsDate` |
| `subscription_resumed` | LS webhook | `renewsDate` |
| `subscription_expired` | LS webhook | — |

Contacts also carry the user's email preferences (`emailDailyReminders`, `notifyStreakMilestones`, `emailWeeklyProgress`, `emailMonthlyInsights`, `notifyReEngagement`, `notificationTime`, `timezone`), synced whenever they change. Use these if you send one-off campaigns from Loops so you respect people's choices.

Events sent from the app server include `_idempotencyKey` in `eventProperties` for traceability. Ignore it in templates.

---

## 5. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions,firestore
```

Verify in the Firebase console that these functions appear:
- `dailyNudgeReminders` (hourly)
- `weeklyProgress`
- `monthlyInsights`
- `reEngageInactive`
- `trialEndingReminder`
- `expireTrials` (hourly)

---

## 6. Verify end-to-end

1. Sign up with a test account → check Loops Contacts for the new contact + `signup` event in the activity log.
2. Complete a nudge → check that the contact's `currentStreak` and `lastActiveDate` are updated.
3. In the Firebase console, manually trigger `dailyNudgeReminders` and `reEngageInactive` from the Functions tab (use the "Test" button) — confirm emails land.

---

## 7. Architecture note — why two separate implementations

The Cloud Functions (`functions/src/index.ts`) run in a separate Node.js process with their own `package.json`. They cannot import from `src/lib/loops-server.ts`. The retry/backoff helper is therefore duplicated inline in `functions/src/index.ts`. If both grow significantly, consider extracting a shared package (`packages/loops-shared/`) and referencing it from both. For the current scale, the inline duplication is fine.
