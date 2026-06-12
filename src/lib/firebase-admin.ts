import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(JSON.parse(process.env.SERVICE_ACCOUNT_KEY!)),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
