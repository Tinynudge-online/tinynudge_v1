#!/usr/bin/env bash
# Creates the TinyNudge Android UPLOAD keystore (PKCS12), prints its SHA-256 fingerprint
# and writes a base64 copy for the GitHub secret ANDROID_KEYSTORE_BASE64.
#
# Run ONCE, from Git Bash:   bash scripts/android/generate-keystore.sh
# Optional: OUT_DIR=/c/Users/you/keys bash scripts/android/generate-keystore.sh
#
# Uses keytool (from a JDK) if it is installed, otherwise openssl (ships with Git Bash).
# The keystore is written OUTSIDE the repo by default so it can never be committed.
# BACK IT UP (password manager / USB stick). Losing it means asking Google for an upload key reset.

set -euo pipefail

ALIAS="upload"
OUT_DIR="${OUT_DIR:-$HOME/tinynudge-android-keys}"
KEYSTORE="$OUT_DIR/tinynudge-upload.keystore"
B64_FILE="$OUT_DIR/tinynudge-upload.keystore.b64"
DNAME="CN=TinyNudge, O=TinyNudge, C=US"
VALID_DAYS=10000   # ~27 years; Play requires validity past 2033-10-22

if [ -e "$KEYSTORE" ]; then
  echo "A keystore already exists at: $KEYSTORE"
  echo "Refusing to overwrite it. Move it away first if you really want a new one."
  exit 1
fi

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR" 2>/dev/null || true

# Ask for a password (PKCS12 uses the same password for the store and the key).
while true; do
  read -r -s -p "Choose a keystore password (min 8 chars): " PASS; echo
  read -r -s -p "Repeat the password: " PASS2; echo
  if [ "${#PASS}" -lt 8 ]; then echo "Too short, try again."; continue; fi
  if [ "$PASS" != "$PASS2" ]; then echo "Passwords do not match, try again."; continue; fi
  break
done
export TN_KS_PASS="$PASS"

if command -v keytool >/dev/null 2>&1; then
  echo "Generating keystore with keytool..."
  keytool -genkeypair -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE" \
    -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 \
    -validity "$VALID_DAYS" \
    -dname "$DNAME" \
    -storepass:env TN_KS_PASS -keypass:env TN_KS_PASS
  FINGERPRINT="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass:env TN_KS_PASS \
    | grep -E '^\s*SHA256:' | head -n1 | sed -E 's/^\s*SHA256:\s*//')"
elif command -v openssl >/dev/null 2>&1; then
  echo "keytool not found; generating keystore with openssl..."
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT
  # Git Bash rewrites arguments starting with "/" into Windows paths; this stops that for -subj.
  MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -sha256 -nodes \
    -keyout "$TMP_DIR/key.pem" -out "$TMP_DIR/cert.pem" \
    -days "$VALID_DAYS" -subj "/CN=TinyNudge/O=TinyNudge/C=US"
  openssl pkcs12 -export \
    -inkey "$TMP_DIR/key.pem" -in "$TMP_DIR/cert.pem" \
    -name "$ALIAS" \
    -out "$KEYSTORE" \
    -passout env:TN_KS_PASS
  FINGERPRINT="$(openssl x509 -in "$TMP_DIR/cert.pem" -noout -fingerprint -sha256 | sed -E 's/^.*=//')"
else
  echo "Neither keytool nor openssl was found. Install a JDK 17 (https://adoptium.net) or use Git Bash." >&2
  exit 1
fi

# Single-line base64 for the GitHub secret.
if base64 --help 2>&1 | grep -q -- '-w'; then
  base64 -w 0 "$KEYSTORE" > "$B64_FILE"
else
  base64 "$KEYSTORE" | tr -d '\n' > "$B64_FILE"
fi

unset TN_KS_PASS PASS PASS2

cat <<EOF

Done.

Keystore:        $KEYSTORE
Key alias:       $ALIAS
Upload key SHA-256 fingerprint:
  $FINGERPRINT

Next steps:
 1. GitHub repo > Settings > Secrets and variables > Actions > New repository secret:
      ANDROID_KEYSTORE_BASE64       = the whole contents of $B64_FILE
      BUBBLEWRAP_KEYSTORE_PASSWORD  = the password you just typed
      BUBBLEWRAP_KEY_PASSWORD       = the same password
 2. Add the fingerprint above to the sha256_cert_fingerprints list in
    public/.well-known/assetlinks.json (see android/README.md, step 6).
 3. Back up $KEYSTORE and the password somewhere safe, then delete $B64_FILE.
EOF
