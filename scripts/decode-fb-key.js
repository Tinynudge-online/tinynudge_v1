const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const lines = envContent.split('\n');
const line = lines.find(l => l.startsWith('SERVICE_ACCOUNT_KEY='));
if (!line) { console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found'); process.exit(1); }

const raw = line.slice('SERVICE_ACCOUNT_KEY='.length).trim();
try {
  const decoded = JSON.parse('"' + raw + '"');
  JSON.parse(decoded); // verify it is valid service account JSON
  const outPath = path.join(require('os').tmpdir(), 'fbkey_secret.json');
  fs.writeFileSync(outPath, decoded);
  console.log(outPath);
} catch (e) {
  console.error('Decode failed:', e.message);
  process.exit(1);
}
