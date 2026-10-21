# App Store listing: TinyNudge (iOS)

Everything to paste into App Store Connect for bundle ID `online.tinynudge.app`, the Capacitor app
built by fastlane (see `docs/IOS_BUILD.md`). The answers match what the code does as of 2026-10-20.
If the code changes, update this file, the App Privacy answers and
`fastlane/native/PrivacyInfo.xcprivacy` together.

Facts this file relies on:

- The app loads the live site https://www.tinynudge.online in a native shell. Native parts:
  - Google and Apple sign-in
  - push notifications (FCM/APNs)
  - the share sheet and haptics
  - Apple in-app purchase
  - an offline screen
- **Purchases use Apple IAP only.** The web checkout (Lemon Squeezy) is hidden in the iOS app.
  Product `online.tinynudge.premium.monthly`, $2.99/month, introductory offer 1 week free.
  Premium bought on the website also unlocks in the app. That's allowed by guideline 3.1.3(b),
  multiplatform services, because the same subscription is also sold by IAP in the app.
- **No analytics or tracking in the iOS app.** Google Analytics, Firebase Analytics and the cookie
  banner are skipped (`src/app/layout.tsx`, `src/app/firebase.js`). No ads, no IDFA, no ATT prompt.
- The child's first name is optional, stored only in Firestore, and filtered out of everything sent to
  Loops (`src/lib/loops-server.ts`).
- Account deletion is in the app (Account → Profile → Delete account). It revokes Sign in with
  Apple tokens and tells Apple subscribers to cancel in Settings. There's also
  https://www.tinynudge.online/delete-account.

---

## 1. App information

| Field | Limit | Value |
| --- | --- | --- |
| Name | 30 | `TinyNudge: Parenting Nudges` |
| Subtitle | 30 | `One small moment with your kid` |
| Primary category | | **Lifestyle** |
| Secondary category | | **Education** |
| Content rights | | No third-party content requiring rights. Embedded YouTube videos are standard YouTube embeds. |
| Age rating | | See section 4 |
| Privacy policy URL | | https://www.tinynudge.online/privacy |
| Terms of use (EULA) | | https://www.tinynudge.online/terms. Also put this link at the end of the description: auto-renewing subscriptions need it. |
| Support URL | | https://www.tinynudge.online/support |
| Marketing URL | | https://www.tinynudge.online |
| Copyright | | `2026 TinyNudge` |

## 2. Version page

**Promotional text** (170, can change without review):

```
New: streak freezes keep your habit alive on busy days. Try Premium free for a week.
```

**Keywords** (100 characters, comma-separated, no spaces after commas, don't repeat words from the name):

```
parent,kids,child,bonding,family time,activities,quality time,daily habit,toddler,routine,games
```

**Description** (4000):

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
• Reminders by notification or email, at a time you choose
• Sign in with Apple or Google, and use the same account on the web

FREE OR PREMIUM
The free plan includes one connection and 5 nudges a month. TinyNudge Premium unlocks all 50 nudges, multiple connections, streak freezes and scratch-card rewards.

Premium is a monthly auto-renewing subscription ($2.99/month in the US; local prices vary). New subscribers may get a 1-week free trial. Payment is charged to your Apple ID when you confirm. The subscription renews automatically unless you cancel at least 24 hours before the end of the current period. Manage or cancel any time in Settings > [your name] > Subscriptions.

PRIVATE BY DESIGN
No ads. No tracking. Your child's first name is optional and stays in TinyNudge: it is never sent to our email provider or anyone else. Delete your account at any time from the app.

TinyNudge is made for parents and caregivers. It is not designed for children to use.

Terms of Use: https://www.tinynudge.online/terms
Privacy Policy: https://www.tinynudge.online/privacy
```

**What's New** (first release): `First release of TinyNudge for iPhone.`

## 3. Screenshots and media

The app is **iPhone only**, so iPad screenshots aren't needed.

| Asset | Required | Size | Note |
| --- | --- | --- | --- |
| iPhone 6.9" screenshots | **Yes**, 1–10 (use 5–6) | 1320×2868 or 1290×2796 portrait, PNG/JPG, no alpha | Apple scales these down for smaller iPhones. |
| iPhone 6.5" screenshots | Only if Connect asks | 1284×2778 or 1242×2688 | |
| App preview video | No | 886×1920, 15–30 s | Optional. |
| App icon | From the build | 1024×1024, no alpha | `prepare_ios.sh` builds it from `public/icons/icon-1024.png`. |
| Subscription review screenshot | **Yes** (per IAP product) | Any iPhone screenshot of the paywall | Screenshot of the "TinyNudge Premium" sheet with the price shown. |

**Shot-list.** Take these from a TestFlight build on an iPhone 16/17 Pro Max simulator or device,
signed in with the review account. Don't include real children's names or photos.

1. Home: "One tap a day keeps the distance away", with the Son/Daughter cards
2. Dashboard with a connection, streak and today's nudge
3. A nudge detail: "About this Nudge" and "How to do it"
4. Nudge completed: streak going up, with the share button
5. Resources: one family game (e.g. Question Jar)
6. Sign in screen with Sign in with Apple and Continue with Google (shows the native feel)

## 4. Age rating questionnaire

Answer **None / No** to everything:

- violence (cartoon or realistic)
- sexual content or nudity
- profanity or crude humour
- horror or fear themes
- alcohol, tobacco or drugs
- mature or suggestive themes
- simulated gambling
- contests
- medical or treatment information
- health or wellness topics
- guns or weapons

Then:

| Question | Answer |
| --- | --- |
| Unrestricted web access | **No**. The web view only allows www.tinynudge.online (`allowNavigation` in `capacitor.config.ts`); other links open outside the app. |
| User-generated content shared with others | **No**. There's no chat, feed or public profiles. |
| Messaging / chat | No |
| Advertising | No |
| Parental controls / age assurance | No |
| Made for Kids | **No**. The audience is adults (parents). |

Expected rating: **4+**. This is a content rating, not the audience. The listing says the app is for parents.
Don't select the Kids category: it would bring Kids-category rules for sign-in and links.

## 5. App Privacy (nutrition label)

| Question | Answer |
| --- | --- |
| Do you or your third-party partners collect data from this app? | **Yes** |
| Used to track you (across other companies' apps/sites)? | **No** for every type |

| Data type | Linked to user | Purposes | Notes |
| --- | --- | --- | --- |
| Contact Info → Name | Yes | App Functionality, Developer's Advertising or Marketing | The user's name from Apple/Google, or derived from their email; first name is used in emails. |
| Contact Info → Email Address | Yes | App Functionality, Developer's Advertising or Marketing | Sign-in, plus reminder, progress, billing and re-engagement/upgrade emails via Loops. |
| Identifiers → User ID | Yes | App Functionality | Firebase user ID. |
| Identifiers → Device ID | Yes | App Functionality | FCM push token, only if notifications are turned on. |
| Purchases → Purchase History | Yes | App Functionality | Subscription status and Apple transaction ID/expiry. |
| User Content → Other User Content | Yes | App Functionality | Connections, the optional child's first name, saved journal entries and meal plans. |
| Usage Data → Product Interaction | Yes | App Functionality, Developer's Advertising or Marketing | Nudges completed, streaks, last active date. Streak stats drive the progress and re-engagement emails. |

**Not collected:** location, contacts, health and fitness, financial info (card data stays with Apple),
browsing or search history, sensitive info, photos/videos, audio, diagnostics/crash data, and
advertising data.

`fastlane/native/PrivacyInfo.xcprivacy` declares the same seven data types and purposes. Keep the
two in step whenever data collection changes.

## 6. Subscription (App Store Connect → Monetization → Subscriptions)

| Field | Value |
| --- | --- |
| Subscription group | TinyNudge Premium |
| Reference name | Premium Monthly |
| Product ID | `online.tinynudge.premium.monthly` (must match the code exactly) |
| Duration | 1 month |
| Price | $2.99 (tier for USD; let Apple set other countries) |
| Introductory offer | Free, 1 week, new subscribers |
| Display name | TinyNudge Premium |
| Description | `All 50 nudges, multiple connections and streak freezes.` |
| Review screenshot | The paywall (section 3) |
| Server notifications | V2, Production and Sandbox → `https://www.tinynudge.online/api/apple/notifications` |

Submit the subscription **with the first app version** (select it on the version page under
"In-App Purchases and Subscriptions"). Otherwise review can't test it.

## 7. App Review information

| Field | Value |
| --- | --- |
| Sign-in required | Yes |
| Username | `<REVIEW_TEST_EMAIL>` |
| Password | `<REVIEW_TEST_PASSWORD>` |
| Contact | Your name, phone, tinynudge@gmail.com |

**Notes for the reviewer:**

```
TinyNudge helps parents spend a few minutes a day connecting with their child.

TEST ACCOUNT
Use the email/password account above: tap "Sign In" (top right), keep the "Sign In" tab selected, enter the details. The account already has a connection and some completed nudges. Sign in with Apple and Continue with Google also work.

NATIVE FEATURES
• Sign in with Apple and Google use the native iOS sheets.
• Push notifications: Account → Email preferences → turn on notifications (native permission prompt; reminders arrive at the chosen time).
• Share: complete a nudge, then tap Share to open the iOS share sheet.
• Haptic feedback when completing a nudge.
• Offline: with no connection the app shows its own offline screen instead of an error.

IN-APP PURCHASE
Premium is the auto-renewing subscription online.tinynudge.premium.monthly (1-week free trial for new subscribers). Open Account → Profile → Your plan → Upgrade, or tap Upgrade after the free limit (5 nudges a month or 1 connection). "Restore purchases" is on the same screen. The paywall links to the Terms of Use and Privacy Policy.
Customers who already bought Premium on our website can sign in and use it here (multiplatform service, 3.1.3(b)). The iOS app sells only through in-app purchase and doesn't link to outside payment.

ACCOUNT DELETION
Account → Profile → Delete account. It deletes all data, revokes Sign in with Apple, and reminds Apple subscribers to cancel in Settings.

The app is for adults (parents). Children don't use it. A child's first name can optionally be entered by the parent; it is never shared with third parties.
```

Before pasting, open the app and check that "Account → Profile → Your plan → Upgrade" is the real
path. If it differs, correct the notes.

## 8. Launch checklist: only you can do these

1. Apple Developer Program membership is active, and the **Paid Apps agreement**, tax and banking
   are complete. IAP won't work in review without them.
2. App ID, App Store Connect app record, API key, match repo and GitHub secrets: follow
   `docs/IOS_BUILD.md`.
3. Firebase → Authentication → Apple provider: Services ID, Team ID, Key ID and private key. This is
   needed for Sign in with Apple and for token revocation on account deletion.
4. Create the subscription (section 6) and set the Server Notifications URL.
5. Create the review test account on the website. Add a connection and complete a nudge.
6. Run the iOS workflow, then install from TestFlight and check:
   - Sign in with Apple and Google
   - push notifications
   - a sandbox purchase, then Restore purchases
   - delete account
   - the offline screen (airplane mode)
   - no Lemon Squeezy, price-on-web or "buy on website" anywhere
7. Take the screenshots and the subscription review screenshot (section 3).
8. Fill in App Information, App Privacy (section 5), the age rating (section 4), and pricing (Free, all
   countries or your choice).
9. Attach the build and the subscription to version 1.0, paste the review notes, and submit.

## Known review risks

- **4.2 Minimum functionality (web wrapper):** mitigated by native sign-in, push, share sheet,
  haptics, IAP and the offline screen. Spell these out in the notes (done above).
- **2.1 / placeholder content:** the home page shows connection types marked "Coming Soon" (only
  Son and Daughter are live). Reviewers sometimes reject visible "coming soon" items. Consider hiding them in the iOS app.
- **5.1.1(v) account deletion** and **3.1.2 subscription info** are covered: in-app deletion, and
  terms/privacy links on the paywall.
- **Cross-platform accounts:** Sign in with Apple is offered only in the iOS app today. A user who
  signs up with Apple can't sign in on the website or Android yet. That isn't a review problem, but
  it's a support problem. It's reported separately as a code defect.
