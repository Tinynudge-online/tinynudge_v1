/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor-firebase/authentication" />
/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from '@capacitor/cli';

// iOS app shell for TinyNudge (App Store build). The native app loads the live
// site so web deploys update the app without a resubmission; the bundled
// `ios-shell/` folder only holds a redirect fallback and the offline page.
// The iOS project itself (ios/) is generated in CI — see docs/IOS_BUILD.md.
const config: CapacitorConfig = {
  appId: 'online.tinynudge.app',
  appName: 'TinyNudge',
  webDir: 'ios-shell',
  server: {
    url: 'https://www.tinynudge.online',
    // Bundled page shown when the site can't be reached (no network, DNS, TLS…).
    errorPath: 'offline.html',
    // Hosts that stay inside the app's web view. Everything else (Lemon Squeezy,
    // privacy/terms on other domains, mailto:…) opens outside the app.
    // Google/Apple sign-in run natively, so their OAuth pages are not listed.
    allowNavigation: ['www.tinynudge.online', 'tinynudge.online'],
  },
  ios: {
    appendUserAgent: 'TinyNudgeApp/ios',
    contentInset: 'never',
    backgroundColor: '#fdf2f8',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#fdf2f8',
      showSpinner: false,
    },
    FirebaseAuthentication: {
      // Sign in natively, then hand the credential to the Firebase JS SDK in the web layer.
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  },
  experimental: {
    ios: {
      spm: {
        // Capacitor 8 creates Swift Package Manager projects by default (no CocoaPods).
        // 6.1 is required for package traits; Xcode 26 ships Swift 6.2.
        swiftToolsVersion: '6.1',
        packageTraits: {
          // Keep the Google Sign-In SDK, leave out the Facebook SDK.
          '@capacitor-firebase/authentication': ['Google'],
        },
        packageOptions: {
          // Avoids the SwiftPM package identity collision between the two
          // @capacitor-firebase packages (capawesome-team/capacitor-firebase#959).
          '@capacitor-firebase/authentication': { symlink: true },
          '@capacitor-firebase/messaging': { symlink: true },
        },
      },
    },
  },
};

export default config;
