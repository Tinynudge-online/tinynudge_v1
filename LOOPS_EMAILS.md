# TinyNudge — Email Copy for Loops

Paste each email directly into its loop in the Loops dashboard.
Merge field syntax: `{{firstName}}`, `{{childName}}`, `{{currentStreak}}`, etc.

Brand voice: warm, encouraging, never guilt-trippy. Speaks to busy working parents.
Tagline: **"One tap a day keeps the distance away."**

---

## 1. Welcome Email

**Loop**: `signup` event → immediate send
**Trigger**: `signup` event

---

**Subject line (primary):** You just did something great, {{firstName}}
**Subject line (alt):** One small moment. That's all it takes.
**Preview text:** Your TinyNudge journey starts tonight — here's what to expect.

---

**Body:**

Hi {{firstName}},

You signed up. That single step matters more than you know.

Life gets loud. Work runs late. By the time you sit down, the evening is mostly gone. TinyNudge was built for exactly that moment — to give you one tiny, doable thing that keeps the connection with {{childName}} alive, even on the hard days.

**Here's how it works:**

Each nudge takes around 5 minutes. No prep, no performance — just a small moment that adds up to something real over time.

Tonight, open the app and pick your first nudge. That's it. You're already halfway there.

→ [Open TinyNudge](https://tinynudge.online)

See you tonight,
The TinyNudge team

*P.S. One tap a day keeps the distance away.*

---

## 1a. Drip Day 2 — How the nudges work

**Delay**: 1 day after signup
**Subject line (primary):** How TinyNudge nudges actually work
**Subject line (alt):** Your 5-minute connection guide
**Preview text:** 50 nudges, 5 categories, zero guilt.

---

**Body:**

Hi {{firstName}},

Yesterday you took the first step. Today, a quick look at what's inside.

**Your nudge library has 5 types:**

- **Touch & Connect** — physical closeness: a hug, a high-five, a little hand-hold
- **Play Together** — games and silliness with no screen required
- **Talk & Connect** — conversations that go deeper than "how was school?"
- **Get Moving** — activities that get both of you off the couch
- **Wind Down** — calm, cosy routines that end the day well

Every nudge is tagged by how long it takes (5 min, 15 min, 30+) and whether you need any materials. Filter by what fits *tonight* — tired parent mode is a valid filter.

The only rule: one tap, one moment, one day at a time.

→ [Browse tonight's nudges](https://tinynudge.online)

Rooting for you,
The TinyNudge team

---

## 1b. Drip Day 4 — The science of small moments

**Delay**: 3 days after signup (i.e. Day 4 from signup)
**Subject line (primary):** Why 5 minutes a day is enough
**Subject line (alt):** The surprising science of small moments
**Preview text:** Consistency beats intensity — and here's the research.

---

**Body:**

Hi {{firstName}},

Here's something research keeps confirming: **the quality of connection matters far more than the quantity of time.**

Children feel close to parents not through big events — holidays, weekends away, long talks — but through the small, predictable, repeated moments. A hug at breakfast. A silly question before bed. A game that lasts four minutes before someone starts cheating.

That's exactly what TinyNudge is designed for. Not grand gestures. Just tiny ones, consistently.

Five minutes of genuine presence beats two hours of distracted co-existence every single time. {{childName}} doesn't need the "perfect parent" — they need *you*, showing up.

You're already building that habit. Keep going.

→ [Tonight's nudge is waiting](https://tinynudge.online)

Warmly,
The TinyNudge team

---

## 2. Daily Nudge Reminder

**Loop**: `nudge_ready` event → immediate send
**Fired by**: `dailyNudgeReminders` Cloud Function — runs hourly and sends at each user's chosen reminder time in their own timezone, only if they haven't completed a nudge that day. Max one per day.

---

**Subject line (primary):** Tonight's nudge is ready 🌙
**Subject line (alt):** One small moment with {{childName}} — 5 minutes, that's all
**Preview text:** No prep needed. Just you and {{childName}}, tonight.

---

**Body:**

Hi {{firstName}},

{% if nudgeTitle %}Tonight's nudge: **{{nudgeTitle}}**.{% else %}Tonight's nudge is ready and waiting.{% endif %}

You don't need to plan ahead. You don't need anything special. Just open the app and do it.

{{childName}} will remember these moments long after you've forgotten the busy evenings. That's the thing about small — it compounds.

→ [See tonight's nudge](https://tinynudge.online)

You've got this,
TinyNudge

*One tap a day keeps the distance away.*

---

## 3. Streak Milestone Celebration

**Loop**: `streak_milestone` event → immediate send
**Fired by**: the server, only when the streak reaches 3, 7, 14, 30, 50, 100, 200 or 365 days, and only if the user has "Streak milestones" switched on. No Loops filter needed.
**Merge field**: `{{currentStreak}}` (contact property) or `{{streak}}` (event property), same number.

> If you previously built a loop on `activity_completed` with a streak filter, switch its trigger to `streak_milestone` (or turn it off) so people don't get two celebration emails.

---

**Subject line (primary):** {{currentStreak}} days in a row, {{firstName}} 🔥
**Subject line (alt):** Look at that streak — {{currentStreak}} days with {{childName}}
**Preview text:** This is what showing up looks like.

---

**Body:**

Hi {{firstName}},

**{{currentStreak}} days in a row.**

That's not luck. That's a decision you've made {{currentStreak}} times — to show up, even when the day was long and the evening was short.

{{childName}} feels that. They might not say it, but they feel it.

Keep going. The streak is just a number — what it represents is everything.

→ [Keep the streak alive](https://tinynudge.online)

Proud of you,
The TinyNudge team

*P.S. One tap a day keeps the distance away.*

---

## 4. Re-engagement

**Loop**: `parent_inactive` event → immediate send
**Fired by**: Cloud Function — daily, targeting users with `lastCompletedDate` 5+ days ago, with a 7-day cool-down between sends.

---

**Subject line (primary):** We saved your spot, {{firstName}}
**Subject line (alt):** {{childName}} is still waiting for tonight's nudge
**Preview text:** No guilt. Just a gentle reminder that it's never too late to restart.

---

**Body:**

Hi {{firstName}},

Life got busy — we get it. There's no guilt here.

Connection with {{childName}} isn't all-or-nothing. It doesn't reset to zero when you miss a week. It just picks up where you left it, as soon as you're ready.

Tonight could be that night.

One nudge. Five minutes. That's all it takes to remember why you signed up in the first place.

→ [Start again — pick tonight's nudge](https://tinynudge.online)

No pressure. Just here when you're ready.
The TinyNudge team

*One tap a day keeps the distance away.*

---

## 5. Trial Started

**Loop**: `trial_started` event → immediate send
**Trigger**: `trial_started` event (fired when user clicks "Start 7-Day Free Trial")

---

**Subject line (primary):** Your 7-day trial starts now, {{firstName}} 🚀
**Subject line (alt):** Full access unlocked — here's what to do first
**Preview text:** 7 days of unlimited nudges. No card required. Let's make them count.

---

**Body:**

Hi {{firstName}},

You now have full access to everything TinyNudge has to offer — for the next 7 days, completely free.

Here's what just unlocked:
- **Unlimited nudges** — all 50, every category
- **Multiple connections** — add as many relationships as you like
- **Full streak tracking** — your 🔥 never stops now

The best way to use your trial: pick 2–3 nudges this week and actually do them. That's all. Most parents who try 3 nudges in their first week stay because they've already felt the difference.

Tonight's a great night to start.

→ [Open TinyNudge — full access](https://tinynudge.online)

Enjoy every day of it,
The TinyNudge team

---

## 6. Trial Ending

**Loop**: `trial_ending` event → immediate send
**Fired by**: `trialEndingReminder` Cloud Function — fires ≤ 48 hours before trial expires, once per trial
**Merge field**: `{{trialEndDate}}` — the human-readable end date (e.g. "3 July")

---

**Subject line (primary):** Your trial ends {{trialEndDate}}, {{firstName}}
**Subject line (alt):** 48 hours left — keep the connection alive
**Preview text:** Don't lose your streak. $2.99/month keeps everything you've built.

---

**Body:**

Hi {{firstName}},

Your free trial ends on **{{trialEndDate}}**.

After that, you'll drop back to the free plan — which means fewer nudges and only one connection. The progress you've made with {{childName}} doesn't disappear, but the momentum could slow.

A TinyNudge Premium subscription is **$2.99/month** — less than a coffee. And far more valuable.

If you've done even one nudge this week, you already know it's worth it.

→ [Keep my full access — $2.99/mo](https://tinynudge.online)

No pressure, but your streak is waiting.
The TinyNudge team

---

## 7. Trial Ended

**Loop**: `trial_ended` event → immediate send
**Fired by**: `expireTrials` Cloud Function (hourly) or on the user's next sign-in, whichever comes first. Once per trial.

---

**Subject line (primary):** Your trial has ended, {{firstName}}, but your progress hasn't
**Subject line (alt):** Everything you built is still here
**Preview text:** You're on the free plan now. Here's what that means.

---

**Body:**

Hi {{firstName}},

Your 7-day TinyNudge trial has ended, and your account is now on the free plan.

Nothing you've done is lost. Your streak, your completed nudges and your first connection are all still there. Any extra connections are paused, not deleted.

If the last week helped you show up for {{childName}}, Premium keeps it all going for **$2.99/month**.

→ [Go Premium](https://tinynudge.online)

Either way, keep going. One tap a day still counts.
The TinyNudge team

---

## 8. Welcome to Premium

**Loop**: `premium_started` event → immediate send
**Fired by**: Lemon Squeezy webhook (`subscription_created`)
**Merge field**: `{{renewsDate}}` (optional), the next billing date

---

**Subject line (primary):** You're Premium now, {{firstName}} 💛
**Subject line (alt):** Thank you. Everything is unlocked.
**Preview text:** Unlimited nudges, multiple connections, and scratch-card rewards.

---

**Body:**

Hi {{firstName}},

Thank you for going Premium. It genuinely keeps TinyNudge running.

Here's what's yours now:
- **Unlimited nudges**, every category
- **Multiple connections**, for every important person in your life
- **Scratch cards** every 5 nudges, with bonus nudges and streak freezes

Your receipt comes separately from our payment partner, Lemon Squeezy. You can manage or cancel your subscription any time from the link in that receipt.

→ [Open TinyNudge](https://tinynudge.online)

With gratitude,
The TinyNudge team

---

## 9. Payment Failed

**Loop**: `payment_failed` event → immediate send
**Fired by**: Lemon Squeezy webhook (`subscription_payment_failed`)
**Merge field**: `{{updatePaymentUrl}}`, a link where the user can update their card. It can be blank, so the email also gives a fallback.

---

**Subject line (primary):** Quick heads-up about your TinyNudge payment
**Subject line (alt):** We couldn't process your payment
**Preview text:** Your Premium access is still on. Here's how to fix it in a minute.

---

**Body:**

Hi {{firstName}},

We tried to renew your TinyNudge Premium subscription, but the payment didn't go through. This usually means an expired card or a temporary bank hold.

**Your Premium access is still active** while we retry over the next few days.

To avoid any interruption, please update your payment details:

→ [Update payment method]({{updatePaymentUrl}})

If the button doesn't work, use the "Manage subscription" link in your Lemon Squeezy receipt, or just reply to this email and we'll help.

The TinyNudge team

---

## 10. Payment Recovered

**Loop**: `payment_recovered` event → immediate send
**Fired by**: Lemon Squeezy webhook (`subscription_payment_recovered`)

---

**Subject line (primary):** All sorted, your payment went through ✅
**Preview text:** Your Premium access continues as normal.

---

**Body:**

Hi {{firstName}},

Good news: your payment went through and your TinyNudge Premium subscription is back on track. Nothing else to do.

→ [Back to your nudges](https://tinynudge.online)

The TinyNudge team

---

## 11. Subscription Cancelled

**Loop**: `subscription_cancelled` event → immediate send
**Fired by**: Lemon Squeezy webhook (`subscription_cancelled`)
**Merge field**: `{{accessEndsDate}}`, the date Premium access ends

---

**Subject line (primary):** Your Premium cancellation is confirmed
**Subject line (alt):** You'll keep Premium until {{accessEndsDate}}
**Preview text:** You can change your mind any time before then.

---

**Body:**

Hi {{firstName}},

We've cancelled your TinyNudge Premium subscription. You won't be charged again.

You'll keep full Premium access until **{{accessEndsDate}}**. After that your account moves to the free plan, and your streak and history stay exactly where they are.

Changed your mind? You can resume any time before {{accessEndsDate}} from the "Manage subscription" link in your Lemon Squeezy receipt.

If something wasn't working for you, just reply. We read every message.

The TinyNudge team

---

## 12. Subscription Resumed

**Loop**: `subscription_resumed` event → immediate send
**Fired by**: Lemon Squeezy webhook (`subscription_resumed`)

---

**Subject line (primary):** Welcome back to Premium, {{firstName}}
**Preview text:** Your subscription is active again.

---

**Body:**

Hi {{firstName}},

Your TinyNudge Premium subscription is active again. Everything stays unlocked.

→ [Pick tonight's nudge](https://tinynudge.online)

Glad you're staying,
The TinyNudge team

---

## 13. Subscription Ended

**Loop**: `subscription_expired` event → immediate send
**Fired by**: Lemon Squeezy webhook (`subscription_expired`), when a cancelled subscription reaches its end date or payment retries run out

---

**Subject line (primary):** Your Premium access has ended
**Preview text:** Your progress is safe. Come back any time.

---

**Body:**

Hi {{firstName}},

Your TinyNudge Premium access has now ended, and your account is on the free plan.

Your streak, your history and your connections are all still saved. You can keep using TinyNudge for free, or come back to Premium whenever it suits you.

→ [Rejoin Premium](https://tinynudge.online)

Thank you for being part of TinyNudge.
The TinyNudge team

---

## 14. Weekly Progress

**Loop**: `weekly_progress` event → immediate send
**Fired by**: `weeklyProgress` Cloud Function, Mondays 9 AM UTC, for users with "Weekly progress" on
**Merge fields** (event properties): `{{completedThisPeriod}}` (nudges in the last 7 days), `{{currentStreak}}`, `{{longestStreak}}`, `{{totalCompleted}}`

---

**Subject line (primary):** Your TinyNudge week: {{completedThisPeriod}} nudges
**Subject line (alt):** Your week in review
**Preview text:** A quick look back, and a fresh week ahead.

---

**Body:**

Hi {{firstName}},

Here's your week:

- **{{completedThisPeriod}}** nudges completed
- **{{currentStreak}}**-day current streak (best ever: {{longestStreak}})
- **{{totalCompleted}}** nudges all-time

Every one of those was a moment {{childName}} got your full attention. And if last week got away from you, that's okay. This week is brand new, and one nudge tonight is a perfect restart.

→ [Start this week's first nudge](https://tinynudge.online)

The TinyNudge team

---

## 15. Monthly Insights

**Loop**: `monthly_insights` event → immediate send
**Fired by**: `monthlyInsights` Cloud Function, 1st of each month 9 AM UTC, for users with "Monthly insights" on
**Merge fields**: same as Weekly Progress, but `{{completedThisPeriod}}` covers the last 30 days

---

**Subject line (primary):** Your month in tiny moments, {{firstName}}
**Preview text:** {{completedThisPeriod}} nudges this month, plus one idea for next month.

---

**Body:**

Hi {{firstName}},

This month you completed **{{completedThisPeriod}}** nudges. Your longest streak so far is **{{longestStreak}}** days.

**One idea for this month:** pick a regular "nudge moment", like right after dinner or just before bedtime stories. Tying a nudge to something you already do is the easiest way to make it stick.

→ [See this month's nudges](https://tinynudge.online)

Here's to another month of small moments,
The TinyNudge team

---

## Notes for the Loops dashboard

- All `{{merge_fields}}` use the property keys defined in `LOOPS_SETUP.md`.
- If `{{childName}}` is blank (not yet captured from the user), set a fallback in Loops: `{{childName | default: "your child"}}`.
- If `{{firstName}}` is blank, set fallback: `{{firstName | default: "there"}}`.
- The streak celebration loop (Section 3) uses the `streak_milestone` event, which already fires only on milestones. Don't trigger it from `activity_completed`.
- Account & billing emails (Sections 6–13) are sent regardless of the user's email preferences, because they're about the account and payments.
- For the welcome drip (Sections 1a, 1b), set delays as "1 day after joining loop" and "3 days after joining loop" respectively in the loop builder.
