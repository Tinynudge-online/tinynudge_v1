# Google Play listing: TinyNudge (Android)

Everything to paste into Play Console for `online.tinynudge.app`, the Trusted Web Activity in
`android/`. The answers match what the code does as of 2026-10-20. If the code changes (new data,
a new SDK, purchases in the Android app), update this file and the Play forms together.

Facts this file relies on:

- The Android app is the live site https://www.tinynudge.online running full-screen in Chrome (TWA).
- **No purchases in the Android app.** The site detects the app and hides upgrade, trial and pricing
  UI (`src/lib/app-context.ts`, purchase channel `none`). Premium bought on the website still unlocks.
- **No analytics in the Android app.** Google Analytics, Firebase Analytics and the cookie banner
  are skipped in app mode (`src/app/layout.tsx`, `src/app/firebase.js`).
- No ads, no ad SDKs, no tracking.
- The child's first name is optional, stored only in Firestore, and filtered out of everything sent to
  Loops (`src/lib/loops-server.ts`, `CHILD_DATA_KEYS`).
- Account deletion is available in the app (Account → Profile → Delete account) and on the web at
  https://www.tinynudge.online/delete-account.

---

## 1. Main store listing

| Field | Limit | Text |
| --- | --- | --- |
| App name | 30 | `TinyNudge: Parenting Nudges` |
| Short description | 80 | `One tiny activity a day to stay close to your child. Simple steps, no prep.` |

**Full description** (limit 4000):

```
Busy day? TinyNudge gives you one tiny activity a day, a "nudge", to connect with your child. Most nudges take 5 to 15 minutes, need no prep, and come with simple steps.

HOW IT WORKS
• Add your son or daughter as a connection (you can add their first name, or not)
• Pick how often you want a nudge: daily, weekly, bi-weekly or monthly
• Open today's nudge, follow the steps, tap done
• Build a streak and watch your moments add up

WHAT'S INSIDE
• 50 nudges for parents of children under 10, in five themes: Touch & Connect, Play Together, Talk & Connect, Get Moving and Wind Down
• Step-by-step guidance for every nudge, some with a short video to watch first
• Family games and tools: Question Jar, What-If Questions, Story Chain, High-Low-Buffalo, Name-Place-Animal-Thing, a meal planner and short films to watch together
• Streaks and streak freezes so one busy day doesn't break your habit
• Optional reminders by notification or email, at a time you choose

FREE TO START
The free plan includes one connection and 5 nudges a month. Premium members get every nudge and multiple connections. Sign in with the same account to use your plan on the web and in the app.

PRIVATE BY DESIGN
No ads. No tracking. Your child's first name is optional and stays in TinyNudge: it is never sent to our email provider or anyone else. Delete your account at any time from the app.

TinyNudge is made for adults: parents and caregivers. It is not designed for children to use.
```

> Keep the Android description free of prices and "buy" calls to action: purchasing isn't
> available in the Android app, and Play's payments policy forbids steering users to an outside
> purchase from the listing or the app.

| Field | Value |
| --- | --- |
| App category | **Parenting** |
| Tags (pick up to 5) | Parenting, Family, Kids activities, Habits, Lifestyle (pick the closest Play offers) |
| Contact email | tinynudge@gmail.com |
| Website | https://www.tinynudge.online |
| Privacy policy | https://www.tinynudge.online/privacy |

## 2. Graphics and screenshots

| Asset | Required | Spec | Source / note |
| --- | --- | --- | --- |
| App icon | Yes | 512×512 PNG, 32-bit, ≤1 MB | `public/icons/icon-512.png` |
| Feature graphic | Yes | 1024×500 JPG or 24-bit PNG (no alpha) | Needs to be made |
| Phone screenshots | Yes, 2–8 (4+ recommended for featuring) | 9:16, 1080×1920 recommended (each side 320–3840 px), JPG or 24-bit PNG | Shot list below |
| 7" / 10" tablet screenshots | Only if you target tablets | 1200×1920 / 1600×2560 | Skip for launch (portrait phone app) |
| Promo video | No | YouTube URL | Optional |

**Screenshot shot-list** (take them from the installed APK so the status bar is real, signed in with
the review test account; no real children's names or photos):

1. Home: "One tap a day keeps the distance away", with the Son/Daughter connection cards
2. Dashboard: "Welcome back" with a connection, streak and today's nudge
3. A nudge detail: "About this Nudge" and "How to do it" steps
4. Nudge completed: streak count going up
5. Resources: one of the family games (e.g. Question Jar)
6. Reminder settings: Account → Email preferences, with the notification toggle

Make sure no screenshot shows a price, an Upgrade button or a trial button.

## 3. App content (Policy → App content)

### Privacy policy
https://www.tinynudge.online/privacy

### Ads
**No, my app does not contain ads.**

### App access
**All or some functionality is restricted** → add instructions:

```
TinyNudge needs an account. Sign in with email and password:
Email: <REVIEW_TEST_EMAIL>
Password: <REVIEW_TEST_PASSWORD>
On the home screen tap "Sign In" (top right), make sure the "Sign In" tab is selected, enter the details above and submit.
The account already has a connection and a few completed nudges.
```

Create this account on the website first, add one connection and complete a nudge so the reviewer
lands on a populated dashboard. Don't use a Google account for review.

### Content rating (IARC questionnaire)
Category: **Reference, News, or Educational** is closest. If Play's list doesn't fit, choose **All Other App Types**.

| Question | Answer |
| --- | --- |
| Violence, blood, fear | No |
| Sexuality, nudity | No |
| Language (profanity, crude humour) | No |
| Controlled substances (drugs, alcohol, tobacco) | No |
| Gambling (real or simulated) | No. The "scratch cards" are free in-app rewards (bonus nudges, streak freezes), never bought and never cash. |
| Users can interact or communicate with each other | No. There's no chat or public profiles; the share button only hands text to other apps. |
| Shares user's location with others | No |
| Allows purchase of digital goods | No. The Android app has no purchases. |
| Unrestricted internet / web browser | No. The app only opens www.tinynudge.online; other links open in the browser. |
| Miscellaneous (e.g. horror themes, discrimination) | No |

Expected rating: **Everyone / PEGI 3 / USK 0**.

### Target audience and content
- Target age groups: **18 and over only.**
- Could the app unintentionally appeal to children? **No**: it's a planning tool for parents, with
  plain adult UI and no characters, games-for-kids storefront or child sign-up.
- This keeps the app out of the Families programme. Don't tick younger age groups. If you do,
  the Families policy applies, including restrictions on SDKs and on collecting a child's name.

### News app
No.

### Health apps
No health features. (Parenting/relationship content, not medical, fitness or mental-health treatment.)

### Financial features
None.

### Government apps
No.

### Data safety

Answers to the form, section by section.

**Data collection and security**

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only) |
| Which methods of account creation does your app support? | Username/password, and OAuth (Sign in with Google) |
| Account deletion URL | https://www.tinynudge.online/delete-account |
| Do you provide a way for users to request that some or all of their data is deleted, without deleting their account? | Yes. Users can delete connections and turn off emails/notifications in the app, or email tinynudge@gmail.com. |

**Shared?** Answer **No** for every type below. Google's definition excludes transfers to
service providers that process data on your behalf (Firebase, Loops, Lemon Squeezy).

**Data types collected**

| Category → type | Collected | Optional? | Purposes | Notes |
| --- | --- | --- | --- | --- |
| Personal info → Name | Yes | Required | App functionality, Account management, Developer communications, Personalization | The user's name from Google, or derived from their email. First name is used in emails. |
| Personal info → Email address | Yes | Required | App functionality, Account management, Developer communications, Advertising or marketing | Account sign-in; reminder, progress, billing and re-engagement emails via Loops (users can switch each type off). |
| Personal info → User IDs | Yes | Required | App functionality, Account management | Firebase user ID. |
| Personal info → Other info | Yes | **Optional** | App functionality, Personalization | Child's first name (optional), shown back to the parent only. |
| Financial info → Purchase history | Yes | Optional | App functionality | Subscription status of a plan bought on the website (plan, trial dates, Lemon Squeezy IDs) so Premium unlocks in the app. No card data. |
| App activity → App interactions | Yes | Required | App functionality, Developer communications | Nudges started/completed, streaks, progress. Streak stats feed the progress emails. |
| App activity → Other user-generated content | Yes | Optional | App functionality | Things saved in Resources (journal entries, meal plans, watched films). |
| Device or other IDs | Yes | **Optional** | App functionality | Web push subscription, only if the user turns on notifications. |

**Not collected:** location, contacts, photos/videos, audio, files, calendar, messages, health and
fitness, web browsing history, installed apps, crash logs, diagnostics, and any analytics.

Check before submitting:
- Some nudges embed YouTube videos. If you think Google will treat the embedded player's data as
  collected by your app, also declare App activity → App interactions for Analytics. As built, the
  app itself collects none from the player.
- The answers assume analytics stay off in the Android app. If you ever turn them on, add
  App info and performance / App interactions → Analytics, and add a consent prompt.

## 4. Release setup

| Item | Value |
| --- | --- |
| Package name | `online.tinynudge.app` |
| App signing | Play App Signing (Google holds the app signing key, you hold the upload key) |
| Release track for first upload | Internal testing, then Closed testing (12+ testers for 14 days for new personal accounts) |
| Countries | All, or start with your own country |
| Price | Free |
| Contains in-app purchases | No |

## 5. Launch checklist: only you can do these

1. Create the app in Play Console (name TinyNudge, App, Free) and accept the Developer Programme Policies.
2. Upload the `.aab` from the "Android build (TWA)" GitHub Action to Internal testing. Accept Play App Signing.
3. Copy the **App signing key SHA-256** from Play Console → Test and release → Setup → App integrity,
   and send it to Claude. It goes into `public/.well-known/assetlinks.json` next to the upload key,
   then the site is redeployed. Without it, Play installs show a browser address bar.
4. Create the review test account on the website (section 3, App access) and paste its credentials.
5. Make the feature graphic and take the 4–6 screenshots (section 2).
6. Fill in App content: privacy policy, ads, app access, content rating, target audience 18+,
   data safety, health/financial/news/government declarations.
7. Recruit 12+ closed testers and keep the closed test running for 14 days (new personal accounts only).
8. Install from the Play test track and check:
   - no address bar
   - Google sign-in works
   - no Upgrade or trial buttons anywhere, including after opening a link from a TinyNudge email
   - notifications arrive
   - delete account works
9. Apply for production access, then roll out.
