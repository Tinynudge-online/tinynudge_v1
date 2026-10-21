# TinyNudge iOS app: build and TestFlight without a Mac

This guide explains how the iPhone app is built, and lists every one-time step and GitHub secret it needs. You don't need a Mac. The build runs on a GitHub-hosted macOS runner, and every setup step happens in a web browser on Windows.

## How it works

| Piece | Where | What it does |
|---|---|---|
| `capacitor.config.ts` | repo root | Capacitor 8 app `online.tinynudge.app`, called "TinyNudge". It loads the live site `https://www.tinynudge.online` and adds `TinyNudgeApp/ios` to the user agent. It sets up native Google and Apple sign-in (`skipNativeAuth: true`), FCM push and the splash screen. |
| `ios-shell/` | repo root | The only web files bundled inside the app: `offline.html`, shown when the site can't be reached, and a fallback `index.html` that redirects to the site. |
| `ios/` | **generated in CI** | `npx cap add ios` creates it on every build. Capacitor 8 uses **Swift Package Manager** by default, so there is no Podfile, no `pod install` and no `.xcworkspace`; fastlane builds `ios/App/App.xcodeproj`. Don't edit files in `ios/` by hand. Change `fastlane/native/` or `fastlane/scripts/` instead. |
| `fastlane/native/` | repo root | Native files copied into the generated project:<br>• `AppDelegate.swift`, with the push forwarding that `@capacitor-firebase/messaging` needs<br>• `App.entitlements`, for Push Notifications and Sign in with Apple<br>• `PrivacyInfo.xcprivacy` |
| `fastlane/scripts/prepare_ios.sh` | repo root | Sets the Info.plist keys:<br>• Google URL scheme (`REVERSED_CLIENT_ID`)<br>• background push mode<br>• `ITSAppUsesNonExemptEncryption=false`<br>• portrait only<br><br>It also builds the app icon (with alpha removed) and the splash screen from `public/icons/icon-1024.png`. It then runs `configure_xcode_project.rb`, which adds the plist files to the bundle, wires the entitlements and makes the build iPhone-only. |
| `fastlane/Fastfile` | repo root | The `beta` lane:<br>1. `setup_ci`<br>2. Log in with the App Store Connect API key<br>3. `match` (signing)<br>4. Set the build number to the latest TestFlight build + 1<br>5. `build_app`<br>6. `upload_to_testflight`<br><br>The `register_app_id` lane is optional. |
| `.github/workflows/ios-build.yml` | repo root | You start it by hand: GitHub, then **Actions**, then **iOS build (TestFlight)**, then **Run workflow**. It runs on `macos-26` with Xcode 26. Since 2026-04-28 Apple only accepts uploads built with Xcode 26 / the iOS 26 SDK. |

Plugins used: `@capacitor-firebase/authentication` and `@capacitor-firebase/messaging` 8.5.x, which support SPM. `capacitor.config.ts` sets two SPM options:
- `experimental.ios.spm.packageOptions.symlink`, which avoids the SwiftPM package identity clash between the two Firebase plugins.
- `packageTraits: ['Google']`, which links GoogleSignIn but not the Facebook SDK. This requires `swiftToolsVersion: '6.1'`, which Xcode 26 supports.

`@capgo/native-purchases`, `@capacitor/app`, `browser`, `share`, `haptics` and `splash-screen` are also added as SPM packages automatically.

> Do **not** add `cocoapods` to the `Gemfile`. If you do, the Capacitor CLI switches to CocoaPods mode.

## Costs

- Apple Developer Program: **$99/year**. It's required before any of the steps below. An individual account shows your legal name as the seller. An organization account needs a D-U-N-S number.
- GitHub Actions: in a **private** repo, macOS minutes count 10× toward your monthly minutes. One build takes about 15–30 minutes. Public repos are free.

---

## One-time setup

Do these steps in order. Steps 1 and 2 must be finished before the first build. The provisioning profile includes only the capabilities that are enabled on the App ID at the moment it is created.

### 1. Register the App ID with its capabilities

developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers** → **+** → **App IDs** → **App**:

- Description: `TinyNudge`
- Bundle ID: **Explicit**, `online.tinynudge.app`
- Capabilities: tick **Push Notifications** and **Sign in with Apple**, with Sign in with Apple set to "Enable as a primary App ID". **In-App Purchase** is always on.
- **Continue**, then **Register**.

(Alternative: after step 3, run the workflow with **lane = register_app_id**. It does the same thing through the API. If it can't enable a capability, its log says so, and you tick that box by hand.)

### 2. Create the app in App Store Connect

appstoreconnect.apple.com → **Apps** → **+** → **New App**:
- Platform **iOS**, Name **TinyNudge** (it must be unique on the App Store), Primary language English (U.S.)
- Bundle ID **online.tinynudge.app**, SKU `tinynudge-ios`, User access **Full access**

Apple's API can't create this app record, so this step has to be done by hand. TestFlight uploads fail until the record exists.

### 3. App Store Connect API key (used for signing and upload)

App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**:
- Name `GitHub CI`, Access **Admin**. fastlane match needs Admin so it can create the signing certificate and profile.
- Download the `.p8` file. **You can only download it once.** Keep it in a password manager.
- Write down the **Key ID** (shown in the table) and the **Issuer ID** (shown above the table).

### 4. Private repository for signing certificates (fastlane match)

1. On GitHub, create a new **private**, empty repository, for example `tinynudge-ios-certificates`. Don't add a README.
2. Create a fine-grained personal access token at github.com → Settings → Developer settings → Fine-grained tokens:
   - Repository access: only `tinynudge-ios-certificates`
   - Permission: **Contents: Read and write**
3. Encode `your-github-username:THE_TOKEN` in base64 (Windows PowerShell):
   ```powershell
   [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("your-github-username:THE_TOKEN")) | Set-Clipboard
   ```
   The clipboard now holds the value for `MATCH_GIT_BASIC_AUTHORIZATION`.
4. Choose a long passphrase for `MATCH_PASSWORD` and store it in a password manager. Every certificate in that repo is encrypted with it.

On the first run, match uses the API key to create the **Apple Distribution certificate** and the **App Store provisioning profile**, then saves them encrypted in this repo. Later runs reuse them.

### 5. Team ID

developer.apple.com → **Account** → **Membership details** → **Team ID** (10 characters). This is `APPLE_TEAM_ID`.

### 6. Firebase: iOS app and GoogleService-Info.plist

Firebase console → project **tinynudge-38b25**:
1. **Authentication → Sign-in method**: make sure **Google** is enabled, then enable **Apple**. For native iOS sign-in, Apple needs no Services ID.
2. **Project settings → General → Your apps → Add app → iOS**:
   - Bundle ID `online.tinynudge.app`, nickname `TinyNudge iOS`
   - Fill in the App Store ID (from step 2: App Information → Apple ID) and the Team ID.
3. Download **GoogleService-Info.plist**. Do this *after* Google sign-in is enabled. The file must contain `REVERSED_CLIENT_ID`, and the build stops with a clear error if it doesn't.
4. Encode it in base64:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Downloads\GoogleService-Info.plist")) | Set-Clipboard
   ```
   The clipboard now holds the value for `GOOGLE_SERVICE_INFO_PLIST_BASE64`.

### 7. Push notifications (APNs key → Firebase)

1. developer.apple.com → **Keys** → **+** → name `TinyNudge APNs` → tick **Apple Push Notifications service (APNs)** → Continue → Register → download the `.p8`. Write down its **Key ID**.
2. Firebase console → **Project settings → Cloud Messaging → Apple app configuration** (TinyNudge iOS) → **APNs Authentication Key → Upload**: upload the `.p8`, then enter the Key ID and Team ID.

### 8. Sign in with Apple token revocation (needed for in-app account deletion)

1. developer.apple.com → **Keys** → **+** → name `TinyNudge Sign in with Apple` → tick **Sign in with Apple** → Configure → primary App ID `online.tinynudge.app` → download the `.p8`.
2. Firebase → Authentication → Sign-in method → **Apple** → **OAuth code flow configuration**: enter the Apple Team ID, Key ID and private key. Firebase uses these to revoke Apple tokens when an account is deleted.

### 9. In-App Purchase (Premium subscription)

App Store Connect:
1. **Business → Agreements**: accept the **Paid Apps** agreement and complete the tax and banking details. Purchases don't work, not even in TestFlight, until it's active. Also join the **App Store Small Business Program**, which lowers Apple's cut to 15%.
2. App → **Monetization → Subscriptions** → create a subscription group `TinyNudge Premium` → **+** subscription:
   - Product ID **`online.tinynudge.premium.monthly`** (must match exactly), duration 1 month, price **$2.99**
   - **Introductory offer**: Free, **1 week**
   - Add a display name, a description and a review screenshot.
3. App → **App Information → App Store Server Notifications**: set both **Production** and **Sandbox** to **Version 2**, URL `https://www.tinynudge.online/api/apple/notifications`.

### 10. Add the GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `ASC_KEY_ID` | API key ID (step 3) |
| `ASC_ISSUER_ID` | Issuer ID (step 3) |
| `ASC_KEY_P8` | Full text of the `.p8` from step 3, including the `-----BEGIN PRIVATE KEY-----` lines. A base64 encoding of it also works. |
| `APPLE_TEAM_ID` | Team ID (step 5) |
| `MATCH_GIT_URL` | `https://github.com/<you>/tinynudge-ios-certificates.git` (step 4) |
| `MATCH_GIT_BASIC_AUTHORIZATION` | base64 of `username:token` (step 4) |
| `MATCH_PASSWORD` | Your match passphrase (step 4) |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64` | base64 of GoogleService-Info.plist (step 6) |

The APNs key (step 7) and the Sign in with Apple key (step 8) go into Firebase, **not** GitHub.

---

## Running a build

1. GitHub → **Actions** → **iOS build (TestFlight)** → **Run workflow**.
2. Inputs:
   - **lane**: `beta`
   - **marketing_version**: e.g. `1.0.0`. Increase it for each App Store release (`1.0.1`, `1.1.0`…).
   - **match_readonly**: leave **off** for the first run, so match can create the certificate and profile. Turn it **on** after the first successful build. That way a misconfiguration can never create extra certificates, and Apple allows only a few distribution certificates.
3. When it finishes, the build appears under **TestFlight** in App Store Connect after about 5–30 minutes of processing. The `.ipa` and dSYMs are also attached to the workflow run as an artifact.
4. TestFlight → **Internal Testing** → add yourself as a tester, then install the **TestFlight** app on your iPhone. You don't need to answer an export-compliance question: `ITSAppUsesNonExemptEncryption=false` is already set.

The build number is set automatically to the latest TestFlight build + 1.

## What is automated and what isn't

| Task | Automated? |
|---|---|
| Generate the Xcode project (`cap add ios`, `cap sync`) | Yes, in CI |
| AppDelegate push forwarding, Info.plist keys, entitlements file, privacy manifest, icon, splash | Yes, `prepare_ios.sh` |
| Signing certificate and App Store profile | Yes, fastlane match through the API key |
| Build number, archive, export, TestFlight upload | Yes, fastlane `beta` |
| Register the App ID and enable Push / Sign in with Apple | Optional `register_app_id` lane; otherwise by hand (step 1) |
| Create the App Store Connect app record | **No.** Apple has no API for it (step 2). |
| API keys, APNs key, Sign in with Apple key | **No.** Created in the Apple web portal (steps 3, 7, 8). |
| Firebase iOS app, APNs upload, Apple provider | **No.** Firebase console (steps 6–8). |
| Paid Apps agreement, subscription product, Server Notifications URL | **No.** App Store Connect (step 9). |
| App Store listing: screenshots, description, privacy labels, age rating, review notes, submit for review | **No.** App Store Connect. |

## Troubleshooting

- **"Provisioning profile … doesn't include the aps-environment / com.apple.developer.applesignin entitlement"**: a capability was enabled after match created the profile. Enable it on the App ID (step 1), delete the `online.tinynudge.app AppStore` profile under developer.apple.com → Profiles, then run the workflow with **match_readonly off**. match recreates the profile.
- **"Could not create another Distribution certificate, reached the maximum number"**: revoke an unused Apple Distribution certificate in the portal, then re-run with match_readonly off.
- **GoogleService-Info.plist errors in "Prepare iOS project"**: the file is for the wrong bundle ID, or it was downloaded before Google sign-in was enabled. Download it again (step 6) and update the secret.
- **"No suitable application records were found"** during upload: the App Store Connect app record (step 2) is missing, or its bundle ID is wrong.
- **Swift package resolution fails or times out**: run the workflow again. Packages are cached in `build/ios/SourcePackages` after the first successful run.
- **macos-26 runner unavailable**: change `runs-on` to `macos-15` only if that image offers Xcode 26 (check github.com/actions/runner-images). Apple rejects uploads built with older Xcode.

## Before submitting for App Review

- **Guideline 4.2 (web wrappers)**: the app must feel native. That means native push, native Google and Apple sign-in, the share sheet and the offline screen. Mention these in the review notes.
- **4.8**: Sign in with Apple must be offered next to Google sign-in.
- **5.1.1(v)**: account deletion must be available in the app.
- Provide a demo account (email and password) in **App Review Information**.
- Fill in **App Privacy** so it matches `fastlane/native/PrivacyInfo.xcprivacy`: email, name, user ID, device ID (push token), purchase history and other user content, all linked to the user, used for app functionality, and none used for tracking.
- The web view extends under the status bar and home indicator (`contentInset: 'never'`). The site needs `viewport-fit=cover` and `env(safe-area-inset-*)` padding, or the top of the page will sit under the notch.
