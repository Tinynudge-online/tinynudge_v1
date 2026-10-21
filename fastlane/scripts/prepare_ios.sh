#!/usr/bin/env bash
# Customises the Capacitor-generated iOS project for TinyNudge. macOS only
# (uses PlistBuddy and sips). Idempotent: safe to run on a fresh `npx cap add ios`
# output and on an already-prepared project.
#
# Run from anywhere, after `npx cap add ios` / `npx cap sync ios` and after
# ios/App/App/GoogleService-Info.plist has been written:
#   bash fastlane/scripts/prepare_ios.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$ROOT/ios/App/App"
NATIVE_DIR="$ROOT/fastlane/native"
PLIST="$APP_DIR/Info.plist"
GSI="$APP_DIR/GoogleService-Info.plist"
PB=/usr/libexec/PlistBuddy
BUNDLE_ID="online.tinynudge.app"

fail() { echo "::error::$*" >&2; exit 1; }

[ -d "$APP_DIR" ] || fail "ios/App/App not found. Run 'npx cap add ios' first."
[ -f "$PLIST" ] || fail "ios/App/App/Info.plist not found."
[ -f "$GSI" ] || fail "ios/App/App/GoogleService-Info.plist is missing (GitHub secret GOOGLE_SERVICE_INFO_PLIST_BASE64)."

# --- GoogleService-Info.plist sanity checks ---------------------------------
GSI_BUNDLE="$($PB -c 'Print :BUNDLE_ID' "$GSI" 2>/dev/null || true)"
[ "$GSI_BUNDLE" = "$BUNDLE_ID" ] || fail "GoogleService-Info.plist is for bundle '$GSI_BUNDLE', expected '$BUNDLE_ID'. Register the iOS app in Firebase with bundle id $BUNDLE_ID and download its plist."
REVERSED_CLIENT_ID="$($PB -c 'Print :REVERSED_CLIENT_ID' "$GSI" 2>/dev/null || true)"
[ -n "$REVERSED_CLIENT_ID" ] || fail "GoogleService-Info.plist has no REVERSED_CLIENT_ID. Enable the Google provider in Firebase Authentication, then download GoogleService-Info.plist again."

# --- Native files ------------------------------------------------------------
cp "$NATIVE_DIR/AppDelegate.swift" "$APP_DIR/AppDelegate.swift"
cp "$NATIVE_DIR/App.entitlements" "$APP_DIR/App.entitlements"
cp "$NATIVE_DIR/PrivacyInfo.xcprivacy" "$APP_DIR/PrivacyInfo.xcprivacy"

# --- Info.plist --------------------------------------------------------------
pdel() { $PB -c "Delete :$1" "$PLIST" >/dev/null 2>&1 || true; }
pset() { pdel "$1"; $PB -c "Add :$1 $2 $3" "$PLIST"; }

pset CFBundleDisplayName string TinyNudge
# HTTPS only, no custom crypto: exempt from export compliance (no TestFlight prompt).
pset ITSAppUsesNonExemptEncryption bool false

# Google Sign-In callback URL scheme (REVERSED_CLIENT_ID from GoogleService-Info.plist).
pdel CFBundleURLTypes
$PB -c "Add :CFBundleURLTypes array" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0:CFBundleTypeRole string Editor" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLName string google" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $REVERSED_CLIENT_ID" "$PLIST"

# Background push delivery for FCM.
pdel UIBackgroundModes
$PB -c "Add :UIBackgroundModes array" "$PLIST"
$PB -c "Add :UIBackgroundModes:0 string remote-notification" "$PLIST"

# 64-bit devices only (the template still says armv7).
pdel UIRequiredDeviceCapabilities
$PB -c "Add :UIRequiredDeviceCapabilities array" "$PLIST"
$PB -c "Add :UIRequiredDeviceCapabilities:0 string arm64" "$PLIST"

# iPhone-only, portrait (matches the web manifest).
pdel UISupportedInterfaceOrientations
$PB -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
$PB -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"
pdel "UISupportedInterfaceOrientations~ipad"

# --- App icon + splash -------------------------------------------------------
# App Store icons must not have an alpha channel: round-trip through JPEG to drop it.
ICON_SRC="$ROOT/public/icons/icon-1024.png"
ASSETS="$APP_DIR/Assets.xcassets"
TMP="$(mktemp -d)"
if [ -f "$ICON_SRC" ]; then
  sips -s format jpeg -s formatOptions 100 "$ICON_SRC" --out "$TMP/icon.jpg" >/dev/null
  sips -s format png "$TMP/icon.jpg" --out "$ASSETS/AppIcon.appiconset/AppIcon-512@2x.png" >/dev/null

  # Splash: the icon centred on the brand background (replaces the Capacitor logo).
  sips -Z 640 "$TMP/icon.jpg" --out "$TMP/icon-640.jpg" >/dev/null
  sips -p 2732 2732 --padColor FDF2F8 "$TMP/icon-640.jpg" --out "$TMP/splash.jpg" >/dev/null
  for f in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
    sips -s format png "$TMP/splash.jpg" --out "$ASSETS/Splash.imageset/$f" >/dev/null
  done
else
  echo "::warning::$ICON_SRC not found; keeping the default Capacitor icon and splash."
fi
rm -rf "$TMP"

# --- Xcode project (resources, entitlements, device family) ------------------
(cd "$ROOT" && bundle exec ruby fastlane/scripts/configure_xcode_project.rb)

echo "iOS project prepared for $BUNDLE_ID"
