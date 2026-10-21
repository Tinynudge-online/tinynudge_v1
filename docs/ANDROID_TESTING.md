# Testing the TinyNudge Android app

This guide is for anyone testing the TinyNudge Android app before it's on Google Play. You don't need any technical knowledge.

The Android app opens **https://www.tinynudge.online** full screen, inside Google Chrome. Anything you can do on the website, you can do in the app. When the website is updated, the app updates too.

## What you need

- An Android phone running **Android 7.0 or newer**
- **Google Chrome** installed and up to date (Play Store → search "Chrome" → **Update**)
- The install file **`TinyNudge-1.0.0-android.apk`** (the TinyNudge team sends you a download link)

## 1. Install the app

1. On your Android phone, open the download link and download **`TinyNudge-1.0.0-android.apk`**.
2. When the download finishes, tap the file. You can also find it later in the **Files** app, under **Downloads**.
3. Android may say *"For your security, your phone is not allowed to install unknown apps from this source."* Tap **Settings**, turn on **Allow from this source**, then go back.
4. Tap **Install**. If Google Play Protect warns you about an unknown app, tap **More details**, then **Install anyway**. This is expected for apps that aren't on Play yet.
5. Tap **Open**. TinyNudge also appears on your home screen and in your app list.

**Updating to a newer test build:** install the new `.apk` the same way. Your sign-in and data are kept.

**Removing the app:** press and hold the TinyNudge icon, then tap **Uninstall**.

## 2. Check that it runs full screen

When the app opens, look at the top of the screen:

- ✅ **Correct:** you see only the TinyNudge page. There's no web address and no browser bar.
- ❌ **Wrong:** a bar at the top shows `www.tinynudge.online`, or a small Chrome toolbar appears.

If you see the bar:
1. Close the app completely: open recent apps, then swipe TinyNudge away.
2. Open it again.
3. If the bar is still there, take a screenshot and send it to the team.

## 3. Test checklist

Work through these in order. For anything that doesn't work, write down which step it was, what you expected and what happened, and take a screenshot.

| # | What to do | What should happen |
|---|---|---|
| 1 | Open the app for the first time | A pink TinyNudge screen, then the home page. No browser bar at the top. |
| 2 | **Sign in** with Google | Google's account picker opens, you choose your account, and you return to TinyNudge signed in. |
| 3 | Close the app fully and open it again | You're still signed in. |
| 4 | **Add a connection** (your child or family member) | The connection appears in your list. |
| 5 | **Complete a nudge**: open today's nudge and mark it done | It's marked complete, and the counter or progress updates. |
| 6 | Open a nudge and use **Share** | Android's share menu opens. |
| 7 | **Turn on notifications** when the app asks, or from the app's settings | Android asks *"Allow TinyNudge to send you notifications?"*. Tap **Allow**. |
| 8 | Wait for the next scheduled nudge reminder, or ask the team to send a test one | A notification from **TinyNudge** appears. Tapping it opens the app. |
| 9 | **Check Premium status after a web purchase:** if you bought Premium on the website, open the app signed in with the same account | Your Premium features are unlocked. The Android app doesn't show purchase buttons; buying happens on the website. |
| 10 | Turn on airplane mode and open the app | A friendly "you're offline" page appears instead of an error. Turn airplane mode off and it works again. |
| 11 | Rotate the phone | The app stays in portrait. |
| 12 | Sign out | You return to the signed-out home page. |

---

## For the TinyNudge team: Google Play

### Upload to closed testing

The build workflow (**GitHub → Actions → Android build (TWA)**) produces two files:

- `app-release-signed.apk`, for testers to install directly, as described above
- `app-release-bundle.aab`, which is the file Google Play needs

To upload the bundle:

1. Open **Play Console** (https://play.google.com/console) → **Create app**:
   - Name **TinyNudge**, language English (United States), **App**, **Free**
   - Accept the declarations
2. Go to **Test and release → Testing → Closed testing** → **Create track**, or use the default **Closed testing – Alpha** track.
3. In **Testers**, create an email list and add your testers' Gmail addresses. New personal developer accounts need **at least 12 testers opted in for 14 days in a row** before you can apply for production.
4. Go to **Create new release**. When asked about **Play App Signing**, choose **Use Google-generated key** (the recommended option) and continue.
5. Upload **`app-release-bundle.aab`**.
   - Release name: e.g. `1.0.0 (1)`
   - Add short release notes
6. **Next**, then **Save and publish**. Google reviews the first closed-test release, usually within a few days.
7. In the **Testers** tab, copy the **opt-in link** and send it to your testers. They open it on their phone, tap **Become a tester**, then install TinyNudge from the Play Store.

Every new upload needs a higher **version code**. Run the workflow with `version_code` set to 2, then 3, and so on.

### After the first upload: add Google's signing key to assetlinks.json

Google re-signs every app installed from Play with its **own** key. The website has to list that key's fingerprint too. Otherwise the copy installed from Play shows a browser bar at the top.

1. Play Console → TinyNudge → **Test and release → Setup → App integrity → App signing**.
2. Under **App signing key certificate**, copy the **SHA-256 certificate fingerprint**. It looks like `AB:CD:12:...`, with 32 pairs.
3. Add it to `public/.well-known/assetlinks.json`, next to the upload key that is already there:
   ```json
   "sha256_cert_fingerprints": [
     "86:EC:BE:36:C7:10:9D:AD:5A:15:B2:D2:49:5F:0C:EE:A8:D2:08:72:B2:34:CF:60:C0:4D:A7:CD:DB:03:36:F0",
     "PASTE:THE:PLAY:APP:SIGNING:KEY:HERE"
   ]
   ```
   The first entry is the **upload key**. It's used by the `.apk` that testers install directly, so keep it.
4. Deploy the website (`firebase deploy --only hosting`).
5. Check that https://www.tinynudge.online/.well-known/assetlinks.json shows both fingerprints.
6. Testers who installed from Play: uninstall the app, then install it again from Play. The browser bar should be gone.

More detail and troubleshooting: [android/README.md](../android/README.md).
