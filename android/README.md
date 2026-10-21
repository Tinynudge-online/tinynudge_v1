# TinyNudge for Android (Trusted Web Activity)

The Android app is a **Trusted Web Activity (TWA)**: a tiny Android wrapper that opens
https://www.tinynudge.online/?source=twa full-screen in the user's Chrome. Everything (sign-in,
nudges, push) is the live website, so a website deploy updates the app too. You only rebuild
the app when this folder changes (icon, name, colors, version).

- Package name: `online.tinynudge.app`
- Built with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) `@bubblewrap/cli@1.27.0`
  on GitHub Actions (`.github/workflows/android-build.yml`), so you don't need Android Studio.
- Target SDK: 36 (the workflow enforces it after generating the project).
- In-app purchases are **not offered** in the Android app (Play billing rules). The app detects
  `?source=twa` and hides purchase / trial buttons; Premium bought on the website still unlocks.

Files here:

| File | What it is |
| --- | --- |
| `twa-manifest.json` | The app's settings. The only file Bubblewrap needs. Committed. |
| `.gitignore` | Keeps keystores and the generated Android project out of git. |

## First-time setup (do once)

### 1. Create the upload key

In **Git Bash** at the repo root:

```bash
bash scripts/android/generate-keystore.sh
```

It asks for a password, then prints:
- where the keystore was saved (default `~/tinynudge-android-keys/tinynudge-upload.keystore`, outside the repo),
- the **upload key SHA-256 fingerprint**,
- a `.b64` file to paste into GitHub.

**Back up the keystore file and password** (password manager). If you lose it you must ask
Google Play support to reset the upload key.

### 2. Add GitHub secrets

GitHub repo > **Settings > Secrets and variables > Actions > New repository secret**:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | entire contents of `tinynudge-upload.keystore.b64` |
| `BUBBLEWRAP_KEYSTORE_PASSWORD` | the password you chose |
| `BUBBLEWRAP_KEY_PASSWORD` | the same password |

Then delete the `.b64` file from your computer.

### 3. Deploy the website first

The build downloads the app icons and web manifest from the live site, so they must be online
before the first build:

1. Deploy the website: `firebase deploy --only hosting`.
2. Check that each of these opens (no "404"):
   - https://www.tinynudge.online/icons/icon-512.png
   - https://www.tinynudge.online/icons/icon-maskable-512.png
   - https://www.tinynudge.online/manifest.json

The workflow checks these too and stops with a clear error if one is missing.

### 4. Build the app

GitHub > **Actions > "Android build (TWA)" > Run workflow**. Enter:
- `version_code`: `1` for the first upload, then 2, 3, ... (must go up every Play upload),
- `version_name`: e.g. `1.0.0`.

When it finishes (about 10 min), download the artifact `tinynudge-android-<code>`. It contains:
- `app-release-bundle.aab`: upload this to Google Play,
- `app-release-signed.apk`: install on a phone for testing.

After a successful upload, also update `appVersionCode` / `appVersion` in
`twa-manifest.json` to the values you used, so the file matches what's in the store.

### 5. Create the app in Play Console

1. https://play.google.com/console > **Create app** (name TinyNudge, App, Free).
2. **Test and release > Testing > Internal testing** (or Closed testing) > Create release >
   upload `app-release-bundle.aab`. Accept **Play App Signing** when asked (Google re-signs the app
   with its own key; yours is only the upload key).
3. New personal developer accounts must run a **closed test with at least 12 testers for 14 days**
   before production access is granted.

### 6. Connect the app to the website (Digital Asset Links)

Without this the app shows a browser address bar at the top instead of running full-screen.

1. Play Console > **Test and release > Setup > App integrity > App signing**. Copy both SHA-256 values:
   - **App signing key certificate** (Google's key, used for Play installs),
   - **Upload key certificate** (should match the fingerprint from step 1).
2. Edit `public/.well-known/assetlinks.json` and put the real values in the (empty)
   `sha256_cert_fingerprints` list, each inside quotes, separated by a comma:
   `"sha256_cert_fingerprints": ["AB:CD:...", "12:34:..."]`
   - Only real fingerprints: format `AB:CD:EF:...`, 32 pairs, uppercase. Never leave a placeholder
     or a half-filled value in the list; one malformed entry can make verification fail for all.
   - Add the **upload key** SHA-256 first (from step 1, or the workflow's "Print fingerprint" step)
     if you want to test the side-loaded APK; add the **App signing key** SHA-256 as soon as Play
     Console shows it (Play installs are signed with that key).
3. Deploy the website (`firebase deploy --only hosting`).
4. Check: open https://www.tinynudge.online/.well-known/assetlinks.json (must show your JSON), then
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.tinynudge.online&relation=delegate_permission/common.handle_all_urls
   (must list `online.tinynudge.app`).
5. Uninstall and reinstall the app from Play: no address bar = verified.

`firebase.json` already serves this file as `application/json` and no longer hides the
`.well-known` folder.

### 7. Store listing

Play Console needs: short + full description, 512x512 icon (`public/icons/icon-512.png`),
1024x500 feature graphic, at least 2 phone screenshots, privacy policy URL, Data safety form,
content rating questionnaire, target audience (adults: the app is for parents, not children),
and the account-deletion URL.

## Updating the app later

Only needed when `twa-manifest.json` changes or Google raises the target SDK (each August).
Run the workflow again with a **higher `version_code`** and upload the new `.aab`.

## Notifications

`enableNotifications: true` turns on Chrome's notification delegation: web push sent by the
website shows as a normal Android notification from TinyNudge. On Android 13+ the user is asked
for notification permission the first time the site requests it.

## Troubleshooting

- **Workflow fails at "Decode upload keystore"**: the base64 secret or password is wrong.
- **Workflow fails at "Generate Android project"** asking a question: Bubblewrap wanted input.
  Check the log line before the failure; usually a missing SDK package. Add it to the
  `sdkmanager --install` line in the workflow.
- **Workflow fails at "Check the website serves the icons and manifest"** (or Bubblewrap can't
  download an icon): the website isn't deployed with `public/icons`. Run
  `firebase deploy --only hosting`, check the URLs in step 3 open, then run the workflow again.
- **Workflow fails at "Check version in the generated project"**: `twa-manifest.json` must use the
  key `appVersion` (not `appVersionName`) for the version name.
- **App shows an address bar**: assetlinks fingerprints are wrong or not deployed (step 6).
- **Play rejects the upload: "version code already used"**: run again with a higher `version_code`.
